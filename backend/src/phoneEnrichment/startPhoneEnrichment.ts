import type { lead } from '@prisma/client'
import { WorkflowClient, WorkflowExecutionAlreadyStartedError } from '@temporalio/client'
import { enrichPhoneWorkflow } from '../workflows'
import { enrichPhoneWorkflowId, PhoneLookupInput } from './config'

type LeadToEnrich = Pick<
  lead,
  'id' | 'firstName' | 'lastName' | 'email' | 'jobTitle' | 'phoneNumber' | 'phoneEnrichmentStatus'
>

export type PhoneEnrichmentStart = { started: true } | { started: false; reason: string }

export const toPhoneLookupInput = (lead: LeadToEnrich): PhoneLookupInput => ({
  fullName: `${lead.firstName} ${lead.lastName}`.trim(),
  email: lead.email.trim(),
  jobTitle: lead.jobTitle?.trim() || null,
  // Leads have no website field: the work email domain is the best proxy for the company website.
  companyWebsite: lead.email.split('@')[1]?.trim().toLowerCase() || null,
})

export async function startPhoneEnrichment(
  workflowClient: Pick<WorkflowClient, 'start'>,
  lead: LeadToEnrich
): Promise<PhoneEnrichmentStart> {
  if (lead.phoneNumber) {
    return { started: false, reason: 'Lead already has a phone number' }
  }

  // Temporal forgets closed workflows after the namespace retention period, so the stored
  // status is what durably prevents querying the providers again for the same lead.
  if (lead.phoneEnrichmentStatus === 'NOT_FOUND') {
    return { started: false, reason: 'No phone data was found for this lead' }
  }

  try {
    await workflowClient.start(enrichPhoneWorkflow, {
      taskQueue: 'myQueue',
      workflowId: enrichPhoneWorkflowId(lead.id),
      // One enrichment per lead: attach to it while running, only start again if it failed.
      workflowIdConflictPolicy: 'USE_EXISTING',
      workflowIdReusePolicy: 'ALLOW_DUPLICATE_FAILED_ONLY',
      args: [{ leadId: lead.id, lookup: toPhoneLookupInput(lead) }],
    })
    return { started: true }
  } catch (error) {
    if (error instanceof WorkflowExecutionAlreadyStartedError) {
      return { started: false, reason: 'Phone enrichment already completed for this lead' }
    }
    throw error
  }
}
