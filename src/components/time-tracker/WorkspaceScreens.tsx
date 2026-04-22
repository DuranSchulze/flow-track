import { useMemo, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  createWorkspaceInviteFn,
  listWorkspaceInvitesFn,
  resendWorkspaceInviteFn,
  revokeWorkspaceInviteFn,
} from '#/lib/server/workspace-invites'
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  KeyRound,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import { formatHours } from '#/lib/time-tracker/store'
import { gooeyToast } from 'goey-toast'
import { authClient } from '#/lib/auth-client'
import {
  archiveProjectFn,
  archiveTagFn,
  createCohortFn,
  createDepartmentFn,
  createProjectFn,
  createTagFn,
  createWorkspaceRoleFn,
  deleteCohortFn,
  deleteDepartmentFn,
  setMemberStatusFn,
  updateProfileFn,
  updateWorkspaceMemberFn,
  updateWorkspaceSettingsFn,
} from '#/lib/server/tracker'
import type { TrackerState } from '#/lib/time-tracker/types'
import { ThemeSection } from '#/components/settings/ThemeSection'

type MemberStat = {
  memberId: string
  totalSeconds: number
  billableSeconds: number
  entryCount: number
  thisWeekSeconds: number
  thisMonthSeconds: number
  topProjects: Array<{ projectId: string; seconds: number }>
}

const PAGE_SIZE = 10

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Page({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-6">
      <div>
        <p className="m-0 text-sm font-semibold text-primary">{eyebrow}</p>
        <h1 className="m-0 mt-1 text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
      </div>
      {children}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="m-0 mt-1 text-base font-bold text-foreground">{value}</dd>
    </div>
  )
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="m-0 text-lg font-bold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function IconBtn({
  onClick,
  title,
  children,
  variant = 'default',
  className = '',
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  variant?: 'default' | 'danger'
  className?: string
}) {
  const cls =
    variant === 'danger'
      ? 'text-destructive hover:text-destructive'
      : 'text-muted-foreground hover:text-foreground'
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1 transition-colors ${cls} ${className}`}
    >
      {children}
    </button>
  )
}

function MemberStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-primary/15 text-primary',
    INVITED:
      'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    DISABLED: 'bg-destructive/15 text-destructive',
  }
  return (
    <span
      className={`rounded-lg px-2 py-1 text-xs font-bold ${styles[status] ?? 'bg-muted text-foreground'}`}
    >
      {status}
    </span>
  )
}

// ─── ProfileScreen ────────────────────────────────────────────────────────────

export function ProfileScreen({ state }: { state: TrackerState }) {
  const router = useRouter()
  const member = state.members.find((m) => m.id === state.currentMemberId)!
  const department = state.departments.find((d) => d.id === member.departmentId)
  const cohorts = state.cohorts.filter((c) => member.cohortIds.includes(c.id))
  const roleColor =
    state.roles.find((r) => r.id === member.workspaceRoleId)?.color ?? '#94a3b8'

  // ── Edit profile state ──
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(member.name)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(member.image ?? '')
  const [savePending, setSavePending] = useState(false)

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setSavePending(true)
    try {
      await updateProfileFn({
        data: {
          name,
          firstName,
          lastName,
          contactNumber: contactNumber || undefined,
          avatarUrl,
        },
      })
      await router.invalidate()
      gooeyToast.success('Profile updated')
      setEditing(false)
    } catch (err) {
      gooeyToast.error('Could not update profile', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setSavePending(false)
    }
  }

  // ── Change password state ──
  const [pwDialog, setPwDialog] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwPending, setPwPending] = useState(false)

  async function handleChangePassword(event: React.FormEvent) {
    event.preventDefault()
    if (newPw !== confirmPw) {
      gooeyToast.error('Passwords do not match', {
        description: 'New password and confirmation must be identical.',
      })
      return
    }
    if (newPw.length < 8) {
      gooeyToast.error('Password too short', {
        description: 'New password must be at least 8 characters.',
      })
      return
    }
    setPwPending(true)
    try {
      const result = await authClient.changePassword({
        currentPassword: currentPw,
        newPassword: newPw,
        revokeOtherSessions: false,
      })
      if (result.error) {
        gooeyToast.error('Could not change password', {
          description: result.error.message ?? 'Please try again.',
        })
        return
      }
      gooeyToast.success('Password changed successfully')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setPwDialog(false)
    } catch {
      gooeyToast.error('Something went wrong', {
        description: 'Please try again.',
      })
    } finally {
      setPwPending(false)
    }
  }

  const initials = member.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Page title="My Profile" eyebrow="Account">
      <div className="flex justify-center">
        <div className="w-full max-w-lg space-y-4">
          {/* ── Avatar + identity card ── */}
          <section className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
            {/* Avatar */}
            <div className="flex justify-center mb-4">
              {member.image ? (
                <img
                  src={member.image}
                  alt={member.name}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-muted"
                />
              ) : (
                <div
                  className="h-24 w-24 rounded-full flex items-center justify-center text-2xl font-bold text-primary-foreground ring-4 ring-muted"
                  style={{ backgroundColor: roleColor }}
                >
                  {initials}
                </div>
              )}
            </div>

            {/* Name + email */}
            <h2 className="m-0 text-2xl font-bold text-foreground">
              {member.name}
            </h2>
            <p className="m-0 mt-1 text-sm text-muted-foreground">
              {member.email}
            </p>

            {/* Role + status badges */}
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-primary-foreground"
                style={{ backgroundColor: roleColor }}
              >
                {member.roleName}
              </span>
              <MemberStatusBadge status={member.status} />
            </div>
          </section>

          {/* ── Info card ── */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <dl className="grid grid-cols-2 gap-4">
              <Info
                label="Department"
                value={department?.name || 'Unassigned'}
              />
              <Info
                label="Groups / cohorts"
                value={cohorts.map((c) => c.name).join(', ') || 'None'}
              />
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit profile
              </button>
              <button
                type="button"
                onClick={() => setPwDialog(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Change password
              </button>
            </div>
          </section>

          {/* ── Theme / appearance ── */}
          <ThemeSection />

          {/* ── Edit profile inline form ── */}
          {editing && (
            <section className="rounded-2xl border border-primary/30 bg-primary/10 p-6 shadow-sm">
              <h3 className="m-0 mb-4 text-base font-bold text-foreground">
                Edit profile
              </h3>
              <form onSubmit={handleSave} className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-semibold text-foreground">
                    Display name
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-9 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-semibold text-foreground">
                    Contact number
                    <input
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="Optional"
                      className="h-9 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-semibold text-foreground">
                    First name
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="h-9 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-semibold text-foreground">
                    Last name
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="h-9 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-semibold text-foreground sm:col-span-2">
                    Profile picture URL
                    <input
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/photo.jpg (optional)"
                      type="url"
                      className="h-9 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
                    />
                  </label>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={savePending}
                    className="h-9 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground"
                  >
                    {savePending ? 'Saving…' : 'Save changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="h-9 rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>

      {/* ── Change password dialog ── */}
      {pwDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setPwDialog(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-foreground" />
                <h3 className="m-0 text-base font-bold text-foreground">
                  Change password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPwDialog(false)}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="grid gap-3">
              <label className="grid gap-1.5 text-xs font-semibold text-foreground">
                Current password
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-9 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-foreground">
                New password
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="h-9 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-foreground">
                Confirm new password
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="h-9 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <button
                type="submit"
                disabled={pwPending}
                className="mt-1 h-9 w-full rounded-lg bg-primary text-sm font-bold text-primary-foreground transition-colors hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground"
              >
                {pwPending ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Page>
  )
}

// ─── MembersScreen ────────────────────────────────────────────────────────────

export function MembersScreen({
  state,
  memberStats = [],
}: {
  state: TrackerState
  memberStats?: MemberStat[]
}) {
  const router = useRouter()
  const currentMember = state.members.find(
    (m) => m.id === state.currentMemberId,
  )!
  const canManage =
    currentMember.permissionLevel === 'OWNER' ||
    currentMember.permissionLevel === 'ADMIN'

  // ── Add member form ──
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [workspaceRoleId, setWorkspaceRoleId] = useState(
    state.roles[0]?.id ?? '',
  )
  const [departmentId, setDepartmentId] = useState('')
  const [pending, setPending] = useState(false)

  // ── Search / filter / pagination ──
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(0)

  // ── Analytics lookup map ──
  const statsMap = useMemo(() => {
    const map = new Map<string, MemberStat>()
    for (const s of memberStats) map.set(s.memberId, s)
    return map
  }, [memberStats])

  // ── Workspace-wide summary (owner view) ──
  const workspaceSummary = useMemo(() => {
    if (!canManage || memberStats.length === 0) return null
    return memberStats.reduce(
      (acc, s) => ({
        thisWeekSeconds: acc.thisWeekSeconds + s.thisWeekSeconds,
        totalSeconds: acc.totalSeconds + s.totalSeconds,
        billableSeconds: acc.billableSeconds + s.billableSeconds,
        entryCount: acc.entryCount + s.entryCount,
      }),
      { thisWeekSeconds: 0, totalSeconds: 0, billableSeconds: 0, entryCount: 0 },
    )
  }, [memberStats, canManage])

  // ── Filtered members ──
  const filteredMembers = useMemo(() => {
    return state.members.filter((m) => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !m.name.toLowerCase().includes(q) &&
          !m.email.toLowerCase().includes(q)
        )
          return false
      }
      if (filterRole && m.workspaceRoleId !== filterRole) return false
      if (filterDept && m.departmentId !== filterDept) return false
      if (filterStatus && m.status !== filterStatus) return false
      return true
    })
  }, [state.members, search, filterRole, filterDept, filterStatus])

  const totalPages = Math.ceil(filteredMembers.length / PAGE_SIZE)
  const pagedMembers = useMemo(
    () => filteredMembers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredMembers, page],
  )

  function resetPage() {
    setPage(0)
  }

  const hasActiveFilters = search || filterRole || filterDept || filterStatus

  async function handleAddMember(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await createWorkspaceInviteFn({
        data: {
          email,
          workspaceRoleId,
          departmentId: departmentId || undefined,
        },
      })
      await router.invalidate()
      gooeyToast.success('Invitation sent', {
        description: `${email} will receive an email with a link to join.`,
      })
      setEmail('')
      setWorkspaceRoleId(state.roles[0]?.id ?? '')
      setDepartmentId('')
      setShowForm(false)
    } catch (err) {
      gooeyToast.error('Could not send invitation', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Page title="Workspace members" eyebrow="Owner/Admin">
      {/* ── Analytics summary (owner/admin only) ── */}
      {canManage && workspaceSummary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AnalyticCard
            icon={<Clock className="h-4 w-4" />}
            label="This week"
            value={formatHours(workspaceSummary.thisWeekSeconds)}
          />
          <AnalyticCard
            icon={<BarChart2 className="h-4 w-4" />}
            label="Total tracked"
            value={formatHours(workspaceSummary.totalSeconds)}
          />
          <AnalyticCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Billable"
            value={formatHours(workspaceSummary.billableSeconds)}
          />
          <AnalyticCard
            icon={<UserPlus className="h-4 w-4" />}
            label="Total entries"
            value={String(workspaceSummary.entryCount)}
          />
        </div>
      )}

      {canManage && <PendingInvitesPanel />}

      <section className="rounded-lg border border-border bg-card shadow-sm">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="m-0 text-lg font-bold text-foreground">
              Managed user list
            </h2>
            <p className="m-0 mt-1 text-sm text-muted-foreground">
              Employees join this private workspace when their account email
              matches this list.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:brightness-110"
            >
              {showForm ? (
                <X className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {showForm ? 'Cancel' : 'Invite member'}
            </button>
          )}
        </div>

        {/* ── Add member form ── */}
        {showForm && (
          <form
            onSubmit={handleAddMember}
            className="grid gap-4 border-b border-border bg-muted p-4 sm:grid-cols-[1fr_160px_200px_auto]"
          >
            <label className="grid gap-1.5 text-xs font-semibold text-foreground">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="employee@company.com"
                required
                className="h-10 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-foreground">
              Role
              <select
                value={workspaceRoleId}
                onChange={(e) => setWorkspaceRoleId(e.target.value)}
                required
                className="h-10 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
              >
                {state.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-foreground">
              Department
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="h-10 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
              >
                <option value="">Unassigned</option>
                {state.departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={pending}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground"
              >
                {pending ? 'Adding…' : 'Add'}
              </button>
            </div>
          </form>
        )}

        {/* ── Search & filter bar ── */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage() }}
              className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); resetPage() }}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">All roles</option>
            {state.roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <select
            value={filterDept}
            onChange={(e) => { setFilterDept(e.target.value); resetPage() }}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">All departments</option>
            {state.departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); resetPage() }}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INVITED">Invited</option>
            <option value="DISABLED">Disabled</option>
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setFilterRole('')
                setFilterDept('')
                setFilterStatus('')
                resetPage()
              }}
              className="h-9 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* ── Members table ── */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Groups / cohorts</th>
                <th className="px-4 py-3">Status</th>
                {canManage && (
                  <>
                    <th className="px-4 py-3 text-right">This week</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Billable</th>
                    <th className="px-4 py-3" />
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {pagedMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 9 : 5}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No members match your search.
                  </td>
                </tr>
              ) : (
                pagedMembers.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    state={state}
                    canManage={canManage}
                    isSelf={member.id === state.currentMemberId}
                    stats={statsMap.get(member.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {filteredMembers.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, filteredMembers.length)} of{' '}
              {filteredMembers.length} members
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[60px] text-center text-sm text-foreground">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </Page>
  )
}

function AnalyticCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="m-0 text-2xl font-bold text-foreground">{value}</p>
    </div>
  )
}

function MemberRow({
  member,
  state,
  canManage,
  isSelf,
  stats,
}: {
  member: TrackerState['members'][number]
  state: TrackerState
  canManage: boolean
  isSelf: boolean
  stats?: MemberStat
}) {
  const router = useRouter()
  const department = state.departments.find((d) => d.id === member.departmentId)
  const cohorts = state.cohorts.filter((c) => member.cohortIds.includes(c.id))

  const [editing, setEditing] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [roleId, setRoleId] = useState(member.workspaceRoleId)
  const [deptId, setDeptId] = useState(member.departmentId)
  const [cohortIds, setCohortIds] = useState<string[]>(member.cohortIds)
  const [pending, setPending] = useState(false)

  async function handleSave() {
    setPending(true)
    try {
      await updateWorkspaceMemberFn({
        data: {
          memberId: member.id,
          workspaceRoleId: roleId || undefined,
          departmentId: deptId || undefined,
          cohortIds,
        },
      })
      await router.invalidate()
      gooeyToast.success('Member updated')
      setEditing(false)
    } catch (err) {
      gooeyToast.error('Could not update member', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  async function handleToggleStatus() {
    const next = member.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED'
    setPending(true)
    try {
      await setMemberStatusFn({ data: { memberId: member.id, status: next } })
      await router.invalidate()
      gooeyToast.success(
        `Member ${next === 'DISABLED' ? 'disabled' : 'reactivated'}`,
      )
    } catch (err) {
      gooeyToast.error('Could not update status', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  function toggleCohort(id: string) {
    setCohortIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  if (editing && canManage) {
    return (
      <tr className="border-t border-border bg-muted">
        <td className="px-4 py-3">
          <p className="m-0 font-semibold text-foreground">{member.name}</p>
          <p className="m-0 mt-0.5 text-xs text-muted-foreground">
            {member.email}
          </p>
        </td>
        <td className="px-4 py-3">
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="h-8 rounded border border-border bg-card text-foreground px-2 text-xs outline-none focus:border-primary"
          >
            <option value="">No role</option>
            {state.roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3">
          <select
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
            className="h-8 rounded border border-border bg-card text-foreground px-2 text-xs outline-none focus:border-primary"
          >
            <option value="">Unassigned</option>
            {state.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {state.cohorts.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-1 text-xs text-foreground"
              >
                <input
                  type="checkbox"
                  checked={cohortIds.includes(c.id)}
                  onChange={() => toggleCohort(c.id)}
                  className="rounded"
                />
                {c.name}
              </label>
            ))}
          </div>
        </td>
        <td className="px-4 py-3">
          <MemberStatusBadge status={member.status} />
        </td>
        <td className="px-4 py-3 text-right text-sm text-muted-foreground">
          {formatHours(stats?.thisWeekSeconds ?? 0)}
        </td>
        <td className="px-4 py-3 text-right text-sm text-muted-foreground">
          {formatHours(stats?.totalSeconds ?? 0)}
        </td>
        <td className="px-4 py-3 text-right text-sm text-muted-foreground">
          {formatHours(stats?.billableSeconds ?? 0)}
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="h-7 rounded bg-primary px-3 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground"
            >
              {pending ? '…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-7 rounded border border-border px-2 text-xs text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <>
      <tr className="border-t border-border">
        <td className="px-4 py-3">
          <p className="m-0 font-semibold text-foreground">{member.name}</p>
          <p className="m-0 mt-1 text-xs text-muted-foreground">{member.email}</p>
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor:
                  state.roles.find((r) => r.id === member.workspaceRoleId)
                    ?.color ?? '#94a3b8',
              }}
            />
            {member.roleName}
          </span>
        </td>
        <td className="px-4 py-3 text-foreground">
          {department?.name || 'Unassigned'}
        </td>
        <td className="px-4 py-3 text-foreground">
          {cohorts.map((c) => c.name).join(', ') || 'None'}
        </td>
        <td className="px-4 py-3">
          <MemberStatusBadge status={member.status} />
        </td>
        {canManage && (
          <>
            <td className="px-4 py-3 text-right text-sm tabular-nums text-muted-foreground">
              {formatHours(stats?.thisWeekSeconds ?? 0)}
            </td>
            <td className="px-4 py-3 text-right text-sm tabular-nums text-muted-foreground">
              {formatHours(stats?.totalSeconds ?? 0)}
            </td>
            <td className="px-4 py-3 text-right text-sm tabular-nums text-muted-foreground">
              {formatHours(stats?.billableSeconds ?? 0)}
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <IconBtn
                  onClick={() => setShowAnalytics((v) => !v)}
                  title="View analytics"
                  className={showAnalytics ? 'bg-primary/10 text-primary' : ''}
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn onClick={() => setEditing(true)} title="Edit member">
                  <Pencil className="h-3.5 w-3.5" />
                </IconBtn>
                {!isSelf && (
                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    disabled={pending}
                    className={`h-6 rounded px-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                      member.status === 'DISABLED'
                        ? 'bg-primary/15 text-primary hover:bg-primary/25'
                        : 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                    }`}
                  >
                    {member.status === 'DISABLED' ? 'Reactivate' : 'Disable'}
                  </button>
                )}
              </div>
            </td>
          </>
        )}
      </tr>

      {/* ── Expandable analytics panel ── */}
      {canManage && showAnalytics && (
        <tr className="border-t border-border bg-muted/40">
          <td colSpan={9} className="px-5 pb-5 pt-3">
            <p className="m-0 mb-3 text-xs font-bold uppercase tracking-wide text-primary">
              Analytics — {member.name}
            </p>

            {/* Stats chips */}
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                { label: 'This week', value: formatHours(stats?.thisWeekSeconds ?? 0) },
                { label: 'This month', value: formatHours(stats?.thisMonthSeconds ?? 0) },
                { label: 'All time', value: formatHours(stats?.totalSeconds ?? 0) },
                { label: 'Billable', value: formatHours(stats?.billableSeconds ?? 0) },
                { label: 'Entries', value: String(stats?.entryCount ?? 0) },
              ].map((chip) => (
                <div
                  key={chip.label}
                  className="rounded-lg border border-border bg-card px-3 py-2.5"
                >
                  <p className="m-0 text-xs text-muted-foreground">{chip.label}</p>
                  <p className="m-0 mt-0.5 text-lg font-bold text-foreground">
                    {chip.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Top projects */}
            {stats && stats.topProjects.length > 0 ? (
              <div>
                <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Top projects
                </p>
                <div className="grid gap-2">
                  {stats.topProjects.map(({ projectId, seconds }) => {
                    const project = state.projects.find((p) => p.id === projectId)
                    const pct =
                      stats.totalSeconds > 0
                        ? Math.round((seconds / stats.totalSeconds) * 100)
                        : 0
                    return (
                      <div key={projectId} className="flex items-center gap-3">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: project?.color ?? '#94a3b8' }}
                        />
                        <span className="w-32 shrink-0 truncate text-sm text-foreground">
                          {project?.name ?? 'Unknown'}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                          <div
                            className="h-2 rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {formatHours(seconds)}
                        </span>
                        <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {pct}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="m-0 text-sm text-muted-foreground">
                No tracked entries yet.
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// ─── CatalogsScreen ───────────────────────────────────────────────────────────

export function CatalogsScreen({ state }: { state: TrackerState }) {
  const currentMember = state.members.find(
    (m) => m.id === state.currentMemberId,
  )!
  const canManage =
    currentMember.permissionLevel === 'OWNER' ||
    currentMember.permissionLevel === 'ADMIN'

  return (
    <Page title="Catalogs" eyebrow="Controlled tagging">
      <div className="grid gap-4 lg:grid-cols-2">
        <RolesManager state={state} canManage={canManage} />
        <ProjectsManager state={state} canManage={canManage} />
        <TagsManager state={state} canManage={canManage} />
        <DepartmentsManager state={state} canManage={canManage} />
        <CohortsManager state={state} canManage={canManage} />
      </div>
    </Page>
  )
}

const PERMISSION_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
}

function RolesManager({
  state,
  canManage,
}: {
  state: TrackerState
  canManage: boolean
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [permissionLevel, setPermissionLevel] = useState<
    'OWNER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
  >('EMPLOYEE')
  const [color, setColor] = useState('#6366f1')
  const [pending, setPending] = useState(false)

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await createWorkspaceRoleFn({ data: { name, permissionLevel, color } })
      await router.invalidate()
      gooeyToast.success('Role created', {
        description: `"${name}" is now available.`,
      })
      setName('')
      setPermissionLevel('EMPLOYEE')
      setColor('#6366f1')
      setShowForm(false)
    } catch (err) {
      gooeyToast.error('Could not create role', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <SectionCard
      title="Roles"
      action={
        canManage ? (
          <button
            type="button"
            onClick={() => setShowForm((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:brightness-110"
          >
            {showForm ? (
              <X className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {showForm ? 'Cancel' : 'New role'}
          </button>
        ) : undefined
      }
    >
      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Role name (e.g. Senior Engineer)"
            required
            className="h-9 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <select
              value={permissionLevel}
              onChange={(e) =>
                setPermissionLevel(
                  e.target.value as 'OWNER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE',
                )
              }
              className="h-9 flex-1 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
            >
              <option value="EMPLOYEE">Employee (can track time)</option>
              <option value="MANAGER">Manager (can view team)</option>
              <option value="ADMIN">Admin (can manage workspace)</option>
              <option value="OWNER">Owner (full access)</option>
            </select>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-lg border border-border p-1"
              title="Role color"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="h-9 rounded-lg bg-primary text-sm font-bold text-primary-foreground transition-colors hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground"
          >
            {pending ? 'Creating…' : 'Create role'}
          </button>
        </form>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {state.roles.map((role) => (
          <div
            key={role.id}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2"
          >
            <span
              className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: role.color }}
            />
            <span className="text-sm font-semibold text-foreground">
              {role.name}
            </span>
            <span className="ml-1 text-xs text-muted-foreground">
              {PERMISSION_LABELS[role.permissionLevel]}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function ProjectsManager({
  state,
  canManage,
}: {
  state: TrackerState
  canManage: boolean
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#2563eb')
  const [pending, setPending] = useState(false)
  const [archivingId, setArchivingId] = useState<string | null>(null)

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await createProjectFn({ data: { name, color } })
      await router.invalidate()
      gooeyToast.success('Project created')
      setName('')
      setColor('#2563eb')
      setShowForm(false)
    } catch (err) {
      gooeyToast.error('Could not create project', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  async function handleArchive(id: string, projectName: string) {
    setArchivingId(id)
    try {
      await archiveProjectFn({ data: { id } })
      await router.invalidate()
      gooeyToast.success(`"${projectName}" archived`)
    } catch (err) {
      gooeyToast.error('Could not archive project', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setArchivingId(null)
    }
  }

  return (
    <SectionCard
      title="Projects"
      action={
        canManage ? (
          <button
            type="button"
            onClick={() => setShowForm((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:brightness-110"
          >
            {showForm ? (
              <X className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {showForm ? 'Cancel' : 'New project'}
          </button>
        ) : undefined
      }
    >
      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            required
            className="h-9 flex-1 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded-lg border border-border p-1"
            title="Project color"
          />
          <button
            type="submit"
            disabled={pending}
            className="h-9 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground"
          >
            {pending ? '…' : 'Add'}
          </button>
        </form>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {state.projects.map((p) => (
          <div
            key={p.id}
            className="group flex items-center gap-1.5 rounded-lg border border-border px-3 py-2"
          >
            <span
              className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-sm font-semibold text-foreground">
              {p.name}
            </span>
            {canManage && (
              <IconBtn
                onClick={() => handleArchive(p.id, p.name)}
                title="Archive project"
                variant="danger"
              >
                <Trash2
                  className={`h-3 w-3 opacity-0 group-hover:opacity-100 ${archivingId === p.id ? 'opacity-100' : ''}`}
                />
              </IconBtn>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function TagsManager({
  state,
  canManage,
}: {
  state: TrackerState
  canManage: boolean
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#14b8a6')
  const [pending, setPending] = useState(false)
  const [archivingId, setArchivingId] = useState<string | null>(null)

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await createTagFn({ data: { name, color } })
      await router.invalidate()
      gooeyToast.success('Tag created')
      setName('')
      setColor('#14b8a6')
      setShowForm(false)
    } catch (err) {
      gooeyToast.error('Could not create tag', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  async function handleArchive(id: string, tagName: string) {
    setArchivingId(id)
    try {
      await archiveTagFn({ data: { id } })
      await router.invalidate()
      gooeyToast.success(`"${tagName}" archived`)
    } catch (err) {
      gooeyToast.error('Could not archive tag', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setArchivingId(null)
    }
  }

  return (
    <SectionCard
      title="Tags"
      action={
        canManage ? (
          <button
            type="button"
            onClick={() => setShowForm((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:brightness-110"
          >
            {showForm ? (
              <X className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {showForm ? 'Cancel' : 'New tag'}
          </button>
        ) : undefined
      }
    >
      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tag name"
            required
            className="h-9 flex-1 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded-lg border border-border p-1"
            title="Tag color"
          />
          <button
            type="submit"
            disabled={pending}
            className="h-9 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground"
          >
            {pending ? '…' : 'Add'}
          </button>
        </form>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {state.tags.map((t) => (
          <div
            key={t.id}
            className="group flex items-center gap-1.5 rounded-lg border border-border px-3 py-2"
          >
            <span
              className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            <span className="text-sm font-semibold text-foreground">
              {t.name}
            </span>
            {canManage && (
              <IconBtn
                onClick={() => handleArchive(t.id, t.name)}
                title="Archive tag"
                variant="danger"
              >
                <Trash2
                  className={`h-3 w-3 opacity-0 group-hover:opacity-100 ${archivingId === t.id ? 'opacity-100' : ''}`}
                />
              </IconBtn>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function DepartmentsManager({
  state,
  canManage,
}: {
  state: TrackerState
  canManage: boolean
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [pending, setPending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await createDepartmentFn({
        data: { name, description: description || undefined, color },
      })
      await router.invalidate()
      gooeyToast.success('Department created')
      setName('')
      setDescription('')
      setColor('#6366f1')
      setShowForm(false)
    } catch (err) {
      gooeyToast.error('Could not create department', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  async function handleDelete(id: string, deptName: string) {
    setDeletingId(id)
    try {
      await deleteDepartmentFn({ data: { id } })
      await router.invalidate()
      gooeyToast.success(`"${deptName}" deleted`)
    } catch (err) {
      gooeyToast.error('Could not delete department', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <SectionCard
      title="Departments"
      action={
        canManage ? (
          <button
            type="button"
            onClick={() => setShowForm((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:brightness-110"
          >
            {showForm ? (
              <X className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {showForm ? 'Cancel' : 'New department'}
          </button>
        ) : undefined
      }
    >
      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid gap-2">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Department name"
              required
              className="h-9 flex-1 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
            />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-lg border border-border p-1"
              title="Department color"
            />
          </div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="h-9 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={pending}
            className="h-9 rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground"
          >
            {pending ? 'Creating…' : 'Create department'}
          </button>
        </form>
      )}
      <div className="mt-4 flex flex-col gap-2">
        {state.departments.map((dept) => (
          <div
            key={dept.id}
            className="group flex items-center justify-between rounded-lg border border-border px-3 py-2"
          >
            <span className="text-sm font-semibold text-foreground">
              {dept.name}
            </span>
            {canManage && (
              <IconBtn
                onClick={() => handleDelete(dept.id, dept.name)}
                title="Delete department"
                variant="danger"
              >
                <Trash2
                  className={`h-3.5 w-3.5 opacity-0 group-hover:opacity-100 ${deletingId === dept.id ? 'opacity-100' : ''}`}
                />
              </IconBtn>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function CohortsManager({
  state,
  canManage,
}: {
  state: TrackerState
  canManage: boolean
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await createCohortFn({ data: { name } })
      await router.invalidate()
      gooeyToast.success('Cohort created')
      setName('')
      setShowForm(false)
    } catch (err) {
      gooeyToast.error('Could not create cohort', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  async function handleDelete(id: string, cohortName: string) {
    setDeletingId(id)
    try {
      await deleteCohortFn({ data: { id } })
      await router.invalidate()
      gooeyToast.success(`"${cohortName}" deleted`)
    } catch (err) {
      gooeyToast.error('Could not delete cohort', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <SectionCard
      title="Groups / cohorts"
      action={
        canManage ? (
          <button
            type="button"
            onClick={() => setShowForm((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:brightness-110"
          >
            {showForm ? (
              <X className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {showForm ? 'Cancel' : 'New cohort'}
          </button>
        ) : undefined
      }
    >
      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cohort name"
            required
            className="h-9 flex-1 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={pending}
            className="h-9 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground"
          >
            {pending ? '…' : 'Add'}
          </button>
        </form>
      )}
      <div className="mt-4 flex flex-col gap-2">
        {state.cohorts.map((cohort) => (
          <div
            key={cohort.id}
            className="group flex items-center justify-between rounded-lg border border-border px-3 py-2"
          >
            <span className="text-sm font-semibold text-foreground">
              {cohort.name}
            </span>
            {canManage && (
              <IconBtn
                onClick={() => handleDelete(cohort.id, cohort.name)}
                title="Delete cohort"
                variant="danger"
              >
                <Trash2
                  className={`h-3.5 w-3.5 opacity-0 group-hover:opacity-100 ${deletingId === cohort.id ? 'opacity-100' : ''}`}
                />
              </IconBtn>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ─── SettingsScreen ───────────────────────────────────────────────────────────

export function SettingsScreen({ state }: { state: TrackerState }) {
  const router = useRouter()
  const currentMember = state.members.find(
    (m) => m.id === state.currentMemberId,
  )!
  const isOwner = currentMember.permissionLevel === 'OWNER'

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(state.workspace.name)
  const [timezone, setTimezone] = useState(state.workspace.timezone)
  const [pending, setPending] = useState(false)

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await updateWorkspaceSettingsFn({ data: { name, timezone } })
      await router.invalidate()
      gooeyToast.success('Settings saved')
      setEditing(false)
    } catch (err) {
      gooeyToast.error('Could not save settings', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Page title="Workspace settings" eyebrow="Company workspace">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        {editing ? (
          <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold text-foreground">
              Workspace name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-foreground">
              Timezone
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. Asia/Manila"
                required
                className="h-9 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={pending}
                className="h-9 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground"
              >
                {pending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setName(state.workspace.name)
                  setTimezone(state.workspace.timezone)
                }}
                className="h-9 rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Info label="Workspace" value={state.workspace.name} />
              <Info label="Timezone" value={state.workspace.timezone} />
              <Info
                label="Role model"
                value="Owner / Admin / Manager / Employee"
              />
            </dl>
            {isOwner && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-accent"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit settings
              </button>
            )}
          </>
        )}
      </section>
    </Page>
  )
}

// ─── Pending Invites Panel ────────────────────────────────────────────────────

function PendingInvitesPanel() {
  const router = useRouter()
  const { data: invites = [], refetch } = useQuery({
    queryKey: ['workspace-invites'],
    queryFn: () => listWorkspaceInvitesFn(),
    staleTime: 30 * 1000,
  })
  const [busyId, setBusyId] = useState<string | null>(null)

  if (invites.length === 0) return null

  async function handleResend(id: string) {
    setBusyId(id)
    try {
      await resendWorkspaceInviteFn({ data: { inviteId: id } })
      await refetch()
      gooeyToast.success('Invitation resent')
    } catch (err) {
      gooeyToast.error('Could not resend', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setBusyId(null)
    }
  }

  async function handleRevoke(id: string) {
    setBusyId(id)
    try {
      await revokeWorkspaceInviteFn({ data: { inviteId: id } })
      await refetch()
      await router.invalidate()
      gooeyToast.success('Invitation revoked')
    } catch (err) {
      gooeyToast.error('Could not revoke', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border p-4">
        <h2 className="m-0 text-lg font-bold text-foreground">
          Pending invitations ({invites.length})
        </h2>
        <p className="m-0 mt-1 text-sm text-muted-foreground">
          These people have been sent an invite link but have not joined yet.
        </p>
      </div>
      <ul className="m-0 grid list-none gap-0 p-0">
        {invites.map((inv) => {
          const expires = new Date(inv.expiresAt)
          const isExpired = expires < new Date()
          return (
            <li
              key={inv.id}
              className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-sm font-semibold text-foreground">
                  {inv.email}
                </p>
                <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                  {inv.roleName ?? 'Member'}
                  {inv.departmentName ? ` · ${inv.departmentName}` : ''}
                  {' · '}
                  {isExpired ? (
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      Expired {expires.toLocaleDateString()}
                    </span>
                  ) : (
                    <>Expires {expires.toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleResend(inv.id)}
                  disabled={busyId === inv.id}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                >
                  Resend
                </button>
                <button
                  type="button"
                  onClick={() => void handleRevoke(inv.id)}
                  disabled={busyId === inv.id}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                >
                  Revoke
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
