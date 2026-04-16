import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { Building2, Clock3, MailCheck } from 'lucide-react'
import { authClient } from '#/lib/auth-client'
import { getSessionFn } from '#/lib/server/session'
import { getWorkspaceAccessFn } from '#/lib/server/workspace-access'
import { ThemeToggle } from '#/components/ui/theme-toggle'

export const Route = createFileRoute('/lounge')({
  loader: async () => {
    const session = await getSessionFn()
    if (!session?.user) {
      throw redirect({ to: '/auth' })
    }

    let hasWorkspaceAccess = false
    try {
      await getWorkspaceAccessFn()
      hasWorkspaceAccess = true
    } catch {
      hasWorkspaceAccess = false
    }

    if (hasWorkspaceAccess) {
      throw redirect({ to: '/app/time-tracker' })
    }

    return {
      email: session.user.email,
      name: session.user.name,
    }
  },
  component: LoungePage,
})

function LoungePage() {
  const { email, name } = Route.useLoaderData()
  const navigate = useNavigate()

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-3 no-underline">
          <img src="/logo192.png" alt="" className="h-9 w-9 rounded-lg" />
          <span className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
            Clockify Timer
          </span>
        </Link>
        <ThemeToggle />
      </div>

      <section className="mx-auto mt-16 grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="m-0 inline-flex rounded-lg border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-normal text-teal-800 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-200">
            Workspace access pending
          </p>
          <h1 className="m-0 mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
            Hi {name || email}, your account is ready.
          </h1>
          <p className="m-0 mt-5 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
            You are signed in as {email}. To enter the tracker, an Owner or
            Admin needs to add this email to a workspace member invitation.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void navigate({ to: '/app/time-tracker' })}
              className="rounded-lg bg-teal-700 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-800"
            >
              Check access again
            </button>
            <button
              type="button"
              onClick={() => {
                void authClient.signOut({
                  fetchOptions: {
                    onSuccess: async () => {
                      await navigate({ to: '/auth' })
                    },
                  },
                })
              }}
              className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Use another email
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <MailCheck className="h-6 w-6 text-teal-700 dark:text-teal-300" />
            <h2 className="m-0 mt-3 text-base font-black">Account created</h2>
            <p className="m-0 mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Your login exists in the database, so you can come back with the
              same email and password.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <Building2 className="h-6 w-6 text-cyan-700 dark:text-cyan-300" />
            <h2 className="m-0 mt-3 text-base font-black">Workspace needed</h2>
            <p className="m-0 mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Access opens when this email matches a workspace member record.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <Clock3 className="h-6 w-6 text-rose-700 dark:text-rose-300" />
            <h2 className="m-0 mt-3 text-base font-black">Timer locked</h2>
            <p className="m-0 mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Time tracking stays private until your workspace link is active.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
