import { createFileRoute } from '@tanstack/react-router'
import { ProfileScreen } from '#/components/time-tracker/WorkspaceScreens'
import { getSelfProfileFn, getTrackerStateFn } from '#/lib/server/tracker'

export const Route = createFileRoute('/app/profile')({
  loader: async () => {
    const [state, selfProfile] = await Promise.all([
      getTrackerStateFn(),
      getSelfProfileFn(),
    ])
    return { state, selfProfile }
  },
  staleTime: 30_000,
  component: ProfileRoute,
})

function ProfileRoute() {
  const { state, selfProfile } = Route.useLoaderData()
  return <ProfileScreen state={state} selfProfile={selfProfile} />
}
