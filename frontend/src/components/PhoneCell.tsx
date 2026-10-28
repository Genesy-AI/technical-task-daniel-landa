import { FC } from 'react'
import { IconAlertTriangle, IconLoader2, IconPhoneOff } from '@tabler/icons-react'
import { LeadsGetManyOutput } from '../api/types/leads/getMany'
import { PHONE_PROVIDER_LABELS } from '../utils/phoneEnrichment'

interface PhoneCellProps {
  lead: LeadsGetManyOutput[number]
}

const badgeClassName = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium'

export const PhoneCell: FC<PhoneCellProps> = ({ lead }) => {
  const providerLabel = lead.phoneEnrichmentProvider && PHONE_PROVIDER_LABELS[lead.phoneEnrichmentProvider]

  if (lead.phoneNumber) {
    return (
      <div className="text-sm text-gray-900">
        <a
          href={`tel:${lead.phoneNumber}`}
          className="hover:text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          {lead.phoneNumber}
        </a>
        {lead.phoneEnrichmentStatus === 'FOUND' && providerLabel && (
          <div className="text-xs text-gray-500">via {providerLabel}</div>
        )}
      </div>
    )
  }

  switch (lead.phoneEnrichmentStatus) {
    case 'IN_PROGRESS':
      return (
        <span role="status" className={`${badgeClassName} bg-blue-50 text-blue-700`}>
          <IconLoader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          {providerLabel ? `Checking ${providerLabel}…` : 'Searching…'}
        </span>
      )
    case 'NOT_FOUND':
      return (
        <span className={`${badgeClassName} bg-gray-100 text-gray-600`}>
          <IconPhoneOff className="h-3.5 w-3.5" aria-hidden="true" />
          No data found
        </span>
      )
    case 'FAILED':
      return (
        <span
          className={`${badgeClassName} bg-red-50 text-red-700`}
          title="Some providers could not be reached. Run Find Phone again to retry."
        >
          <IconAlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          Lookup failed
        </span>
      )
    default:
      return <div className="text-sm text-gray-900">-</div>
  }
}
