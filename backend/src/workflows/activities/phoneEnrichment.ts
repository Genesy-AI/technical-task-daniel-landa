import { Context } from '@temporalio/activity'
import { ApplicationFailure } from '@temporalio/common'
import { prisma } from '../../db'
import { PhoneEnrichmentStatus, PhoneLookupInput, PhoneProviderId } from '../../phoneEnrichment/config'
import { PHONE_PROVIDER_ADAPTERS } from '../../phoneEnrichment/providers'
import { isValidPhoneNumber } from '../../utils/leadFields'

const toProviderFailure = (providerId: PhoneProviderId, response: Response): Error => {
  const message = `${providerId} responded with HTTP ${response.status}`

  if (response.status === 429) {
    const retryAfterSeconds = Number(response.headers.get('retry-after'))
    return ApplicationFailure.create({
      message,
      type: 'ProviderRateLimited',
      nextRetryDelay: retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : undefined,
    })
  }

  // Other 4xx (bad credentials, missing input) will fail the same way on every attempt.
  if (response.status >= 400 && response.status < 500) {
    return ApplicationFailure.nonRetryable(message, 'ProviderRequestRejected')
  }

  return new Error(message)
}

export async function lookupPhone(
  providerId: PhoneProviderId,
  input: PhoneLookupInput
): Promise<string | null> {
  const { log, cancellationSignal } = Context.current()
  const provider = PHONE_PROVIDER_ADAPTERS[providerId]
  const request = provider.buildRequest(input)

  if (!request) {
    log.info('Skipping phone provider: lead is missing required input', { providerId })
    return null
  }

  const response = await fetch(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...request.headers },
    body: JSON.stringify(request.body),
    signal: cancellationSignal,
  })

  if (!response.ok) {
    throw toProviderFailure(providerId, response)
  }

  const phone = provider.parsePhone(await response.json())
  if (phone && !isValidPhoneNumber(phone)) {
    log.warn('Discarding invalid phone returned by provider', { providerId, phone })
    return null
  }
  return phone
}

export interface PhoneEnrichmentUpdate {
  leadId: number
  status: PhoneEnrichmentStatus
  provider: PhoneProviderId | null
  phoneNumber?: string
}

export async function updatePhoneEnrichment({
  leadId,
  status,
  provider,
  phoneNumber,
}: PhoneEnrichmentUpdate): Promise<void> {
  // updateMany instead of update: a lead deleted mid-enrichment must not make this activity retry.
  await prisma.lead.updateMany({
    where: { id: leadId },
    data: {
      phoneEnrichmentStatus: status,
      phoneEnrichmentProvider: provider,
      ...(phoneNumber && { phoneNumber }),
    },
  })
}
