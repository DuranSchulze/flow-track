import { createFileRoute } from '@tanstack/react-router'
import { TimeTrackerDashboard } from '#/components/time-tracker/TimeTrackerDashboard'
import { getTrackerStateFn } from '#/lib/server/tracker'

export const Route = createFileRoute('/app/time-tracker/month')({
  loader: () => getTrackerStateFn(),
  staleTime: 30_000,
  component: MonthRoute,
})

function MonthRoute() {
  const state = Route.useLoaderData()
  return <TimeTrackerDashboard state={state} view="month" />
}
