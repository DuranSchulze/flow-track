import { createFileRoute } from '@tanstack/react-router'
import { TimeTrackerDashboard } from '#/components/time-tracker/TimeTrackerDashboard'
import { getTrackerStateFn } from '#/lib/server/tracker'

export const Route = createFileRoute('/app/time-tracker/week')({
  loader: () => getTrackerStateFn(),
  staleTime: 30_000,
  component: WeekRoute,
})

function WeekRoute() {
  const state = Route.useLoaderData()
  return <TimeTrackerDashboard state={state} view="week" />
}
