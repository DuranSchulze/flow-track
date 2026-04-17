import { createFileRoute } from '@tanstack/react-router'
import { ReportScreen } from '#/components/time-tracker/WorkspaceScreens'
import { getTrackerStateFn } from '#/lib/server/tracker'

export const Route = createFileRoute('/app/workspace/reports')({
  loader: () => getTrackerStateFn(),
  component: ReportsRoute,
})

function ReportsRoute() {
  const state = Route.useLoaderData()
  return <ReportScreen state={state} />
}
