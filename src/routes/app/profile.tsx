import { createFileRoute } from '@tanstack/react-router'
import { ProfileScreen } from '#/components/time-tracker/WorkspaceScreens'
import { getTrackerStateFn } from '#/lib/server/tracker'

export const Route = createFileRoute('/app/profile')({
  loader: () => getTrackerStateFn(),
  staleTime: 30_000,
  component: ProfileRoute,
})

function ProfileRoute() {
  const state = Route.useLoaderData()
  return <ProfileScreen state={state} />
}
