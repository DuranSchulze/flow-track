import { useState } from 'react'
import { formatHours } from '#/lib/time-tracker/store'
import { useRouter } from '@tanstack/react-router'
import { Download, FileSpreadsheet, FileText, Pencil, Plus, Trash2, UserPlus, X } from 'lucide-react'
import { gooeyToast } from 'goey-toast'
import {
  archiveProjectFn,
  archiveTagFn,
  createCohortFn,
  createDepartmentFn,
  createProjectFn,
  createTagFn,
  createWorkspaceMemberFn,
  createWorkspaceRoleFn,
  deleteCohortFn,
  deleteDepartmentFn,
  getWorkspaceReportFn,
  setMemberStatusFn,
  updateProfileFn,
  updateWorkspaceMemberFn,
  updateWorkspaceSettingsFn,
} from '#/lib/server/tracker'
import type { ReportRow, TrackerState } from '#/lib/time-tracker/types'

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
        <p className="m-0 text-sm font-semibold text-teal-700">{eyebrow}</p>
        <h1 className="m-0 mt-1 text-2xl font-bold tracking-tight text-slate-950">
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
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="m-0 mt-1 text-base font-bold text-slate-950">{value}</dd>
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
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="m-0 text-lg font-bold text-slate-950">{title}</h2>
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
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  variant?: 'default' | 'danger'
}) {
  const cls =
    variant === 'danger'
      ? 'text-red-500 hover:text-red-700'
      : 'text-slate-400 hover:text-slate-700'
  return (
    <button type="button" onClick={onClick} title={title} className={`p-1 ${cls}`}>
      {children}
    </button>
  )
}

function MemberStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-teal-100 text-teal-800',
    INVITED: 'bg-amber-100 text-amber-800',
    DISABLED: 'bg-red-100 text-red-800',
  }
  return (
    <span
      className={`rounded-lg px-2 py-1 text-xs font-bold ${styles[status] ?? 'bg-slate-100 text-slate-700'}`}
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

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(member.name)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await updateProfileFn({ data: { name, firstName, lastName, contactNumber: contactNumber || undefined } })
      await router.invalidate()
      gooeyToast.success('Profile updated')
      setEditing(false)
    } catch (err) {
      gooeyToast.error('Could not update profile', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Page title="Profile" eyebrow="Account">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-lg bg-slate-950 text-xl font-bold text-white">
              {member.name.charAt(0)}
            </div>
            <div>
              <h2 className="m-0 text-xl font-bold text-slate-950">{member.name}</h2>
              <p className="m-0 mt-1 text-sm text-slate-500">{member.email}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {editing ? (
            <form onSubmit={handleSave} className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                  Display name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                  Contact number
                  <input
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="Optional"
                    className="h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                  First name
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                  Last name
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="h-9 rounded-lg bg-teal-700 px-4 text-sm font-bold text-white transition-colors hover:bg-teal-800 disabled:bg-slate-300"
                >
                  {pending ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="h-9 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Info label="Role" value={member.roleName} />
                <Info label="Status" value={member.status} />
                <Info label="Department" value={department?.name || 'Unassigned'} />
                <Info
                  label="Groups / cohorts"
                  value={cohorts.map((c) => c.name).join(', ') || 'None'}
                />
              </dl>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit profile
              </button>
            </>
          )}
        </section>
      </div>
    </Page>
  )
}

// ─── MembersScreen ────────────────────────────────────────────────────────────

export function MembersScreen({ state }: { state: TrackerState }) {
  const router = useRouter()
  const currentMember = state.members.find((m) => m.id === state.currentMemberId)!
  const canManage =
    currentMember.permissionLevel === 'OWNER' || currentMember.permissionLevel === 'ADMIN'

  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [workspaceRoleId, setWorkspaceRoleId] = useState(state.roles[0]?.id ?? '')
  const [departmentId, setDepartmentId] = useState('')
  const [pending, setPending] = useState(false)

  async function handleAddMember(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await createWorkspaceMemberFn({
        data: { email, workspaceRoleId, departmentId: departmentId || undefined },
      })
      await router.invalidate()
      gooeyToast.success('Member added', {
        description: `${email} has been invited to the workspace.`,
      })
      setEmail('')
      setWorkspaceRoleId(state.roles[0]?.id ?? '')
      setDepartmentId('')
      setShowForm(false)
    } catch (err) {
      gooeyToast.error('Could not add member', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Page title="Workspace members" eyebrow="Owner/Admin">
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="m-0 text-lg font-bold text-slate-950">Managed user list</h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Employees join this private workspace when their account email matches this list.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
              {showForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {showForm ? 'Cancel' : 'Add member'}
            </button>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={handleAddMember}
            className="grid gap-4 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_160px_200px_auto]"
          >
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="employee@company.com"
                required
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-600"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              Role
              <select
                value={workspaceRoleId}
                onChange={(e) => setWorkspaceRoleId(e.target.value)}
                required
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-600"
              >
                {state.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              Department
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-600"
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
                className="h-10 rounded-lg bg-teal-700 px-4 text-sm font-bold text-white transition-colors hover:bg-teal-800 disabled:bg-slate-300"
              >
                {pending ? 'Adding…' : 'Add'}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Groups / cohorts</th>
                <th className="px-4 py-3">Status</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {state.members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  state={state}
                  canManage={canManage}
                  isSelf={member.id === state.currentMemberId}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Page>
  )
}

function MemberRow({
  member,
  state,
  canManage,
  isSelf,
}: {
  member: TrackerState['members'][number]
  state: TrackerState
  canManage: boolean
  isSelf: boolean
}) {
  const router = useRouter()
  const department = state.departments.find((d) => d.id === member.departmentId)
  const cohorts = state.cohorts.filter((c) => member.cohortIds.includes(c.id))

  const [editing, setEditing] = useState(false)
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
      gooeyToast.success(`Member ${next === 'DISABLED' ? 'disabled' : 'reactivated'}`)
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
      <tr className="border-t border-slate-100 bg-slate-50">
        <td className="px-4 py-3">
          <p className="m-0 font-semibold text-slate-950">{member.name}</p>
          <p className="m-0 mt-0.5 text-xs text-slate-500">{member.email}</p>
        </td>
        <td className="px-4 py-3">
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="h-8 rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-teal-600"
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
            className="h-8 rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-teal-600"
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
              <label key={c.id} className="flex cursor-pointer items-center gap-1 text-xs">
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
        <td className="px-4 py-3">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="h-7 rounded bg-teal-700 px-3 text-xs font-bold text-white hover:bg-teal-800 disabled:bg-slate-300"
            >
              {pending ? '…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-7 rounded border border-slate-300 px-2 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3">
        <p className="m-0 font-semibold text-slate-950">{member.name}</p>
        <p className="m-0 mt-1 text-xs text-slate-500">{member.email}</p>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor:
                state.roles.find((r) => r.id === member.workspaceRoleId)?.color ?? '#94a3b8',
            }}
          />
          {member.roleName}
        </span>
      </td>
      <td className="px-4 py-3">{department?.name || 'Unassigned'}</td>
      <td className="px-4 py-3">
        {cohorts.map((c) => c.name).join(', ') || 'None'}
      </td>
      <td className="px-4 py-3">
        <MemberStatusBadge status={member.status} />
      </td>
      {canManage && (
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
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
                    ? 'bg-teal-100 text-teal-800 hover:bg-teal-200'
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
              >
                {member.status === 'DISABLED' ? 'Reactivate' : 'Disable'}
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  )
}

// ─── CatalogsScreen ───────────────────────────────────────────────────────────

export function CatalogsScreen({ state }: { state: TrackerState }) {
  const currentMember = state.members.find((m) => m.id === state.currentMemberId)!
  const level = currentMember.permissionLevel
  const canManageAll = level === 'OWNER' || level === 'ADMIN'
  const canManageCatalogs = canManageAll || level === 'CATALOG_MANAGER'

  return (
    <Page title="Catalogs" eyebrow="Controlled tagging">
      <div className="grid gap-4 lg:grid-cols-2">
        <RolesManager state={state} canManage={canManageAll} />
        <ProjectsManager state={state} canManage={canManageCatalogs} />
        <TagsManager state={state} canManage={canManageCatalogs} />
        <DepartmentsManager state={state} canManage={canManageAll} departmentTotals={state.departmentTotals} />
        <CohortsManager state={state} canManage={canManageAll} />
      </div>
    </Page>
  )
}

const PERMISSION_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  CATALOG_MANAGER: 'Catalog Manager',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
}

function RolesManager({ state, canManage }: { state: TrackerState; canManage: boolean }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [permissionLevel, setPermissionLevel] = useState<
    'OWNER' | 'ADMIN' | 'CATALOG_MANAGER' | 'MANAGER' | 'EMPLOYEE'
  >('EMPLOYEE')
  const [color, setColor] = useState('#6366f1')
  const [pending, setPending] = useState(false)

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await createWorkspaceRoleFn({ data: { name, permissionLevel, color } })
      await router.invalidate()
      gooeyToast.success('Role created', { description: `"${name}" is now available.` })
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-slate-800"
          >
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
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
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
          />
          <div className="flex gap-2">
            <select
              value={permissionLevel}
              onChange={(e) =>
                setPermissionLevel(
                  e.target.value as 'OWNER' | 'ADMIN' | 'CATALOG_MANAGER' | 'MANAGER' | 'EMPLOYEE',
                )
              }
              className="h-9 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
            >
              <option value="EMPLOYEE">Employee (can track time)</option>
              <option value="MANAGER">Manager (can view team)</option>
              <option value="CATALOG_MANAGER">Catalog Manager (can manage projects &amp; tags)</option>
              <option value="ADMIN">Admin (can manage workspace)</option>
              <option value="OWNER">Owner (full access)</option>
            </select>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-lg border border-slate-300 p-1"
              title="Role color"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="h-9 rounded-lg bg-teal-700 text-sm font-bold text-white transition-colors hover:bg-teal-800 disabled:bg-slate-300"
          >
            {pending ? 'Creating…' : 'Create role'}
          </button>
        </form>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {state.roles.map((role) => (
          <div
            key={role.id}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2"
          >
            <span
              className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: role.color }}
            />
            <span className="text-sm font-semibold text-slate-700">{role.name}</span>
            <span className="ml-1 text-xs text-slate-400">{PERMISSION_LABELS[role.permissionLevel]}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function ProjectsManager({ state, canManage }: { state: TrackerState; canManage: boolean }) {
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-slate-800"
          >
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
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
            className="h-9 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded-lg border border-slate-300 p-1"
            title="Project color"
          />
          <button
            type="submit"
            disabled={pending}
            className="h-9 rounded-lg bg-teal-700 px-3 text-sm font-bold text-white hover:bg-teal-800 disabled:bg-slate-300"
          >
            {pending ? '…' : 'Add'}
          </button>
        </form>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {state.projects.map((p) => (
          <div
            key={p.id}
            className="group flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2"
          >
            <span
              className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-sm font-semibold text-slate-700">{p.name}</span>
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

function TagsManager({ state, canManage }: { state: TrackerState; canManage: boolean }) {
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-slate-800"
          >
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
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
            className="h-9 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded-lg border border-slate-300 p-1"
            title="Tag color"
          />
          <button
            type="submit"
            disabled={pending}
            className="h-9 rounded-lg bg-teal-700 px-3 text-sm font-bold text-white hover:bg-teal-800 disabled:bg-slate-300"
          >
            {pending ? '…' : 'Add'}
          </button>
        </form>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {state.tags.map((t) => (
          <div
            key={t.id}
            className="group flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2"
          >
            <span
              className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            <span className="text-sm font-semibold text-slate-700">{t.name}</span>
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
  departmentTotals,
}: {
  state: TrackerState
  canManage: boolean
  departmentTotals?: Record<string, number>
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
      await createDepartmentFn({ data: { name, description: description || undefined, color } })
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-slate-800"
          >
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
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
              className="h-9 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
            />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-lg border border-slate-300 p-1"
              title="Department color"
            />
          </div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
          />
          <button
            type="submit"
            disabled={pending}
            className="h-9 rounded-lg bg-teal-700 text-sm font-bold text-white hover:bg-teal-800 disabled:bg-slate-300"
          >
            {pending ? 'Creating…' : 'Create department'}
          </button>
        </form>
      )}
      <div className="mt-4 flex flex-col gap-2">
        {state.departments.map((dept) => (
          <div
            key={dept.id}
            className="group flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
          >
            <span className="text-sm font-semibold text-slate-700">{dept.name}</span>
            <div className="flex items-center gap-3">
              {departmentTotals !== undefined && (
                <span className="text-xs font-medium text-slate-400" title="Total tracked hours">
                  {formatHours(departmentTotals[dept.id] ?? 0)}
                </span>
              )}
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
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function CohortsManager({ state, canManage }: { state: TrackerState; canManage: boolean }) {
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-slate-800"
          >
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
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
            className="h-9 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
          />
          <button
            type="submit"
            disabled={pending}
            className="h-9 rounded-lg bg-teal-700 px-3 text-sm font-bold text-white hover:bg-teal-800 disabled:bg-slate-300"
          >
            {pending ? '…' : 'Add'}
          </button>
        </form>
      )}
      <div className="mt-4 flex flex-col gap-2">
        {state.cohorts.map((cohort) => (
          <div
            key={cohort.id}
            className="group flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
          >
            <span className="text-sm font-semibold text-slate-700">{cohort.name}</span>
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

// ─── ReportScreen ─────────────────────────────────────────────────────────────

type ViewMode = 'day' | 'week' | 'month'

function getReportLabel(view: ViewMode, date: Date): string {
  if (view === 'day') {
    return date.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }
  if (view === 'week') {
    const start = new Date(date)
    const day = start.getDay()
    start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day))
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return `${start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  return date.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
}

function shiftDate(view: ViewMode, date: Date, direction: 1 | -1): Date {
  const next = new Date(date)
  if (view === 'day') next.setDate(next.getDate() + direction)
  else if (view === 'week') next.setDate(next.getDate() + direction * 7)
  else next.setMonth(next.getMonth() + direction)
  return next
}

async function exportCSV(rows: ReportRow[], label: string) {
  const { utils, writeFile } = await import('xlsx')
  const ws = utils.json_to_sheet(rows.map(rowToFlat))
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Report')
  writeFile(wb, `report-${label}.csv`, { bookType: 'csv' })
}

async function exportExcel(rows: ReportRow[], label: string) {
  const { utils, writeFile } = await import('xlsx')
  const headers = [['Date', 'Member', 'Department', 'Role', 'Task', 'Project', 'Tags', 'Hours', 'Billable', 'Notes']]
  const data = rows.map(rowToArray)
  const ws = utils.aoa_to_sheet([...headers, ...data])

  // Column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 18 },
    { wch: 35 }, { wch: 20 }, { wch: 25 }, { wch: 8 },
    { wch: 10 }, { wch: 30 },
  ]

  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Report')
  writeFile(wb, `report-${label}.xlsx`)
}

async function exportPDF(rows: ReportRow[], label: string) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(13)
  doc.text(`Time Report — ${label}`, 14, 14)

  autoTable(doc, {
    startY: 22,
    head: [['Date', 'Member', 'Department', 'Role', 'Task', 'Project', 'Tags', 'Hours', 'Billable', 'Notes']],
    body: rows.map(rowToArray),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 26 },
      2: { cellWidth: 22 },
      3: { cellWidth: 22 },
      4: { cellWidth: 38 },
      5: { cellWidth: 22 },
      6: { cellWidth: 28 },
      7: { cellWidth: 14 },
      8: { cellWidth: 14 },
      9: { cellWidth: 'auto' },
    },
  })

  doc.save(`report-${label}.pdf`)
}

function rowToFlat(r: ReportRow) {
  return {
    Date: r.date,
    Member: r.memberName,
    Department: r.department,
    Role: r.role,
    Task: r.task,
    Project: r.project,
    Tags: r.tags,
    Hours: r.hours,
    Billable: r.billable ? 'Yes' : 'No',
    Notes: r.notes,
  }
}

function rowToArray(r: ReportRow): (string | number)[] {
  return [r.date, r.memberName, r.department, r.role, r.task, r.project, r.tags, r.hours, r.billable ? 'Yes' : 'No', r.notes]
}

export function ReportScreen(_: { state: TrackerState }) {
  const [view, setView] = useState<ViewMode>('week')
  const [date, setDate] = useState(() => new Date())
  const [rows, setRows] = useState<ReportRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | 'pdf' | null>(null)

  const label = getReportLabel(view, date)
  const totalHours = rows ? rows.reduce((s, r) => s + r.hours, 0).toFixed(2) : null
  const billableHours = rows ? rows.filter((r) => r.billable).reduce((s, r) => s + r.hours, 0).toFixed(2) : null

  async function handleLoad() {
    setLoading(true)
    try {
      const data = await getWorkspaceReportFn({ data: { view, date: date.toISOString() } })
      setRows(data)
    } catch (err) {
      gooeyToast.error('Could not load report', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleExport(format: 'csv' | 'xlsx' | 'pdf') {
    if (!rows) return
    setExporting(format)
    try {
      const slug = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      if (format === 'csv') await exportCSV(rows, slug)
      else if (format === 'xlsx') await exportExcel(rows, slug)
      else await exportPDF(rows, slug)
      gooeyToast.success(`Exported as ${format.toUpperCase()}`)
    } catch (err) {
      gooeyToast.error('Export failed', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setExporting(null)
    }
  }

  return (
    <Page title="Reports" eyebrow="Workspace time export">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View selector */}
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => { setView(v); setRows(null) }}
              className={`px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                view === v
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <button
            type="button"
            onClick={() => { setDate(shiftDate(view, date, -1)); setRows(null) }}
            className="text-slate-500 hover:text-slate-950"
          >
            ‹
          </button>
          <span className="min-w-48 text-center text-sm font-semibold text-slate-700">{label}</span>
          <button
            type="button"
            onClick={() => { setDate(shiftDate(view, date, 1)); setRows(null) }}
            className="text-slate-500 hover:text-slate-950"
          >
            ›
          </button>
        </div>

        <button
          type="button"
          onClick={handleLoad}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:bg-slate-300"
        >
          {loading ? 'Loading…' : 'Load Report'}
        </button>
      </div>

      {/* Summary + export buttons */}
      {rows !== null && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-4 rounded-lg border border-slate-200 bg-white px-4 py-2.5">
            <span className="text-sm text-slate-500">
              Entries: <strong className="text-slate-900">{rows.length}</strong>
            </span>
            <span className="text-sm text-slate-500">
              Total: <strong className="text-slate-900">{totalHours}h</strong>
            </span>
            <span className="text-sm text-slate-500">
              Billable: <strong className="text-teal-700">{billableHours}h</strong>
            </span>
          </div>

          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={exporting !== null || rows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting === 'csv' ? 'Exporting…' : 'CSV'}
            </button>
            <button
              type="button"
              onClick={() => handleExport('xlsx')}
              disabled={exporting !== null || rows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {exporting === 'xlsx' ? 'Exporting…' : 'Excel'}
            </button>
            <button
              type="button"
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null || rows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <FileText className="h-3.5 w-3.5" />
              {exporting === 'pdf' ? 'Exporting…' : 'PDF'}
            </button>
          </div>
        </div>
      )}

      {/* Preview table */}
      {rows !== null && rows.length === 0 && (
        <p className="mt-8 text-center text-sm text-slate-400">No completed entries found for this period.</p>
      )}

      {rows !== null && rows.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3 text-right">Hours</th>
                <th className="px-4 py-3">Billable</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{row.date}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{row.memberName}</td>
                  <td className="px-4 py-2.5 text-slate-600">{row.department}</td>
                  <td className="px-4 py-2.5 text-slate-600">{row.role}</td>
                  <td className="max-w-xs px-4 py-2.5 text-slate-700">{row.task}</td>
                  <td className="px-4 py-2.5 text-slate-600">{row.project}</td>
                  <td className="px-4 py-2.5 text-slate-500">{row.tags || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono font-semibold text-slate-800">
                    {row.hours.toFixed(2)}h
                  </td>
                  <td className="px-4 py-2.5">
                    {row.billable ? (
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">Yes</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  )
}

// ─── SettingsScreen ───────────────────────────────────────────────────────────

export function SettingsScreen({ state }: { state: TrackerState }) {
  const router = useRouter()
  const currentMember = state.members.find((m) => m.id === state.currentMemberId)!
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
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {editing ? (
          <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              Workspace name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              Timezone
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. Asia/Manila"
                required
                className="h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
              />
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={pending}
                className="h-9 rounded-lg bg-teal-700 px-4 text-sm font-bold text-white transition-colors hover:bg-teal-800 disabled:bg-slate-300"
              >
                {pending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setName(state.workspace.name); setTimezone(state.workspace.timezone) }}
                className="h-9 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
              <Info label="Role model" value="Owner / Admin / Manager / Employee" />
            </dl>
            {isOwner && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
