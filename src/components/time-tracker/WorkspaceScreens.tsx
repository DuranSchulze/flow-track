import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Pencil, Plus, Trash2, UserPlus, X } from 'lucide-react'
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
  setMemberStatusFn,
  updateProfileFn,
  updateWorkspaceMemberFn,
  updateWorkspaceSettingsFn,
} from '#/lib/server/tracker'
import type { TrackerState } from '#/lib/time-tracker/types'

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
  const canManage =
    currentMember.permissionLevel === 'OWNER' || currentMember.permissionLevel === 'ADMIN'

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

function RolesManager({ state, canManage }: { state: TrackerState; canManage: boolean }) {
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
                setPermissionLevel(e.target.value as 'OWNER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE')
              }
              className="h-9 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
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

function DepartmentsManager({ state, canManage }: { state: TrackerState; canManage: boolean }) {
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
