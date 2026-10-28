import { PhoneProviderId } from '../api/types/leads/enrichPhones'
import { LeadsGetManyOutput } from '../api/types/leads/getMany'

type Lead = LeadsGetManyOutput[number]

export const PHONE_PROVIDER_LABELS: Record<PhoneProviderId, string> = {
  orionConnect: 'Orion Connect',
  astraDialer: 'Astra Dialer',
  nimbusLookup: 'Nimbus Lookup',
}

export const isEnrichingPhone = (lead: Lead): boolean => lead.phoneEnrichmentStatus === 'IN_PROGRESS'

export interface PhoneEnrichmentSummary {
  inProgress: number
  found: number
  notFound: number
  failed: number
}

export const summarizePhoneEnrichment = (leads: Lead[]): PhoneEnrichmentSummary => ({
  inProgress: leads.filter(isEnrichingPhone).length,
  found: leads.filter((lead) => lead.phoneEnrichmentStatus === 'FOUND').length,
  notFound: leads.filter((lead) => lead.phoneEnrichmentStatus === 'NOT_FOUND').length,
  failed: leads.filter((lead) => lead.phoneEnrichmentStatus === 'FAILED').length,
})

const pluralize = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`

export const formatPhoneEnrichmentSummary = ({ found, notFound }: PhoneEnrichmentSummary): string =>
  [
    found > 0 ? `Found ${pluralize(found, 'phone number', 'phone numbers')}` : 'No phone numbers found',
    notFound > 0 ? `${pluralize(notFound, 'lead', 'leads')} with no data` : null,
  ]
    .filter(Boolean)
    .join(' · ')
