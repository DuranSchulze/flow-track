import { createFileRoute } from '@tanstack/react-router'
import { MembersScreen } from '#/components/time-tracker/WorkspaceScreens'
import { getTrackerStateFn } from '#/lib/server/tracker'

export const Route = createFileRoute('/app/workspace/members')({
  loader: () => getTrackerStateFn(),
  component: MembersRoute,
})

function MembersRoute() {
  const state = Route.useLoaderData()
  return <MembersScreen state={state} />
}
