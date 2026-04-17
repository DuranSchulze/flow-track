export type RolePermission = 'OWNER' | 'ADMIN' | 'CATALOG_MANAGER' | 'MANAGER' | 'EMPLOYEE'

export type ViewMode = 'day' | 'week' | 'month'

export type Workspace = {
  id: string
  name: string
  timezone: string
}

export type WorkspaceRole = {
  id: string
  name: string
  permissionLevel: RolePermission
  color: string
}

export type Department = {
  id: string
  name: string
}

export type Cohort = {
  id: string
  name: string
}

export type Project = {
  id: string
  name: string
  color: string
}

export type Tag = {
  id: string
  name: string
  color: string
}

export type Member = {
  id: string
  name: string
  email: string
  workspaceRoleId: string
  roleName: string
  permissionLevel: RolePermission
  departmentId: string
  cohortIds: string[]
  status: 'ACTIVE' | 'INVITED' | 'DISABLED'
}

export type TimeEntry = {
  id: string
  workspaceMemberId: string
  description: string
  projectId: string
  tagIds: string[]
  billable: boolean
  startedAt: string
  endedAt: string | null
  durationSeconds: number
  notes: string
}

export type TrackerState = {
  workspace: Workspace
  currentMemberId: string
  roles: WorkspaceRole[]
  departments: Department[]
  cohorts: Cohort[]
  projects: Project[]
  tags: Tag[]
  members: Member[]
  entries: TimeEntry[]
  /** departmentId → total tracked seconds. Present only for OWNER/ADMIN/CATALOG_MANAGER. */
  departmentTotals?: Record<string, number>
}

export type ReportRow = {
  date: string           // YYYY-MM-DD
  memberName: string
  department: string
  role: string
  task: string
  project: string
  tags: string           // comma-separated tag names
  hours: number          // decimal, e.g. 1.5
  billable: boolean
  notes: string
}
