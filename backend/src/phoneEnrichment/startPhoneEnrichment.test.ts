import { describe, it, expect, vi } from 'vitest'
import { WorkflowExecutionAlreadyStartedError } from '@temporalio/client'
import { enrichPhoneWorkflow } from '../workflows'
import { startPhoneEnrichment, toPhoneLookupInput } from './startPhoneEnrichment'

const lead = {
  id: 42,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: ' Ada@Example.com ',
  jobTitle: ' CTO ',
  phoneNumber: null,
  phoneEnrichmentStatus: null,
}

const workflowClient = (start = vi.fn().mockResolvedValue(undefined)) => ({ start })

describe('toPhoneLookupInput', () => {
  it('maps the lead to the provider-agnostic lookup input', () => {
    expect(toPhoneLookupInput(lead)).toEqual({
      fullName: 'Ada Lovelace',
      email: 'Ada@Example.com',
      jobTitle: 'CTO',
      companyWebsite: 'example.com',
    })
  })

  it('leaves missing job title and website empty', () => {
    expect(toPhoneLookupInput({ ...lead, email: 'not-an-email', jobTitle: '  ' })).toMatchObject({
      jobTitle: null,
      companyWebsite: null,
    })
  })
})

describe('startPhoneEnrichment', () => {
  it('starts a single enrichment workflow per lead', async () => {
    const client = workflowClient()

    await expect(startPhoneEnrichment(client, lead)).resolves.toEqual({ started: true })

    expect(client.start).toHaveBeenCalledWith(enrichPhoneWorkflow, {
      taskQueue: 'myQueue',
      workflowId: 'enrich-phone-42',
      workflowIdConflictPolicy: 'USE_EXISTING',
      workflowIdReusePolicy: 'ALLOW_DUPLICATE_FAILED_ONLY',
      args: [{ leadId: 42, lookup: toPhoneLookupInput(lead) }],
    })
  })

  it('retries leads whose previous enrichment failed', async () => {
    const client = workflowClient()
    const failedLead = { ...lead, phoneEnrichmentStatus: 'FAILED' }

    await expect(startPhoneEnrichment(client, failedLead)).resolves.toEqual({ started: true })
  })

  it('skips leads that already have a phone number', async () => {
    const client = workflowClient()

    await expect(startPhoneEnrichment(client, { ...lead, phoneNumber: '+34 600000000' })).resolves.toEqual({
      started: false,
      reason: 'Lead already has a phone number',
    })
    expect(client.start).not.toHaveBeenCalled()
  })

  it('skips leads for which no phone data was found before', async () => {
    const client = workflowClient()

    await expect(
      startPhoneEnrichment(client, { ...lead, phoneEnrichmentStatus: 'NOT_FOUND' })
    ).resolves.toEqual({ started: false, reason: 'No phone data was found for this lead' })
    expect(client.start).not.toHaveBeenCalled()
  })

  it('reports a lead as skipped when Temporal rejects a duplicate enrichment', async () => {
    const client = workflowClient(
      vi
        .fn()
        .mockRejectedValue(
          new WorkflowExecutionAlreadyStartedError(
            'already started',
            'enrich-phone-42',
            'enrichPhoneWorkflow'
          )
        )
    )

    await expect(startPhoneEnrichment(client, lead)).resolves.toEqual({
      started: false,
      reason: 'Phone enrichment already completed for this lead',
    })
  })

  it('propagates unexpected errors', async () => {
    const client = workflowClient(vi.fn().mockRejectedValue(new Error('Temporal is down')))

    await expect(startPhoneEnrichment(client, lead)).rejects.toThrow('Temporal is down')
  })
})
