import { createFileRoute } from '@tanstack/react-router'
import { TimeTrackerDashboard } from '#/components/time-tracker/TimeTrackerDashboard'
import { getTrackerStateFn } from '#/lib/server/tracker'

export const Route = createFileRoute('/app/time-tracker/day')({
  loader: () => getTrackerStateFn(),
  component: DayRoute,
})

function DayRoute() {
  const state = Route.useLoaderData()
  return <TimeTrackerDashboard state={state} view="day" />
}
