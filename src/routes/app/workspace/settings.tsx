import { createFileRoute } from '@tanstack/react-router'
import { SettingsScreen } from '#/components/time-tracker/WorkspaceScreens'
import { getTrackerStateFn } from '#/lib/server/tracker'

export const Route = createFileRoute('/app/workspace/settings')({
  loader: () => getTrackerStateFn(),
  staleTime: 30_000,
  component: SettingsRoute,
})

function SettingsRoute() {
  const state = Route.useLoaderData()
  return <SettingsScreen state={state} />
}
