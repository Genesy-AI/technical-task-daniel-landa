import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApplicationFailure } from '@temporalio/common'
import { MockActivityEnvironment } from '@temporalio/testing'
import { prisma } from '../../db'
import { PhoneLookupInput, PhoneProviderId } from '../../phoneEnrichment/config'
import { lookupPhone, updatePhoneEnrichment } from './phoneEnrichment'

vi.mock('../../db', () => ({ prisma: { lead: { updateMany: vi.fn() } } }))

const input: PhoneLookupInput = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  jobTitle: 'CTO',
  companyWebsite: 'example.com',
}

const fetchMock = vi.fn<typeof fetch>()

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' }, ...init })

describe('lookupPhone', () => {
  const env = new MockActivityEnvironment()
  const runLookup = (providerId: PhoneProviderId, lookupInput: PhoneLookupInput = input) =>
    env.run(lookupPhone, providerId, lookupInput)

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the provider request and returns the phone found', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ phone: '7272761008' }))

    await expect(runLookup('orionConnect')).resolves.toBe('7272761008')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.enginy.ai/api/tmp/orionConnect')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json', 'x-auth-me': 'mySecretKey123' })
    expect(JSON.parse(String(init?.body))).toEqual({
      fullName: 'Ada Lovelace',
      companyWebsite: 'example.com',
    })
  })

  it('returns null when the provider has no data', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ phoneNmbr: null }))

    await expect(runLookup('astraDialer')).resolves.toBeNull()
  })

  it('skips the provider without calling it when the lead lacks a required input', async () => {
    await expect(runLookup('nimbusLookup', { ...input, jobTitle: null })).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('discards phones that are not valid phone numbers', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ phone: 'call me maybe' }))

    await expect(runLookup('orionConnect')).resolves.toBeNull()
  })

  it('throws a retryable error when the provider fails with a server error', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Internal server error' }, { status: 500 }))

    const error = await runLookup('orionConnect').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(ApplicationFailure)
    expect((error as Error).message).toBe('orionConnect responded with HTTP 500')
  })

  it('throws a non-retryable failure when the provider rejects the request', async () => {
    fetchMock.mockResolvedValue(new Response('Unauthorized', { status: 401 }))

    const error = await runLookup('astraDialer').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApplicationFailure)
    expect((error as ApplicationFailure).nonRetryable).toBe(true)
    expect((error as ApplicationFailure).type).toBe('ProviderRequestRejected')
  })

  it('retries after the delay the provider asks for when rate limited', async () => {
    fetchMock.mockResolvedValue(
      new Response('Too many requests', { status: 429, headers: { 'Retry-After': '30' } })
    )

    const error = await runLookup('astraDialer').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApplicationFailure)
    expect((error as ApplicationFailure).nonRetryable).toBe(false)
    expect((error as ApplicationFailure).type).toBe('ProviderRateLimited')
    expect((error as ApplicationFailure).nextRetryDelay).toBe(30_000)
  })

  it('falls back to the retry policy backoff when rate limited without a Retry-After header', async () => {
    fetchMock.mockResolvedValue(new Response('Too many requests', { status: 429 }))

    const error = await runLookup('astraDialer').catch((e: unknown) => e)

    expect((error as ApplicationFailure).nextRetryDelay).toBeUndefined()
  })
})

describe('updatePhoneEnrichment', () => {
  beforeEach(() => {
    vi.mocked(prisma.lead.updateMany).mockReset()
  })

  it('stores the progress without touching the phone number', async () => {
    await updatePhoneEnrichment({ leadId: 7, status: 'IN_PROGRESS', provider: 'astraDialer' })

    expect(prisma.lead.updateMany).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { phoneEnrichmentStatus: 'IN_PROGRESS', phoneEnrichmentProvider: 'astraDialer' },
    })
  })

  it('stores the phone number found', async () => {
    await updatePhoneEnrichment({
      leadId: 7,
      status: 'FOUND',
      provider: 'orionConnect',
      phoneNumber: '7272761008',
    })

    expect(prisma.lead.updateMany).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        phoneEnrichmentStatus: 'FOUND',
        phoneEnrichmentProvider: 'orionConnect',
        phoneNumber: '7272761008',
      },
    })
  })
})
