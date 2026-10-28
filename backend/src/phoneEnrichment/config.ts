// Shared by the workflow sandbox and the activities: must stay free of Node/IO imports.

export type PhoneProviderId = 'orionConnect' | 'astraDialer' | 'nimbusLookup'

export type PhoneEnrichmentStatus = 'IN_PROGRESS' | 'FOUND' | 'NOT_FOUND' | 'FAILED'

/** Provider-agnostic lead data; each provider adapter picks the fields its API needs. */
export interface PhoneLookupInput {
  fullName: string
  email: string
  jobTitle: string | null
  companyWebsite: string | null
}

export interface PhoneEnrichmentInput {
  leadId: number
  lookup: PhoneLookupInput
}

export interface PhoneProviderSettings {
  id: PhoneProviderId
  /** Each provider gets its own task queue so its rate limit can be enforced independently. */
  taskQueue: string
  /** Per-attempt timeout, sized just above the provider's typical latency. */
  timeoutMs: number
  /**
   * Max requests per second the provider allows, enforced by the Temporal server across all
   * workers of the provider's task queue. Undefined means unlimited.
   */
  maxRequestsPerSecond?: number
}

/** Queried in this order until one of them returns a phone. */
export const PHONE_PROVIDERS: readonly PhoneProviderSettings[] = [
  { id: 'orionConnect', taskQueue: 'phone-provider-orion-connect', timeoutMs: 10_000 },
  { id: 'astraDialer', taskQueue: 'phone-provider-astra-dialer', timeoutMs: 5_000 },
  { id: 'nimbusLookup', taskQueue: 'phone-provider-nimbus-lookup', timeoutMs: 5_000 },
]

export const enrichPhoneWorkflowId = (leadId: number): string => `enrich-phone-${leadId}`
