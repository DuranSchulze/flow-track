import { useTrackerState } from '#/lib/time-tracker/store'

export function ProfileScreen() {
  const { state } = useTrackerState()
  const member = state.members.find((item) => item.id === state.currentUserId)!
  const department = state.departments.find((item) => item.id === member.departmentId)
  const cohorts = state.cohorts.filter((item) => member.cohortIds.includes(item.id))

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
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Role" value={member.role} />
            <Info label="Status" value={member.status} />
            <Info label="Department" value={department?.name || 'Unassigned'} />
            <Info
              label="Groups / cohorts"
              value={cohorts.map((item) => item.name).join(', ') || 'None'}
            />
          </dl>
        </section>
      </div>
    </Page>
  )
}

export function MembersScreen() {
  const { state } = useTrackerState()

  return (
    <Page title="Workspace members" eyebrow="Owner/Admin">
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="m-0 text-lg font-bold text-slate-950">Managed user list</h2>
          <p className="m-0 mt-1 text-sm text-slate-500">
            Employees join this private workspace when their account email matches this list.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Groups / cohorts</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {state.members.map((member) => {
                const department = state.departments.find(
                  (item) => item.id === member.departmentId,
                )
                const cohorts = state.cohorts.filter((item) =>
                  member.cohortIds.includes(item.id),
                )

                return (
                  <tr key={member.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="m-0 font-semibold text-slate-950">{member.name}</p>
                      <p className="m-0 mt-1 text-xs text-slate-500">{member.email}</p>
                    </td>
                    <td className="px-4 py-3">{member.role}</td>
                    <td className="px-4 py-3">{department?.name || 'Unassigned'}</td>
                    <td className="px-4 py-3">
                      {cohorts.map((item) => item.name).join(', ') || 'None'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                        {member.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </Page>
  )
}

export function CatalogsScreen() {
  const { state } = useTrackerState()

  return (
    <Page title="Catalogs" eyebrow="Controlled tagging">
      <div className="grid gap-4 lg:grid-cols-2">
        <Catalog title="Projects" items={state.projects} />
        <Catalog title="Tags" items={state.tags} />
        <Catalog title="Departments" items={state.departments} />
        <Catalog title="Groups / cohorts" items={state.cohorts} />
      </div>
    </Page>
  )
}

export function SettingsScreen() {
  const { state } = useTrackerState()

  return (
    <Page title="Workspace settings" eyebrow="Company workspace">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-3">
          <Info label="Workspace" value={state.workspace.name} />
          <Info label="Timezone" value={state.workspace.timezone} />
          <Info label="Role model" value="Owner / Admin / Employee" />
        </dl>
      </section>
    </Page>
  )
}

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

function Catalog({
  title,
  items,
}: {
  title: string
  items: { id: string; name: string; color?: string }[]
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="m-0 text-lg font-bold text-slate-950">{title}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.id}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {item.name}
          </span>
        ))}
      </div>
    </section>
  )
}

