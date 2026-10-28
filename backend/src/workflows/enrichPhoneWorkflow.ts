import { ActivityFailure, ApplicationFailure, log, proxyActivities, RetryPolicy } from '@temporalio/workflow'
import type * as activities from './activities'
import {
  PHONE_PROVIDERS,
  PhoneEnrichmentInput,
  PhoneProviderId,
  PhoneProviderSettings,
} from '../phoneEnrichment/config'

// Writes to our own DB: failures are transient (e.g. a locked SQLite file) and retrying is safe and free,
// so retry harder than providers, but stay bounded (~15s) since Temporal would otherwise retry forever.
const STATUS_UPDATE_RETRY_POLICY: RetryPolicy = {
  maximumAttempts: 5,
  initialInterval: '1 second',
  backoffCoefficient: 2,
}

// Calls to third-party providers: each retry costs rate-limit budget and user wait time, and on
// exhaustion the workflow falls back to the next provider, so give up early.
const PROVIDER_RETRY_POLICY: RetryPolicy = {
  maximumAttempts: 3,
  initialInterval: '1 second',
  backoffCoefficient: 2,
}

const { updatePhoneEnrichment } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 seconds',
  retry: STATUS_UPDATE_RETRY_POLICY,
})

const lookupPhoneWith = (provider: PhoneProviderSettings) =>
  proxyActivities<typeof activities>({
    taskQueue: provider.taskQueue,
    startToCloseTimeout: provider.timeoutMs,
    retry: PROVIDER_RETRY_POLICY,
  }).lookupPhone

export type PhoneEnrichmentResult =
  | { status: 'FOUND'; phoneNumber: string; provider: PhoneProviderId }
  | { status: 'NOT_FOUND' }

export async function enrichPhoneWorkflow({
  leadId,
  lookup,
}: PhoneEnrichmentInput): Promise<PhoneEnrichmentResult> {
  const failedProviders: PhoneProviderId[] = []

  for (const provider of PHONE_PROVIDERS) {
    await updatePhoneEnrichment({ leadId, status: 'IN_PROGRESS', provider: provider.id })

    try {
      const phoneNumber = await lookupPhoneWith(provider)(provider.id, lookup)
      if (phoneNumber) {
        await updatePhoneEnrichment({ leadId, status: 'FOUND', provider: provider.id, phoneNumber })
        return { status: 'FOUND', phoneNumber, provider: provider.id }
      }
    } catch (error) {
      if (!(error instanceof ActivityFailure)) throw error
      // A provider that is down must not prevent asking the next one.
      log.warn('Phone provider failed after all retries', { leadId, providerId: provider.id })
      failedProviders.push(provider.id)
    }
  }

  if (failedProviders.length > 0) {
    await updatePhoneEnrichment({ leadId, status: 'FAILED', provider: null })
    // Failing the workflow, instead of reporting "no data", allows enriching this lead again later.
    throw ApplicationFailure.nonRetryable(
      `No phone found and some providers failed: ${failedProviders.join(', ')}`,
      'PhoneProvidersFailed'
    )
  }

  await updatePhoneEnrichment({ leadId, status: 'NOT_FOUND', provider: null })
  return { status: 'NOT_FOUND' }
}
