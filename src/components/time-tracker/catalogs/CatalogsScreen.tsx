import { useMemo, useState } from 'react'
import {
  Briefcase,
  Building2,
  ShieldCheck,
  Tags,
  UsersRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { TrackerState } from '#/lib/time-tracker/types'
import { CatalogCard, CatalogDialog } from './CatalogDialog'
import type { CatalogAccent } from './CatalogDialog'
import {
  CohortForm,
  DepartmentForm,
  ProjectForm,
  RoleForm,
  TagForm,
} from './CatalogForms'
import {
  CohortList,
  DepartmentList,
  ProjectList,
  RoleList,
  TagList,
} from './CatalogLists'

type CatalogKey = 'roles' | 'projects' | 'tags' | 'departments' | 'cohorts'

type CatalogDefinition = {
  key: CatalogKey
  title: string
  description: string
  count: number
  icon: ReactNode
  accent: CatalogAccent
  preview: ReactNode
  createForm: ReactNode
  list: ReactNode
}

export function CatalogsScreen({ state }: { state: TrackerState }) {
  const [activeKey, setActiveKey] = useState<CatalogKey | null>(null)
  const currentMember = state.members.find(
    (member) => member.id === state.currentMemberId,
  )
  const canManage =
    currentMember?.permissionLevel === 'OWNER' ||
    currentMember?.permissionLevel === 'ADMIN'

  const catalogs = useMemo(
    () => buildCatalogs(state, canManage),
    [state, canManage],
  )
  const activeCatalog = catalogs.find((catalog) => catalog.key === activeKey)

  return (
    <div className="grid min-w-0 gap-6">
      <header>
        <p className="m-0 text-sm font-semibold text-primary">
          Controlled workspace setup
        </p>
        <h1 className="m-0 mt-1 text-2xl font-bold tracking-tight text-foreground">
          Catalogs
        </h1>
      </header>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="m-0 text-lg font-bold text-foreground">
              Workspace options
            </h2>
            <p className="m-0 mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Open a catalog to review its values and create new records in a
              focused workspace dialog.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-foreground">
            {catalogs.reduce((sum, catalog) => sum + catalog.count, 0)} total
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {catalogs.map((catalog) => (
          <CatalogCard
            key={catalog.key}
            title={catalog.title}
            description={catalog.description}
            count={catalog.count}
            icon={catalog.icon}
            accent={catalog.accent}
            preview={catalog.preview}
            onOpen={() => setActiveKey(catalog.key)}
          />
        ))}
      </section>

      {activeCatalog && (
        <CatalogDialog
          title={activeCatalog.title}
          description={activeCatalog.description}
          countLabel={`${activeCatalog.count} item${
            activeCatalog.count === 1 ? '' : 's'
          }`}
          icon={activeCatalog.icon}
          accent={activeCatalog.accent}
          canManage={canManage}
          createForm={activeCatalog.createForm}
          onClose={() => setActiveKey(null)}
        >
          {activeCatalog.list}
        </CatalogDialog>
      )}
    </div>
  )
}

function buildCatalogs(
  state: TrackerState,
  canManage: boolean,
): CatalogDefinition[] {
  return [
    {
      key: 'roles',
      title: 'Roles',
      description: 'Permission levels used to control workspace access.',
      count: state.roles.length,
      icon: <ShieldCheck className="h-5 w-5" />,
      accent: blueAccent,
      preview: <Preview names={state.roles.map((role) => role.name)} />,
      createForm: <RoleForm />,
      list: <RoleList roles={state.roles} />,
    },
    {
      key: 'projects',
      title: 'Projects',
      description: 'Billable or internal work streams used by time entries.',
      count: state.projects.length,
      icon: <Briefcase className="h-5 w-5" />,
      accent: greenAccent,
      preview: (
        <Preview names={state.projects.map((project) => project.name)} />
      ),
      createForm: <ProjectForm />,
      list: <ProjectList projects={state.projects} canManage={canManage} />,
    },
    {
      key: 'tags',
      title: 'Tags',
      description: 'Labels for classifying tasks across projects and reports.',
      count: state.tags.length,
      icon: <Tags className="h-5 w-5" />,
      accent: tealAccent,
      preview: <Preview names={state.tags.map((tag) => tag.name)} />,
      createForm: <TagForm />,
      list: <TagList tags={state.tags} canManage={canManage} />,
    },
    {
      key: 'departments',
      title: 'Departments',
      description: 'Primary organizational units for members and cohorts.',
      count: state.departments.length,
      icon: <Building2 className="h-5 w-5" />,
      accent: violetAccent,
      preview: (
        <Preview
          names={state.departments.map((department) => department.name)}
        />
      ),
      createForm: <DepartmentForm />,
      list: (
        <DepartmentList departments={state.departments} canManage={canManage} />
      ),
    },
    {
      key: 'cohorts',
      title: 'Groups / cohorts',
      description: 'Teams inside departments for finer member filtering.',
      count: state.cohorts.length,
      icon: <UsersRound className="h-5 w-5" />,
      accent: amberAccent,
      preview: <Preview names={state.cohorts.map((cohort) => cohort.name)} />,
      createForm: <CohortForm departments={state.departments} />,
      list: (
        <CohortList
          cohorts={state.cohorts}
          departments={state.departments}
          canManage={canManage}
        />
      ),
    },
  ]
}

function Preview({ names }: { names: string[] }) {
  const preview = names.slice(0, 3)
  if (preview.length === 0) {
    return (
      <span className="text-xs font-semibold text-muted-foreground">Empty</span>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {preview.map((name) => (
        <span
          key={name}
          className="max-w-[140px] truncate rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground"
        >
          {name}
        </span>
      ))}
    </div>
  )
}

const blueAccent = {
  bg: 'bg-blue-500/10',
  border: 'border-blue-500/20',
  text: 'text-blue-600',
}

const greenAccent = {
  bg: 'bg-emerald-500/10',
  border: 'border-emerald-500/20',
  text: 'text-emerald-600',
}

const tealAccent = {
  bg: 'bg-cyan-500/10',
  border: 'border-cyan-500/20',
  text: 'text-cyan-600',
}

const violetAccent = {
  bg: 'bg-violet-500/10',
  border: 'border-violet-500/20',
  text: 'text-violet-600',
}

const amberAccent = {
  bg: 'bg-amber-500/10',
  border: 'border-amber-500/20',
  text: 'text-amber-600',
}
