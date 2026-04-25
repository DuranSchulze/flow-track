import { useState } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { Cog, Tags, Users } from 'lucide-react'
import { AppSidebar } from './AppSidebar'
import { Navbar } from './Navbar'
import type { Workspace } from '#/lib/time-tracker/types'

type AppShellWorkspace = Pick<Workspace, 'id' | 'name' | 'timezone'>

const settingsChildren = [
  { to: '/app/workspace/members', label: 'Members', icon: Users },
  { to: '/app/workspace/catalogs', label: 'Catalogs', icon: Tags },
  { to: '/app/workspace/settings', label: 'Workspace settings', icon: Cog },
] as const

export function AppShell({
  workspace,
  user,
}: {
  workspace: AppShellWorkspace
  user: { id: string; name: string; email: string }
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const timerActive = pathname.startsWith('/app/time-tracker')
  const analyticsActive = pathname.startsWith('/app/analytics')
  const settingsActive = pathname.startsWith('/app/workspace')

  const [settingsOpen, setSettingsOpen] = useState(settingsActive)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar workspace={workspace} user={user} />

      <div className="flex min-w-0">
        <AppSidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
          workspaceName={workspace.name}
          userEmail={user.email}
          timerActive={timerActive}
          analyticsActive={analyticsActive}
          settingsActive={settingsActive}
          settingsOpen={settingsOpen}
          onToggleSettings={() => setSettingsOpen((open) => !open)}
          settingsChildren={settingsChildren}
        />

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
