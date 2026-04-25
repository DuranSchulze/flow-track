import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { gooeyToast } from 'goey-toast'
import {
  archiveProjectFn,
  archiveTagFn,
  deleteCohortFn,
  deleteDepartmentFn,
} from '#/lib/server/tracker'
import type { RolePermission, TrackerState } from '#/lib/time-tracker/types'
import {
  CatalogName,
  ColorDot,
  DangerButton,
  ListRow,
} from './CatalogListParts'

const PERMISSION_LABELS: Record<RolePermission, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
}

export function EmptyCatalog({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <p className="m-0 text-sm font-semibold text-foreground">{label}</p>
    </div>
  )
}

export function RoleList({ roles }: { roles: TrackerState['roles'] }) {
  if (roles.length === 0) return <EmptyCatalog label="No roles yet." />

  return (
    <div className="grid gap-2">
      {roles.map((role) => (
        <ListRow key={role.id}>
          <ColorDot color={role.color} />
          <div className="min-w-0">
            <p className="m-0 truncate text-sm font-bold text-foreground">
              {role.name}
            </p>
            <p className="m-0 text-xs text-muted-foreground">
              {PERMISSION_LABELS[role.permissionLevel]}
            </p>
          </div>
        </ListRow>
      ))}
    </div>
  )
}

export function ProjectList({
  projects,
  canManage,
}: {
  projects: TrackerState['projects']
  canManage: boolean
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)

  if (projects.length === 0) return <EmptyCatalog label="No projects yet." />

  return (
    <div className="grid gap-2">
      {projects.map((project) => (
        <ListRow key={project.id}>
          <ColorDot color={project.color} />
          <CatalogName name={project.name} />
          {canManage && (
            <DangerButton
              title="Archive project"
              pending={pendingId === project.id}
              onClick={async () => {
                setPendingId(project.id)
                try {
                  await archiveProjectFn({ data: { id: project.id } })
                  await router.invalidate()
                  gooeyToast.success(`"${project.name}" archived`)
                } finally {
                  setPendingId(null)
                }
              }}
            />
          )}
        </ListRow>
      ))}
    </div>
  )
}

export function TagList({
  tags,
  canManage,
}: {
  tags: TrackerState['tags']
  canManage: boolean
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)

  if (tags.length === 0) return <EmptyCatalog label="No tags yet." />

  return (
    <div className="grid gap-2">
      {tags.map((tag) => (
        <ListRow key={tag.id}>
          <ColorDot color={tag.color} />
          <CatalogName name={tag.name} />
          {canManage && (
            <DangerButton
              title="Archive tag"
              pending={pendingId === tag.id}
              onClick={async () => {
                setPendingId(tag.id)
                try {
                  await archiveTagFn({ data: { id: tag.id } })
                  await router.invalidate()
                  gooeyToast.success(`"${tag.name}" archived`)
                } finally {
                  setPendingId(null)
                }
              }}
            />
          )}
        </ListRow>
      ))}
    </div>
  )
}

export function DepartmentList({
  departments,
  canManage,
}: {
  departments: TrackerState['departments']
  canManage: boolean
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)

  if (departments.length === 0)
    return <EmptyCatalog label="No departments yet." />

  return (
    <div className="grid gap-2">
      {departments.map((department) => (
        <ListRow key={department.id}>
          <CatalogName name={department.name} />
          {canManage && (
            <DangerButton
              title="Delete department"
              pending={pendingId === department.id}
              onClick={async () => {
                setPendingId(department.id)
                try {
                  await deleteDepartmentFn({ data: { id: department.id } })
                  await router.invalidate()
                  gooeyToast.success(`"${department.name}" deleted`)
                } finally {
                  setPendingId(null)
                }
              }}
            />
          )}
        </ListRow>
      ))}
    </div>
  )
}

export function CohortList({
  cohorts,
  departments,
  canManage,
}: {
  cohorts: TrackerState['cohorts']
  departments: TrackerState['departments']
  canManage: boolean
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const departmentsById = new Map(
    departments.map((department) => [department.id, department.name]),
  )

  if (cohorts.length === 0) return <EmptyCatalog label="No cohorts yet." />

  return (
    <div className="grid gap-2">
      {cohorts.map((cohort) => (
        <ListRow key={cohort.id}>
          <div className="min-w-0">
            <p className="m-0 truncate text-sm font-bold text-foreground">
              {cohort.name}
            </p>
            <p className="m-0 text-xs text-muted-foreground">
              {departmentsById.get(cohort.departmentId) ??
                'Unassigned department'}
            </p>
          </div>
          {canManage && (
            <DangerButton
              title="Delete cohort"
              pending={pendingId === cohort.id}
              onClick={async () => {
                setPendingId(cohort.id)
                try {
                  await deleteCohortFn({ data: { id: cohort.id } })
                  await router.invalidate()
                  gooeyToast.success(`"${cohort.name}" deleted`)
                } finally {
                  setPendingId(null)
                }
              }}
            />
          )}
        </ListRow>
      ))}
    </div>
  )
}
