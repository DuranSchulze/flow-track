import { useState } from 'react'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Cog,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Tags,
  Timer,
  Users,
} from 'lucide-react'
import { Navbar } from './Navbar'
import type { Workspace } from '#/lib/time-tracker/types'

const timerChildren = [
  {
    to: '/app/time-tracker',
    label: 'Timer',
    icon: LayoutDashboard,
    exact: true,
  },
  { to: '/app/time-tracker/day', label: 'Day view', icon: CalendarDays },
  { to: '/app/time-tracker/week', label: 'Week view', icon: BarChart3 },
  { to: '/app/time-tracker/month', label: 'Month view', icon: ClipboardList },
] as const

const settingsChildren = [
  { to: '/app/workspace/members', label: 'Members', icon: Users },
  { to: '/app/workspace/catalogs', label: 'Catalogs', icon: Tags },
  { to: '/app/workspace/settings', label: 'Workspace settings', icon: Cog },
] as const

export function AppShell({
  workspace,
  user,
}: {
  workspace: Workspace
  user: { id: string; name: string; email: string }
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const timerActive = pathname.startsWith('/app/time-tracker')
  const settingsActive = pathname.startsWith('/app/workspace')

  const [timerOpen, setTimerOpen] = useState(timerActive)
  const [settingsOpen, setSettingsOpen] = useState(settingsActive)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-muted text-foreground">
      <Navbar workspace={workspace} user={user} />

      <div className="flex">
        {/* ── Sidebar ── */}
        <aside
          className={`hidden sticky top-16 h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 ease-in-out lg:flex ${
            collapsed ? 'w-[60px]' : 'w-[260px]'
          }`}
        >
          <div className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
            {/* Workspace badge */}
            {collapsed ? (
              <div className="mb-3 flex justify-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/30">
                  <BriefcaseBusiness className="h-4 w-4 text-primary" />
                </div>
              </div>
            ) : (
              <div className="mb-3 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5">
                <p className="m-0 text-xs font-semibold uppercase tracking-wide text-primary">
                  Workspace
                </p>
                <p className="m-0 mt-0.5 truncate text-sm font-bold text-foreground">
                  {workspace.name}
                </p>
                <p className="m-0 mt-0.5 truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
            )}

            <nav className="grid gap-0.5">
              {/* ── Timer group ── */}
              {collapsed ? (
                <Link
                  to="/app/time-tracker"
                  title="Timer"
                  className={`flex h-10 w-full items-center justify-center rounded-lg transition-colors ${
                    timerActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <Timer className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setTimerOpen((o) => !o)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    timerActive && !timerOpen
                      ? 'bg-primary text-primary-foreground'
                      : timerActive
                        ? 'bg-primary/15 text-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <Timer className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">Timer</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                      timerOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              )}

              {!collapsed && timerOpen && (
                <div className="ml-3 mt-0.5 grid gap-0.5 border-l border-border pl-3">
                  {timerChildren.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground no-underline hover:bg-accent hover:text-foreground"
                        activeProps={{
                          className:
                            'flex items-center gap-3 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground no-underline',
                        }}
                        activeOptions={{ exact: true }}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* ── Settings group ── */}
              {collapsed ? (
                <Link
                  to="/app/workspace/members"
                  title="Settings"
                  className={`mt-1 flex h-10 w-full items-center justify-center rounded-lg transition-colors ${
                    settingsActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <Cog className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setSettingsOpen((o) => !o)}
                  className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    settingsActive && !settingsOpen
                      ? 'bg-primary text-primary-foreground'
                      : settingsActive
                        ? 'bg-primary/15 text-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <Cog className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">Settings</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                      settingsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              )}

              {!collapsed && settingsOpen && (
                <div className="ml-3 mt-0.5 grid gap-0.5 border-l border-border pl-3">
                  {settingsChildren.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground no-underline hover:bg-accent hover:text-foreground"
                        activeProps={{
                          className:
                            'flex items-center gap-3 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground no-underline',
                        }}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </nav>
          </div>

          {/* ── Collapse toggle ── */}
          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
