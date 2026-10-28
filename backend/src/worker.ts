import { NativeConnection, Worker } from '@temporalio/worker'
import * as activities from './workflows/activities'
import { PHONE_PROVIDERS } from './phoneEnrichment/config'

export async function runTemporalWorker() {
  const connection = await NativeConnection.connect({
    address: 'localhost:7233',
  })
  try {
    const worker = await Worker.create({
      connection,
      namespace: 'default',
      taskQueue: 'myQueue',
      workflowsPath: require.resolve('./workflows'),
      activities,
    })

    // Activity-only worker per phone provider, so each provider's rate limit applies to its own queue.
    const phoneProviderWorkers = await Promise.all(
      PHONE_PROVIDERS.map((provider) =>
        Worker.create({
          connection,
          namespace: 'default',
          taskQueue: provider.taskQueue,
          activities: { lookupPhone: activities.lookupPhone },
          maxTaskQueueActivitiesPerSecond: provider.maxRequestsPerSecond,
        })
      )
    )

    await Promise.all([worker, ...phoneProviderWorkers].map((w) => w.run()))
  } finally {
    await connection.close()
  }
}
