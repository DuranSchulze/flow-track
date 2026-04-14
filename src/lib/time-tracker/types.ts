export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'EMPLOYEE'

export type ViewMode = 'day' | 'week' | 'month'

export type Workspace = {
  id: string
  name: string
  timezone: string
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
  role: WorkspaceRole
  departmentId: string
  cohortIds: string[]
  status: 'ACTIVE' | 'INVITED' | 'DISABLED'
}

export type TimeEntry = {
  id: string
  userId: string
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
  currentUserId: string
  departments: Department[]
  cohorts: Cohort[]
  projects: Project[]
  tags: Tag[]
  members: Member[]
  entries: TimeEntry[]
}

