import path from 'path'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { WorkflowFailedError } from '@temporalio/client'
import { TestWorkflowEnvironment } from '@temporalio/testing'
import { Worker } from '@temporalio/worker'
import * as activities from './activities'
import { verifyEmailWorkflow } from './workflows'

const taskQueue = 'test-verify-email'

describe('verifyEmailWorkflow', () => {
  let testEnv: TestWorkflowEnvironment

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createTimeSkipping()
  }, 120_000)

  afterAll(async () => {
    await testEnv?.teardown()
  })

  const runWorkflow = async (email: string) => {
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue,
      workflowsPath: path.resolve(__dirname, 'index.ts'),
      activities,
    })

    return worker.runUntil(
      testEnv.client.workflow.execute(verifyEmailWorkflow, {
        taskQueue,
        workflowId: `verify-email-${email}-${Date.now()}`,
        args: [email],
      })
    )
  }

  it('returns true for a valid email', async () => {
    await expect(runWorkflow('valid.lead@example.com')).resolves.toBe(true)
  }, 60_000)

  it('returns false for an invalid email', async () => {
    await expect(runWorkflow('john.doe@example.com')).resolves.toBe(false)
  }, 60_000)

  it('fails instead of retrying forever when verification keeps timing out', async () => {
    await expect(runWorkflow('jane.smith@example.com')).rejects.toBeInstanceOf(WorkflowFailedError)
  }, 60_000)
})
