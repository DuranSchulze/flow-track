import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '#/components/time-tracker/AppShell'
import { getSessionFn } from '#/lib/server/session'
import { getWorkspaceAccessFn } from '#/lib/server/workspace-access'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/app')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData({
      queryKey: ['session'],
      queryFn: () => getSessionFn(),
      staleTime: 5 * 60 * 1000,
    })
    if (!session?.user) {
      throw redirect({ to: '/auth' })
    }
    return { session }
  },
  loader: async ({ context }) => {
    try {
      const access = await context.queryClient.ensureQueryData({
        queryKey: ['workspace-access'],
        queryFn: () => getWorkspaceAccessFn(),
        staleTime: 5 * 60 * 1000,
      })
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
      throw redirect({ to: '/onboarding' })
    }
  },
  staleTime: 5 * 60 * 1000,
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        {error instanceof Error ? error.message : 'An unexpected error occurred.'}
      </p>
    </div>
  ),
  component: AppRoute,
})

function AppRoute() {
  const data = Route.useLoaderData()
  return <AppShell workspace={data.workspace} user={data.user} />
}
