import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const inviteMemberSchema = z.object({
  email: z.string().trim().email(),
  workspaceRoleId: z.string().min(1),
  departmentId: z.string().optional(),
})

const createRoleSchema = z.object({
  name: z.string().trim().min(1).max(100),
  permissionLevel: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE']),
  color: z.string().default('#6366f1'),
})

const entryInputSchema = z.object({
  description: z.string().trim().min(1),
  projectId: z.string().min(1),
  tagIds: z.array(z.string().min(1)).default([]),
  billable: z.boolean().default(false),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  durationSeconds: z.number().int().min(0),
  notes: z.string().trim().default(''),
})

const startTimerSchema = z.object({
  description: z.string().trim().min(1),
  projectId: z.string().min(1),
  tagIds: z.array(z.string().min(1)).default([]),
  billable: z.boolean().default(false),
})

const entryIdSchema = z.object({
  id: z.string().min(1),
})

const updateEntrySchema = entryInputSchema.extend({
  id: z.string().min(1),
})

export const getTrackerStateFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getTrackerState } = await import('./tracker.server')
    return getTrackerState()
  },
)

export const getMemberAnalyticsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getMemberAnalytics } = await import('./tracker.server')
    return getMemberAnalytics()
  },
)

export const startTimerFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => startTimerSchema.parse(input))
  .handler(async ({ data }) => {
    const { startTimer } = await import('./tracker.server')
    return startTimer(data)
  })

export const stopTimerFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => entryIdSchema.parse(input))
  .handler(async ({ data }) => {
    const { stopTimer } = await import('./tracker.server')
    return stopTimer(data)
  })

export const createManualEntryFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => entryInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { createManualEntry } = await import('./tracker.server')
    return createManualEntry(data)
  })

export const updateEntryFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => updateEntrySchema.parse(input))
  .handler(async ({ data }) => {
    const { updateEntry } = await import('./tracker.server')
    return updateEntry(data)
  })

export const deleteEntryFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => entryIdSchema.parse(input))
  .handler(async ({ data }) => {
    const { deleteEntry } = await import('./tracker.server')
    return deleteEntry(data)
  })

export const duplicateEntryFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => entryIdSchema.parse(input))
  .handler(async ({ data }) => {
    const { duplicateEntry } = await import('./tracker.server')
    return duplicateEntry(data)
  })

export const createWorkspaceMemberFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => inviteMemberSchema.parse(input))
  .handler(async ({ data }) => {
    const { createWorkspaceMember } = await import('./tracker.server')
    return createWorkspaceMember(data)
  })

export const createWorkspaceRoleFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => createRoleSchema.parse(input))
  .handler(async ({ data }) => {
    const { createWorkspaceRole } = await import('./tracker.server')
    return createWorkspaceRole(data)
  })

// ─── Projects ────────────────────────────────────────────────────────────────

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  color: z.string().default('#2563eb'),
})

const updateProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  color: z.string(),
})

const idSchema = z.object({ id: z.string().min(1) })

export const createProjectFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => createProjectSchema.parse(input))
  .handler(async ({ data }) => {
    const { createProject } = await import('./tracker.server')
    return createProject(data)
  })

export const updateProjectFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => updateProjectSchema.parse(input))
  .handler(async ({ data }) => {
    const { updateProject } = await import('./tracker.server')
    return updateProject(data)
  })

export const archiveProjectFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const { archiveProject } = await import('./tracker.server')
    return archiveProject(data)
  })

// ─── Tags ─────────────────────────────────────────────────────────────────────

const createTagSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().default('#14b8a6'),
})

const updateTagSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  color: z.string(),
})

export const createTagFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => createTagSchema.parse(input))
  .handler(async ({ data }) => {
    const { createTag } = await import('./tracker.server')
    return createTag(data)
  })

export const updateTagFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => updateTagSchema.parse(input))
  .handler(async ({ data }) => {
    const { updateTag } = await import('./tracker.server')
    return updateTag(data)
  })

export const archiveTagFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const { archiveTag } = await import('./tracker.server')
    return archiveTag(data)
  })

// ─── Departments ──────────────────────────────────────────────────────────────

const createDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().optional(),
  color: z.string().default('#6366f1'),
})

const updateDepartmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().optional(),
  color: z.string().optional(),
  headMemberId: z.string().optional(),
})

export const createDepartmentFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => createDepartmentSchema.parse(input))
  .handler(async ({ data }) => {
    const { createDepartment } = await import('./tracker.server')
    return createDepartment(data)
  })

export const updateDepartmentFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => updateDepartmentSchema.parse(input))
  .handler(async ({ data }) => {
    const { updateDepartment } = await import('./tracker.server')
    return updateDepartment(data)
  })

export const deleteDepartmentFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const { deleteDepartment } = await import('./tracker.server')
    return deleteDepartment(data)
  })

// ─── Cohorts ──────────────────────────────────────────────────────────────────

const createCohortSchema = z.object({
  name: z.string().trim().min(1).max(120),
})

const updateCohortSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
})

export const createCohortFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => createCohortSchema.parse(input))
  .handler(async ({ data }) => {
    const { createCohort } = await import('./tracker.server')
    return createCohort(data)
  })

export const updateCohortFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => updateCohortSchema.parse(input))
  .handler(async ({ data }) => {
    const { updateCohort } = await import('./tracker.server')
    return updateCohort(data)
  })

export const deleteCohortFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const { deleteCohort } = await import('./tracker.server')
    return deleteCohort(data)
  })

// ─── Member management ────────────────────────────────────────────────────────

const updateWorkspaceMemberSchema = z.object({
  memberId: z.string().min(1),
  workspaceRoleId: z.string().optional(),
  departmentId: z.string().optional(),
  cohortIds: z.array(z.string().min(1)).optional(),
})

const setMemberStatusSchema = z.object({
  memberId: z.string().min(1),
  status: z.enum(['ACTIVE', 'DISABLED']),
})

const updateWorkspaceBillingSchema = z.object({
  defaultBillableRate: z.number().finite().min(0),
  billableCurrency: z.string().trim().min(3).max(8),
})

const updateMemberBillableRateSchema = z.object({
  memberId: z.string().min(1),
  billableRate: z.number().finite().min(0).nullable(),
})

const memberIdSchema = z.object({
  memberId: z.string().min(1),
})

const employeeProfileSchema = z.object({
  employeeNumber: z.string().trim().max(50).optional().or(z.literal('')),
  positionTitle: z.string().trim().max(100).optional().or(z.literal('')),
  employmentType: z
    .enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN', 'PROBATIONARY'])
    .optional(),
  employmentStatus: z
    .enum(['ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED'])
    .optional(),
  hireDate: z.string().date().optional().or(z.literal('')),
  regularizationDate: z.string().date().optional().or(z.literal('')),
  separationDate: z.string().date().optional().or(z.literal('')),
})

const governmentIdsSchema = z.object({
  sssNumber: z.string().trim().max(25).optional().or(z.literal('')),
  philHealthNumber: z.string().trim().max(25).optional().or(z.literal('')),
  tinNumber: z.string().trim().max(25).optional().or(z.literal('')),
  pagIbigNumber: z.string().trim().max(25).optional().or(z.literal('')),
})

const updateMemberDetailSchema = z.object({
  memberId: z.string().min(1),
  employeeProfile: employeeProfileSchema.optional(),
  governmentIds: governmentIdsSchema.optional(),
})

export const updateWorkspaceMemberFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => updateWorkspaceMemberSchema.parse(input))
  .handler(async ({ data }) => {
    const { updateWorkspaceMember } = await import('./tracker.server')
    return updateWorkspaceMember(data)
  })

export const setMemberStatusFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => setMemberStatusSchema.parse(input))
  .handler(async ({ data }) => {
    const { setMemberStatus } = await import('./tracker.server')
    return setMemberStatus(data)
  })

export const updateWorkspaceBillingFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => updateWorkspaceBillingSchema.parse(input))
  .handler(async ({ data }) => {
    const { updateWorkspaceBilling } = await import('./tracker.server')
    return updateWorkspaceBilling(data)
  })

export const updateMemberBillableRateFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => updateMemberBillableRateSchema.parse(input))
  .handler(async ({ data }) => {
    const { updateMemberBillableRate } = await import('./tracker.server')
    return updateMemberBillableRate(data)
  })

export const getMemberDetailFn = createServerFn({ method: 'GET' })
  .inputValidator((input) => memberIdSchema.parse(input))
  .handler(async ({ data }) => {
    const { getMemberDetail } = await import('./tracker.server')
    return getMemberDetail(data)
  })

export const getCurrencyOptionsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getCurrencyOptions } = await import('./tracker.server')
    return getCurrencyOptions()
  },
)

export const updateMemberDetailFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => updateMemberDetailSchema.parse(input))
  .handler(async ({ data }) => {
    const { updateMemberDetail } = await import('./tracker.server')
    return updateMemberDetail(data)
  })

// ─── Profile update ───────────────────────────────────────────────────────────

const addressSchema = z.object({
  buildingNo: z.string().trim().max(50).optional().or(z.literal('')),
  street: z.string().trim().max(100).optional().or(z.literal('')),
  city: z.string().trim().max(100).optional().or(z.literal('')),
  province: z.string().trim().max(100).optional().or(z.literal('')),
  postalCode: z.string().trim().max(20).optional().or(z.literal('')),
  country: z.string().trim().max(100).default('Philippines'),
})

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(150),
  firstName: z.string().trim().min(1).max(50),
  middleName: z.string().trim().max(50).optional().or(z.literal('')),
  lastName: z.string().trim().min(1).max(50),
  contactNumber: z.string().trim().max(50).optional(),
  birthDate: z.string().date().optional().or(z.literal('')),
  gender: z
    .enum(['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY'])
    .optional()
    .or(z.literal('')),
  maritalStatus: z
    .enum(['SINGLE', 'MARRIED', 'SEPARATED', 'WIDOWED', 'DIVORCED'])
    .optional()
    .or(z.literal('')),
  avatarUrl: z.string().url().max(500).optional().or(z.literal('')),
  address: addressSchema.optional(),
})

export const updateProfileFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => updateProfileSchema.parse(input))
  .handler(async ({ data }) => {
    const { updateProfile } = await import('./tracker.server')
    return updateProfile(data)
  })

export const getSelfProfileFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getSelfProfile } = await import('./tracker.server')
    return getSelfProfile()
  },
)

// ─── Workspace settings ───────────────────────────────────────────────────────

const updateWorkspaceSettingsSchema = z.object({
  name: z.string().trim().min(1).max(150),
  timezone: z.string().trim().min(1).max(80),
})

export const updateWorkspaceSettingsFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => updateWorkspaceSettingsSchema.parse(input))
  .handler(async ({ data }) => {
    const { updateWorkspaceSettings } = await import('./tracker.server')
    return updateWorkspaceSettings(data)
  })
