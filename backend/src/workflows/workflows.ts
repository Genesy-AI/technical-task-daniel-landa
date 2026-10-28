import { proxyActivities } from '@temporalio/workflow'
import type * as activities from './activities'

const { verifyEmail } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 second',
  // Temporal retries activities forever by default, so a verification that keeps
  // timing out would never let the workflow complete. Bound it to surface a failure.
  retry: { maximumAttempts: 3 },
})

export async function verifyEmailWorkflow(email: string): Promise<boolean> {
  return await verifyEmail(email)
}
