import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '#/lib/auth-client'
import { ThemeToggle } from '#/components/ui/theme-toggle'

export const Route = createFileRoute('/auth/')({
  component: AuthPage,
})

function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result =
        mode === 'signup'
          ? await authClient.signUp.email({ name, email, password })
          : await authClient.signIn.email({ email, password })

      if (result.error) {
        setError(result.error.message ?? 'Authentication failed')
        return
      }

      await navigate({ to: '/app/time-tracker' })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center bg-slate-50 px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Link to="/" className="inline-flex items-center gap-3 no-underline">
          <img src="/logo192.png" alt="" className="h-9 w-9 rounded-lg" />
          <span className="text-sm font-bold text-slate-950 dark:text-slate-50">
            Clockify Timer
          </span>
        </Link>
        <h1 className="m-0 mt-8 text-2xl font-black tracking-tight">
          {mode === 'signup' ? 'Create your account' : 'Sign in'}
        </h1>
        <p className="m-0 mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Your workspace access is controlled by the Owner/Admin member list.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          {mode === 'signup' && (
            <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:focus:border-teal-500"
                required
              />
            </label>
          )}
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:focus:border-teal-500"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:focus:border-teal-500"
              required
            />
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-11 rounded-lg bg-slate-950 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-300 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            {loading
              ? 'Please wait…'
              : mode === 'signup'
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
          className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {mode === 'signup'
            ? 'Already have an account? Sign in'
            : 'Need an account? Create one'}
        </button>
      </section>
    </main>
  )
}
