import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, BarChart3, Clock, ShieldCheck, Tags, Users } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <img src="/logo192.png" alt="" className="h-9 w-9 rounded-lg" />
            <span className="text-sm font-bold text-slate-950">Clockify Timer</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 no-underline hover:bg-slate-50"
            >
              Sign in
            </Link>
            <Link
              to="/app/time-tracker"
              className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white no-underline hover:bg-slate-800"
            >
              Open app
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="m-0 text-sm font-bold uppercase tracking-wide text-teal-700">
            Internal time tracking
          </p>
          <h1 className="m-0 mt-4 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Track employee time by workspace, project, department, and tag.
          </h1>
          <p className="m-0 mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            A private company workspace for live timers, manual entries, billable
            work, controlled catalogs, and clean reporting.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/app/time-tracker"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white no-underline hover:bg-slate-800"
            >
              Start tracking
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/app/workspace/members"
              className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-slate-800 no-underline hover:bg-white"
            >
              View workspace
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <img
            src="/background-2.jpg"
            alt=""
            className="h-48 w-full rounded-lg object-cover"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Feature icon={Clock} label="One active timer" />
            <Feature icon={Tags} label="Projects and tags" />
            <Feature icon={Users} label="Departments and cohorts" />
            <Feature icon={BarChart3} label="Day, week, month totals" />
            <Feature icon={ShieldCheck} label="Owner/Admin control" />
          </div>
        </div>
      </section>
    </main>
  )
}

function Feature({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <Icon className="h-4 w-4 text-teal-700" />
      <span className="text-sm font-semibold text-slate-700">{label}</span>
    </div>
  )
}

