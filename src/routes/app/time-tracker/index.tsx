import { createFileRoute } from '@tanstack/react-router'
import { TimeTrackerDashboard } from '#/components/time-tracker/TimeTrackerDashboard'
import { getTrackerStateFn } from '#/lib/server/tracker'

export const Route = createFileRoute('/app/time-tracker/')({
  loader: () => getTrackerStateFn(),
  component: TimeTrackerRoute,
})

function TimeTrackerRoute() {
  const state = Route.useLoaderData()
  return <TimeTrackerDashboard state={state} view="week" />
}
