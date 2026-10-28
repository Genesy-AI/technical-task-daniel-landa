import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { LeadsGetManyOutput } from '../api/types/leads/getMany'
import {
  formatPhoneEnrichmentSummary,
  isEnrichingPhone,
  summarizePhoneEnrichment,
} from '../utils/phoneEnrichment'

const LEADS_QUERY_KEY = ['leads', 'getMany']

const leadsCount = (count: number) => `${count} ${count === 1 ? 'lead' : 'leads'}`

export interface PhoneEnrichmentProgress {
  done: number
  total: number
}

export const usePhoneEnrichment = (leads: LeadsGetManyOutput | undefined) => {
  const queryClient = useQueryClient()
  const [trackedLeadIds, setTrackedLeadIds] = useState<number[]>([])
  const trackedLeads = useMemo(
    () => leads?.filter((lead) => trackedLeadIds.includes(lead.id)) ?? [],
    [leads, trackedLeadIds]
  )

  const mutation = useMutation({
    mutationFn: async (leadIds: number[]) => api.leads.enrichPhones({ leadIds }),
    onSuccess: ({ startedLeadIds, skipped, errors }) => {
      if (startedLeadIds.length > 0) {
        // Show progress right away; polling then picks up the status reported by the workflow.
        queryClient.setQueryData<LeadsGetManyOutput>(LEADS_QUERY_KEY, (current) =>
          current?.map((lead) =>
            startedLeadIds.includes(lead.id) && !isEnrichingPhone(lead)
              ? { ...lead, phoneEnrichmentStatus: 'IN_PROGRESS', phoneEnrichmentProvider: null }
              : lead
          )
        )
        setTrackedLeadIds((previous) => [...new Set([...previous, ...startedLeadIds])])
        toast.success(`Searching phone numbers for ${leadsCount(startedLeadIds.length)}`)
      }

      if (skipped.length === 1) {
        toast(`Skipped ${skipped[0].leadName}: ${skipped[0].reason}`)
      } else if (skipped.length > 1) {
        toast(`Skipped ${leadsCount(skipped.length)} that already have a phone or were already searched`)
      }

      if (errors.length > 0) {
        toast.error(`Could not start the phone search for ${leadsCount(errors.length)}. Please try again.`)
      }
    },
    onError: () => {
      toast.error('Failed to start the phone search. Please try again.')
    },
  })

  const isTrackingFinished = trackedLeadIds.length > 0 && !trackedLeads.some(isEnrichingPhone)

  useEffect(() => {
    if (!isTrackingFinished) return

    // Tracked leads may all have been deleted meanwhile: nothing to report then.
    if (trackedLeads.length > 0) {
      const summary = summarizePhoneEnrichment(trackedLeads)
      toast.success(formatPhoneEnrichmentSummary(summary))
      if (summary.failed > 0) {
        toast.error(`Phone lookup failed for ${leadsCount(summary.failed)}. Run Find Phone again to retry.`)
      }
    }
    setTrackedLeadIds([])
  }, [isTrackingFinished, trackedLeads])

  const progress: PhoneEnrichmentProgress | null =
    trackedLeads.length > 0
      ? { done: trackedLeads.filter((lead) => !isEnrichingPhone(lead)).length, total: trackedLeads.length }
      : null

  return { enrichPhones: mutation.mutate, isStarting: mutation.isPending, progress }
}
