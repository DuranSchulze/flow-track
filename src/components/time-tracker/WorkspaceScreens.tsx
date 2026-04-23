import { useMemo, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  KeyRound,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
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
  updateProfileFn,
  updateWorkspaceSettingsFn,
} from '#/lib/server/tracker'
import type { TrackerState } from '#/lib/time-tracker/types'
import { ThemeSection } from '#/components/settings/ThemeSection'
import { InviteMemberForm } from './InviteMemberForm'
import { MembersTable } from './MembersTable'
import type { MemberStat } from './MembersTable'
import { PendingInvitesPanel } from './PendingInvitesPanel'
import { WorkspaceBillingPanel } from './WorkspaceBillingPanel'
import {
  getWorkspaceMembersSummary,
  WorkspaceMembersSummary,
} from './WorkspaceMembersSummary'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

type SelfProfileData = {
  user: {
    id: string
    name: string
    email: string
    image: string | null
  }
  profile: {
    firstName: string
    middleName: string
    lastName: string
    contactNumber: string
    birthDate: string
    gender: string
    maritalStatus: string
  } | null
  address: {
    buildingNo: string
    street: string
    city: string
    province: string
    postalCode: string
    country: string
  } | null
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
    <div className="grid min-w-0 gap-6">
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

export function ProfileScreen({
  state,
  selfProfile,
}: {
  state: TrackerState
  selfProfile: SelfProfileData
}) {
  const router = useRouter()
  const member = state.members.find((m) => m.id === state.currentMemberId)!
  const department = state.departments.find((d) => d.id === member.departmentId)
  const cohorts = state.cohorts.filter((c) => member.cohortIds.includes(c.id))
  const roleColor =
    state.roles.find((r) => r.id === member.workspaceRoleId)?.color ?? '#94a3b8'
  const [name, setName] = useState(selfProfile.user.name)
  const [firstName, setFirstName] = useState(
    selfProfile.profile?.firstName || member.name.split(' ')[0] || member.email,
  )
  const [middleName, setMiddleName] = useState(
    selfProfile.profile?.middleName ?? '',
  )
  const [lastName, setLastName] = useState(
    selfProfile.profile?.lastName ||
      member.name.split(' ').slice(1).join(' ') ||
      member.name,
  )
  const [contactNumber, setContactNumber] = useState(
    selfProfile.profile?.contactNumber ?? '',
  )
  const [birthDate, setBirthDate] = useState(
    selfProfile.profile?.birthDate ?? '',
  )
  const [gender, setGender] = useState(selfProfile.profile?.gender ?? '')
  const [maritalStatus, setMaritalStatus] = useState(
    selfProfile.profile?.maritalStatus ?? '',
  )
  const [avatarUrl, setAvatarUrl] = useState(selfProfile.user.image ?? '')
  const [address, setAddress] = useState(
    selfProfile.address ?? {
      buildingNo: '',
      street: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Philippines',
    },
  )
  const [savePending, setSavePending] = useState(false)

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setSavePending(true)
    try {
      await updateProfileFn({
        data: {
          name,
          firstName,
          middleName,
          lastName,
          contactNumber: contactNumber || undefined,
          birthDate,
          gender,
          maritalStatus,
          avatarUrl,
          address,
        },
      })
      await router.invalidate()
      gooeyToast.success('Profile updated')
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
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="grid h-fit gap-4">
          <section className="rounded-lg border border-border bg-card p-6 text-center shadow-sm">
            <div className="mb-4 flex justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-muted"
                />
              ) : (
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-primary-foreground ring-4 ring-muted"
                  style={{ backgroundColor: roleColor }}
                >
                  {initials}
                </div>
              )}
            </div>
            <h2 className="m-0 text-2xl font-bold text-foreground">{name}</h2>
            <p className="m-0 mt-1 text-sm text-muted-foreground">
              {member.email}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-primary-foreground"
                style={{ backgroundColor: roleColor }}
              >
                {member.roleName}
              </span>
              <MemberStatusBadge status={member.status} />
            </div>
            <dl className="mt-5 grid gap-4 text-left">
              <Info
                label="Department"
                value={department?.name || 'Unassigned'}
              />
              <Info
                label="Groups / cohorts"
                value={cohorts.map((c) => c.name).join(', ') || 'None'}
              />
            </dl>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPwDialog(true)}
              className="mt-5 w-full"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Change password
            </Button>
          </section>
          <ThemeSection />
        </div>

        <form onSubmit={handleSave} className="grid gap-4">
          <SectionCard title="Account">
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Label className="grid gap-2">
                Display name
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Label>
              <Label className="grid gap-2">
                Profile picture URL
                <Input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                />
              </Label>
            </div>
          </SectionCard>

          <SectionCard title="Personal">
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Label className="grid gap-2">
                First name
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </Label>
              <Label className="grid gap-2">
                Middle name
                <Input
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </Label>
              <Label className="grid gap-2">
                Last name
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </Label>
              <Label className="grid gap-2">
                Contact number
                <Input
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                />
              </Label>
              <Label className="grid gap-2">
                Birth date
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </Label>
              <ProfileSelect
                label="Gender"
                value={gender}
                onChange={setGender}
                placeholder="Not set"
                options={['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY']}
              />
              <ProfileSelect
                label="Marital status"
                value={maritalStatus}
                onChange={setMaritalStatus}
                placeholder="Not set"
                options={[
                  'SINGLE',
                  'MARRIED',
                  'SEPARATED',
                  'WIDOWED',
                  'DIVORCED',
                ]}
              />
            </div>
          </SectionCard>

          <SectionCard title="Address">
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ['buildingNo', 'Building no.'],
                  ['street', 'Street'],
                  ['city', 'City'],
                  ['province', 'Province'],
                  ['postalCode', 'Postal code'],
                  ['country', 'Country'],
                ] as const
              ).map(([key, label]) => (
                <Label key={key} className="grid gap-2">
                  {label}
                  <Input
                    value={address[key]}
                    onChange={(e) =>
                      setAddress((current) => ({
                        ...current,
                        [key]: e.target.value,
                      }))
                    }
                  />
                </Label>
              ))}
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <Button type="submit" disabled={savePending}>
              {savePending ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </form>
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

function ProfileSelect({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: string[]
}) {
  return (
    <Label className="grid gap-2">
      {label}
      <Select
        value={value || 'NONE'}
        onValueChange={(next) => onChange(next === 'NONE' ? '' : next)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NONE">{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option.replaceAll('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Label>
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
  const currentMember = state.members.find(
    (m) => m.id === state.currentMemberId,
  )!
  const canManage =
    currentMember.permissionLevel === 'OWNER' ||
    currentMember.permissionLevel === 'ADMIN'

  const [showForm, setShowForm] = useState(false)
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

  const workspaceSummary = useMemo(() => {
    return canManage ? getWorkspaceMembersSummary(memberStats) : null
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

  return (
    <Page title="Workspace members" eyebrow="Owner/Admin">
      {canManage && workspaceSummary && (
        <WorkspaceMembersSummary summary={workspaceSummary} />
      )}

      {canManage && <WorkspaceBillingPanel workspace={state.workspace} />}

      {canManage && <PendingInvitesPanel />}

      <section className="min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
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
          <InviteMemberForm
            roles={state.roles}
            departments={state.departments}
            onInvited={() => setShowForm(false)}
          />
        )}

        {/* ── Search & filter bar ── */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                resetPage()
              }}
              className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value)
              resetPage()
            }}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">All roles</option>
            {state.roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            value={filterDept}
            onChange={(e) => {
              setFilterDept(e.target.value)
              resetPage()
            }}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">All departments</option>
            {state.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              resetPage()
            }}
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

        <MembersTable
          members={pagedMembers}
          state={state}
          canManage={canManage}
          statsMap={statsMap}
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={filteredMembers.length}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </section>
    </Page>
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
