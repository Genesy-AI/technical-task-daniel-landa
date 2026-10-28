export type PhoneEnrichmentStatus = 'IN_PROGRESS' | 'FOUND' | 'NOT_FOUND' | 'FAILED'

export type PhoneProviderId = 'orionConnect' | 'astraDialer' | 'nimbusLookup'

export type LeadsEnrichPhonesInput = {
  leadIds: number[]
}

export type LeadsEnrichPhonesOutput = {
  success: boolean
  startedLeadIds: number[]
  skipped: Array<{
    leadId: number
    leadName: string
    reason: string
  }>
  errors: Array<{
    leadId: number
    leadName: string
    error: string
  }>
}
