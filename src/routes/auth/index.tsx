import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'
import { BarChart3, Clock, Users } from 'lucide-react'
import { authClient } from '#/lib/auth-client'
import { gooeyToast } from 'goey-toast'
import { ThemeToggle } from '#/components/ui/theme-toggle'
import { PasswordInput } from '#/components/ui/password-input'
import { DevLoginButton } from '#/components/auth/DevLoginButton'
import { cn } from '#/lib/utils'
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
    <main className="relative min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="grid min-h-screen lg:grid-cols-2">
        {/* ── Left: background image + tagline ─────────────────────────── */}
        <aside className="relative hidden overflow-hidden lg:block">
          <img
            src="/auth-background.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-black/80" />

          <div className="relative flex h-full flex-col justify-between p-10 text-white">
            <Link
              to="/"
              className="inline-flex w-fit items-center gap-3 no-underline"
            >
              <img
                src="/logo192.png"
                alt=""
                className="h-10 w-10 rounded-lg border border-white/20 bg-white/10 backdrop-blur"
              />
              <span className="text-sm font-bold tracking-wide text-white">
                Clockify Timer
              </span>
            </Link>

            <div className="max-w-lg">
              <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                Internal time tracking
              </p>
              <h2 className="m-0 mt-3 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                Track every hour, every project,
                <br />
                every team.
              </h2>
              <p className="m-0 mt-4 text-base leading-7 text-white/80">
                A private workspace for live timers, manual entries, and clean
                reporting. Built for teams who care about their time.
              </p>

              <ul className="m-0 mt-8 grid gap-3 p-0 text-sm">
                <Benefit icon={Clock} label="One active timer per member" />
                <Benefit icon={Users} label="Departments, projects and tags" />
                <Benefit icon={BarChart3} label="Day, week, and month totals" />
              </ul>
            </div>

            <p className="m-0 text-xs text-white/50">
              © {new Date().getFullYear()} Flow Track — internal workspace.
            </p>
          </div>
        </aside>

        {/* ── Right: form card ─────────────────────────────────────────── */}
        <section className="flex items-center justify-center px-4 py-12 sm:px-8">
          <div className="w-full max-w-[440px]">
            <Link
              to="/"
              className="inline-flex items-center gap-3 no-underline lg:hidden"
            >
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
                onModeChange={setMode}
                onSubmit={handleSubmit}
              />
            )}
          </div>
        </section>
      </div>

      <DevLoginButton />
    </main>
  )
}

function Benefit({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur">
        <Icon className="h-4 w-4 text-white" />
      </span>
      <span className="text-white/90">{label}</span>
    </li>
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

type AuthMode = 'signin' | 'signup'

function SignInForm({
  mode,
  name,
  email,
  password,
  loading,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onModeChange,
  onSubmit,
}: {
  mode: AuthMode
  name: string
  email: string
  password: string
  loading: boolean
  onNameChange: (v: string) => void
  onEmailChange: (v: string) => void
  onPasswordChange: (v: string) => void
  onModeChange: (m: AuthMode) => void
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <div className="mt-8">
      <h1 className="m-0 text-3xl font-black tracking-tight">
        {mode === 'signup' ? 'Create your account' : 'Welcome back'}
      </h1>
      <p className="m-0 mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
        {mode === 'signup'
          ? 'Sign up to access your workspace. Your Owner or Admin controls membership.'
          : 'Sign in to your workspace. Access is managed by your Owner or Admin.'}
      </p>

      {/* Segmented Sign in / Sign up tabs */}
      <div
        role="tablist"
        aria-label="Authentication mode"
        className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800"
      >
        <TabButton
          active={mode === 'signin'}
          onClick={() => onModeChange('signin')}
        >
          Sign in
        </TabButton>
        <TabButton
          active={mode === 'signup'}
          onClick={() => onModeChange('signup')}
        >
          Sign up
        </TabButton>
      </div>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        {mode === 'signup' && (
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Name
            <input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
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
            autoComplete="email"
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            required
          />
        </label>
        <div className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <div className="flex items-center justify-between">
            <label htmlFor="auth-password">Password</label>
            {mode === 'signin' && (
              <Link
                to="/auth/forgot-password"
                className="text-xs font-semibold text-[var(--primary)] no-underline hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <PasswordInput
            id="auth-password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            minLength={8}
            autoComplete={
              mode === 'signup' ? 'new-password' : 'current-password'
            }
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 h-11 rounded-lg bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)] shadow-sm transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? 'Please wait…'
            : mode === 'signup'
              ? 'Create account'
              : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'h-9 rounded-md text-sm font-semibold transition-colors',
        active
          ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-slate-50'
          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100',
      )}
    >
      {children}
    </button>
  )
}
