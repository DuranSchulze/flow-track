import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { MembersScreen } from '#/components/time-tracker/WorkspaceScreens'
import { getMemberAnalyticsFn, getTrackerStateFn } from '#/lib/server/tracker'
import type { MemberStat } from '#/lib/server/tracker.server'

export const Route = createFileRoute('/app/workspace/members')({
  loader: async () => {
    const [state, memberStats] = await Promise.all([
      getTrackerStateFn(),
      getMemberAnalyticsFn().catch((): MemberStat[] => []),
    ])
    return { state, memberStats }
  },
  staleTime: 30_000,
  component: MembersRoute,
})

function MembersRoute() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isDetailRoute =
    pathname !== '/app/workspace/members' &&
    pathname !== '/app/workspace/members/'

  if (isDetailRoute) {
    return <Outlet />
  }

  const { state, memberStats } = Route.useLoaderData()
  return <MembersScreen state={state} memberStats={memberStats} />
}
