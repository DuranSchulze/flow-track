import { createFileRoute } from '@tanstack/react-router'
import { CatalogsScreen } from '#/components/time-tracker/WorkspaceScreens'
import { getTrackerStateFn } from '#/lib/server/tracker'

export const Route = createFileRoute('/app/workspace/catalogs')({
  loader: () => getTrackerStateFn(),
  component: CatalogsRoute,
})

function CatalogsRoute() {
  const state = Route.useLoaderData()
  return <CatalogsScreen state={state} />
}
