import path from 'path'
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { WorkflowFailedError } from '@temporalio/client'
import { ApplicationFailure } from '@temporalio/common'
import { TestWorkflowEnvironment } from '@temporalio/testing'
import { bundleWorkflowCode, Worker, WorkflowBundleWithSourceMap } from '@temporalio/worker'
import { PHONE_PROVIDERS, PhoneLookupInput, PhoneProviderId } from '../phoneEnrichment/config'
import { startPhoneEnrichment } from '../phoneEnrichment/startPhoneEnrichment'
import { PhoneEnrichmentUpdate } from './activities'
import { enrichPhoneWorkflow } from './enrichPhoneWorkflow'

// Must match the queue startPhoneEnrichment schedules workflows on.
const taskQueue = 'myQueue'

const lookup: PhoneLookupInput = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  jobTitle: 'CTO',
  companyWebsite: 'example.com',
}

const lead = {
  id: 1,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  jobTitle: 'CTO',
  phoneNumber: null,
  phoneEnrichmentStatus: null,
}

type ProviderBehaviour = Partial<Record<PhoneProviderId, () => Promise<string | null>>>

const createActivities = (behaviour: ProviderBehaviour) => ({
  lookupPhone: vi.fn(async (providerId: PhoneProviderId) => (behaviour[providerId] ?? (async () => null))()),
  updatePhoneEnrichment: vi.fn(async (_update: PhoneEnrichmentUpdate) => undefined),
})

describe('enrichPhoneWorkflow', () => {
  let testEnv: TestWorkflowEnvironment
  let workflowBundle: WorkflowBundleWithSourceMap
  let nextLeadId = 1

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createTimeSkipping()
    workflowBundle = await bundleWorkflowCode({ workflowsPath: path.resolve(__dirname, 'index.ts') })
  }, 120_000)

  afterAll(async () => {
    await testEnv?.teardown()
  })

  const runWithWorkers = async <T>(activities: ReturnType<typeof createActivities>, fn: () => Promise<T>) => {
    const workers = await Promise.all([
      Worker.create({ connection: testEnv.nativeConnection, taskQueue, workflowBundle, activities }),
      ...PHONE_PROVIDERS.map((provider) =>
        Worker.create({ connection: testEnv.nativeConnection, taskQueue: provider.taskQueue, activities })
      ),
    ])
    return workers.reduce<() => Promise<T>>((run, worker) => () => worker.runUntil(run), fn)()
  }

  const runWorkflow = (activities: ReturnType<typeof createActivities>) =>
    runWithWorkers(activities, () =>
      testEnv.client.workflow.execute(enrichPhoneWorkflow, {
        taskQueue,
        workflowId: `enrich-phone-test-${nextLeadId}`,
        args: [{ leadId: nextLeadId++, lookup }],
      })
    )

  const queriedProviders = (activities: ReturnType<typeof createActivities>) =>
    activities.lookupPhone.mock.calls.map(([providerId]) => providerId)

  const storedStatuses = (activities: ReturnType<typeof createActivities>) =>
    activities.updatePhoneEnrichment.mock.calls.map(([{ status, provider }]) => `${status}:${provider}`)

  it('stops at the first provider that finds a phone', async () => {
    const activities = createActivities({ orionConnect: async () => '7272761008' })

    await expect(runWorkflow(activities)).resolves.toEqual({
      status: 'FOUND',
      phoneNumber: '7272761008',
      provider: 'orionConnect',
    })
    expect(queriedProviders(activities)).toEqual(['orionConnect'])
    expect(activities.updatePhoneEnrichment).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'FOUND', provider: 'orionConnect', phoneNumber: '7272761008' })
    )
  }, 60_000)

  it('queries the providers in order, reporting progress, until one finds a phone', async () => {
    const activities = createActivities({ nimbusLookup: async () => '+34 2730603531' })

    await expect(runWorkflow(activities)).resolves.toMatchObject({
      status: 'FOUND',
      provider: 'nimbusLookup',
    })
    expect(queriedProviders(activities)).toEqual(['orionConnect', 'astraDialer', 'nimbusLookup'])
    expect(storedStatuses(activities)).toEqual([
      'IN_PROGRESS:orionConnect',
      'IN_PROGRESS:astraDialer',
      'IN_PROGRESS:nimbusLookup',
      'FOUND:nimbusLookup',
    ])
  }, 60_000)

  it('marks the lead as no data found when no provider has a phone', async () => {
    const activities = createActivities({})

    await expect(runWorkflow(activities)).resolves.toEqual({ status: 'NOT_FOUND' })
    expect(queriedProviders(activities)).toEqual(['orionConnect', 'astraDialer', 'nimbusLookup'])
    expect(storedStatuses(activities).at(-1)).toBe('NOT_FOUND:null')
  }, 60_000)

  it('retries a failing provider 3 times before moving on to the next one', async () => {
    const activities = createActivities({
      orionConnect: async () => {
        throw new Error('orionConnect responded with HTTP 500')
      },
      astraDialer: async () => '9335775209',
    })

    await expect(runWorkflow(activities)).resolves.toMatchObject({ status: 'FOUND', provider: 'astraDialer' })
    expect(queriedProviders(activities)).toEqual([
      'orionConnect',
      'orionConnect',
      'orionConnect',
      'astraDialer',
    ])
  }, 60_000)

  it('recovers when a provider succeeds on a retry', async () => {
    const orionConnect = vi
      .fn<() => Promise<string | null>>()
      .mockRejectedValueOnce(new Error('orionConnect responded with HTTP 500'))
      .mockResolvedValueOnce('7272761008')
    const activities = createActivities({ orionConnect })

    await expect(runWorkflow(activities)).resolves.toMatchObject({
      status: 'FOUND',
      provider: 'orionConnect',
    })
    expect(queriedProviders(activities)).toEqual(['orionConnect', 'orionConnect'])
  }, 60_000)

  it('does not retry a provider that rejects the request', async () => {
    const activities = createActivities({
      orionConnect: async () => {
        throw ApplicationFailure.nonRetryable(
          'orionConnect responded with HTTP 401',
          'ProviderRequestRejected'
        )
      },
    })

    await expect(runWorkflow(activities)).rejects.toBeInstanceOf(WorkflowFailedError)
    expect(queriedProviders(activities)).toEqual(['orionConnect', 'astraDialer', 'nimbusLookup'])
  }, 60_000)

  it('fails, marking the lead as failed, when no phone is found and a provider kept failing', async () => {
    const activities = createActivities({
      orionConnect: async () => {
        throw new Error('orionConnect responded with HTTP 500')
      },
    })

    await expect(runWorkflow(activities)).rejects.toBeInstanceOf(WorkflowFailedError)
    expect(storedStatuses(activities).at(-1)).toBe('FAILED:null')
  }, 60_000)

  describe('idempotency', () => {
    it('runs a single workflow per lead, even when requested several times', async () => {
      const activities = createActivities({ orionConnect: async () => '7272761008' })
      const enrichLead = { ...lead, id: 1001 }

      // Requested twice before any worker picks it up: the second request attaches to the running one.
      await expect(startPhoneEnrichment(testEnv.client.workflow, enrichLead)).resolves.toEqual({
        started: true,
      })
      await expect(startPhoneEnrichment(testEnv.client.workflow, enrichLead)).resolves.toEqual({
        started: true,
      })

      await runWithWorkers(activities, () => testEnv.client.workflow.getHandle('enrich-phone-1001').result())
      expect(queriedProviders(activities)).toEqual(['orionConnect'])

      await expect(startPhoneEnrichment(testEnv.client.workflow, enrichLead)).resolves.toEqual({
        started: false,
        reason: 'Phone enrichment already completed for this lead',
      })
    }, 60_000)

    it('allows enriching a lead again after its previous enrichment failed', async () => {
      const enrichLead = { ...lead, id: 1002 }
      const failing = createActivities({
        orionConnect: async () => {
          throw new Error('orionConnect responded with HTTP 500')
        },
      })

      await startPhoneEnrichment(testEnv.client.workflow, enrichLead)
      await expect(
        runWithWorkers(failing, () => testEnv.client.workflow.getHandle('enrich-phone-1002').result())
      ).rejects.toBeInstanceOf(WorkflowFailedError)

      const succeeding = createActivities({ orionConnect: async () => '7272761008' })
      await expect(startPhoneEnrichment(testEnv.client.workflow, enrichLead)).resolves.toEqual({
        started: true,
      })
      await expect(
        runWithWorkers(succeeding, () => testEnv.client.workflow.getHandle('enrich-phone-1002').result())
      ).resolves.toMatchObject({ status: 'FOUND' })
    }, 60_000)
  })
})
