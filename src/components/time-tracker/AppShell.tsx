import { useState } from 'react'
import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Cog,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Tags,
  Timer,
  UserCircle,
  Users,
} from 'lucide-react'
import { authClient } from '#/lib/auth-client'
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
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const timerActive = pathname.startsWith('/app/time-tracker')
  const settingsActive = pathname.startsWith('/app/workspace')

  const [timerOpen, setTimerOpen] = useState(timerActive)
  const [settingsOpen, setSettingsOpen] = useState(settingsActive)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex min-h-16 flex-wrap items-center gap-3 px-4 sm:px-6">
          <Link
            to="/app/time-tracker"
            className="flex items-center gap-3 no-underline"
          >
            <img
              src="/logo192.png"
              alt=""
              className="h-9 w-9 rounded-lg border border-slate-200 bg-white"
            />
            <div>
              <p className="m-0 text-sm font-bold text-slate-950">Flow Track</p>
              <p className="m-0 text-xs text-slate-500">
                Internal workspace tracking
              </p>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:flex">
              <BriefcaseBusiness className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-800">
                {workspace.name}
              </span>
            </div>
            <Link
              to="/app/profile"
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 no-underline hover:bg-slate-50"
            >
              <UserCircle className="h-4 w-4" />
              <span className="hidden sm:inline">{user.name}</span>
            </Link>
            <button
              type="button"
              onClick={() =>
                void authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => void navigate({ to: '/auth' }),
                  },
                })
              }
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* ── Sidebar ── */}
        <aside
          className={`hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ease-in-out lg:flex ${
            collapsed ? 'w-[60px]' : 'w-[260px]'
          }`}
        >
          <div className="flex flex-1 flex-col overflow-hidden px-2 py-3">
            {/* Workspace badge */}
            {collapsed ? (
              <div className="mb-3 flex justify-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 border border-teal-200">
                  <BriefcaseBusiness className="h-4 w-4 text-teal-700" />
                </div>
              </div>
            ) : (
              <div className="mb-3 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5">
                <p className="m-0 text-xs font-semibold uppercase tracking-wide text-teal-700">
                  Workspace
                </p>
                <p className="m-0 mt-0.5 truncate text-sm font-bold text-slate-950">
                  {workspace.name}
                </p>
                <p className="m-0 mt-0.5 truncate text-xs text-slate-500">
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
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
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
                      ? 'bg-slate-950 text-white'
                      : timerActive
                        ? 'bg-slate-100 text-slate-950'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
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
                <div className="ml-3 mt-0.5 grid gap-0.5 border-l border-slate-200 pl-3">
                  {timerChildren.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 no-underline hover:bg-slate-100 hover:text-slate-950"
                        activeProps={{
                          className:
                            'flex items-center gap-3 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white no-underline',
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
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
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
                      ? 'bg-slate-950 text-white'
                      : settingsActive
                        ? 'bg-slate-100 text-slate-950'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
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
                <div className="ml-3 mt-0.5 grid gap-0.5 border-l border-slate-200 pl-3">
                  {settingsChildren.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 no-underline hover:bg-slate-100 hover:text-slate-950"
                        activeProps={{
                          className:
                            'flex items-center gap-3 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white no-underline',
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
          <div className="border-t border-slate-100 p-2">
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
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
