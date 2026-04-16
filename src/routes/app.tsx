import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '#/components/time-tracker/AppShell'
import { getSessionFn } from '#/lib/server/session'
import { getWorkspaceAccessFn } from '#/lib/server/workspace-access'

export const Route = createFileRoute('/app')({
  beforeLoad: async () => {
    const session = await getSessionFn()
    if (!session?.user) {
      throw redirect({ to: '/auth' })
    }
    return { session }
  },
  loader: async () => {
    try {
      const access = await getWorkspaceAccessFn()
      return {
        workspace: {
          id: access.workspace.id,
          name: access.workspace.name,
          timezone: access.workspace.timezone,
        },
        user: {
          id: access.user.id,
          name: access.user.name,
          email: access.user.email,
        },
      }
    } catch {
      throw redirect({ to: '/lounge' })
    }
  },
  component: AppRoute,
})

function AppRoute() {
  const data = Route.useLoaderData()
  return <AppShell workspace={data.workspace} user={data.user} />
}
