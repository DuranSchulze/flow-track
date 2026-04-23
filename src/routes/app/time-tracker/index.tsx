import { createFileRoute } from '@tanstack/react-router'
import { TimeTrackerDashboard } from '#/components/time-tracker/TimeTrackerDashboard'
import { getTrackerStateFn } from '#/lib/server/tracker'
import type { ViewMode } from '#/lib/time-tracker/types'

type TimeTrackerSearch = {
  view?: ViewMode
}

function isViewMode(value: unknown): value is ViewMode {
  return value === 'day' || value === 'week' || value === 'month'
}

export const Route = createFileRoute('/app/time-tracker/')({
  validateSearch: (search: Record<string, unknown>): TimeTrackerSearch => ({
    view: isViewMode(search.view) ? search.view : undefined,
  }),
  loader: () => getTrackerStateFn(),
  staleTime: 30_000,
  component: TimeTrackerRoute,
})

function TimeTrackerRoute() {
  const state = Route.useLoaderData()
  const { view = 'week' } = Route.useSearch()
  return <TimeTrackerDashboard state={state} view={view} />
}
