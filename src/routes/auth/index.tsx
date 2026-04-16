import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '#/lib/auth-client'
import { gooeyToast } from 'goey-toast'
import { ThemeToggle } from '#/components/ui/theme-toggle'
import { getSessionFn } from '#/lib/server/session'
import { getWorkspaceAccessFn } from '#/lib/server/workspace-access'

export const Route = createFileRoute('/auth/')({
  loader: async () => {
    const session = await getSessionFn()
    if (session?.user) {
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
        signedIn: true as const,
        email: session.user.email,
        name: session.user.name,
      }
    }

    return {
      signedIn: false as const,
      email: '',
      name: '',
    }
  },
  component: AuthPage,
})

function AuthPage() {
  const { signedIn, email, name } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setLoading(true)

    try {
      const result =
        mode === 'signup'
          ? await authClient.signUp.email({
              name: formName,
              email: formEmail,
              password,
            })
          : await authClient.signIn.email({ email: formEmail, password })

      if (result.error) {
        gooeyToast.error(
          mode === 'signup' ? 'Could not create account' : 'Sign in failed',
          { description: result.error.message ?? 'Authentication failed' },
        )
        return
      }

      await navigate({ to: '/lounge' })
    } catch {
      gooeyToast.error('Something went wrong', {
        description: 'Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut(): Promise<void> {
    await authClient.signOut()
    await router.invalidate()
    await navigate({ to: '/auth' })
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

        {signedIn ? (
          <SignedInPanel
            name={name}
            email={email}
            onSignOut={handleSignOut}
            onCheckAccess={() => void navigate({ to: '/lounge' })}
          />
        ) : (
          <SignInForm
            mode={mode}
            name={formName}
            email={formEmail}
            password={password}
            loading={loading}
            onNameChange={setFormName}
            onEmailChange={setFormEmail}
            onPasswordChange={setPassword}
            onModeToggle={() =>
              setMode(mode === 'signup' ? 'signin' : 'signup')
            }
            onSubmit={handleSubmit}
          />
        )}
      </section>
    </main>
  )
}

function SignedInPanel({
  name,
  email,
  onSignOut,
  onCheckAccess,
}: {
  name: string
  email: string
  onSignOut: () => void
  onCheckAccess: () => void
}) {
  return (
    <div className="mt-8">
      <h1 className="m-0 text-2xl font-black tracking-tight">
        Already signed in
      </h1>
      <p className="m-0 mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
        You are currently logged in to this device.
      </p>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
        <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Logged in as
        </p>
        <p className="m-0 mt-1 text-base font-bold text-slate-950 dark:text-slate-50">
          {name}
        </p>
        <p className="m-0 text-sm text-slate-500 dark:text-slate-400">
          {email}
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        This email is not yet linked to a workspace member. Ask an Owner or
        Admin to add it.
      </div>

      <div className="mt-5 grid gap-3">
        <button
          type="button"
          onClick={onCheckAccess}
          className="h-11 rounded-lg bg-slate-950 text-sm font-bold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
        >
          Check workspace access
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="h-11 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Sign out and use another email
        </button>
      </div>
    </div>
  )
}

function SignInForm({
  mode,
  name,
  email,
  password,
  loading,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onModeToggle,
  onSubmit,
}: {
  mode: 'signin' | 'signup'
  name: string
  email: string
  password: string
  loading: boolean
  onNameChange: (v: string) => void
  onEmailChange: (v: string) => void
  onPasswordChange: (v: string) => void
  onModeToggle: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <>
      <h1 className="m-0 mt-8 text-2xl font-black tracking-tight">
        {mode === 'signup' ? 'Create your account' : 'Sign in'}
      </h1>
      <p className="m-0 mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
        Your workspace access is controlled by the Owner/Admin member list.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        {mode === 'signup' && (
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Name
            <input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
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
            onChange={(event) => onEmailChange(event.target.value)}
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:focus:border-teal-500"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            minLength={8}
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:focus:border-teal-500"
            required
          />
        </label>

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
        onClick={onModeToggle}
        className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {mode === 'signup'
          ? 'Already have an account? Sign in'
          : 'Need an account? Create one'}
      </button>
    </>
  )
}
