import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  Tags,
  UserCircle,
  Users,
} from 'lucide-react'
import { authClient } from '#/lib/auth-client'
import type { Workspace } from '#/lib/time-tracker/types'

const navItems = [
  { to: '/app/time-tracker', label: 'Timer', icon: LayoutDashboard },
  { to: '/app/time-tracker/day', label: 'Day view', icon: CalendarDays },
  { to: '/app/time-tracker/week', label: 'Week view', icon: BarChart3 },
  { to: '/app/time-tracker/month', label: 'Month view', icon: ClipboardList },
  { to: '/app/workspace/members', label: 'Members', icon: Users },
  { to: '/app/workspace/catalogs', label: 'Catalogs', icon: Tags },
  { to: '/app/workspace/settings', label: 'Settings', icon: Settings },
]

export function AppShell({
  workspace,
  user,
}: {
  workspace: Workspace
  user: { id: string; name: string; email: string }
}) {
  const navigate = useNavigate()

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
              <p className="m-0 text-sm font-bold text-slate-950">
                Clockify Timer
              </p>
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

      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-slate-200 bg-white px-4 py-4 lg:border-b-0 lg:border-r">
          <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 p-3">
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-teal-700">
              Workspace
            </p>
            <p className="m-0 mt-1 text-sm font-bold text-slate-950">
              {workspace.name}
            </p>
            <p className="m-0 mt-1 text-xs text-slate-500">{user.email}</p>
          </div>

          <nav className="grid gap-1">
            {navItems.map((item) => {
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
          </nav>
        </aside>

        <main className="min-w-0 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
