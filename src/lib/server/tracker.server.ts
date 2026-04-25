import '@tanstack/react-start/server-only'
import { z } from 'zod'
import { prisma } from '#/db'
import { requireWorkspaceAccess } from './workspace-access.server'
import type { TrackerState } from '#/lib/time-tracker/types'
import {
  computeEffectiveRate,
  normalizeCurrency,
  toFiniteRate,
} from '#/lib/time-tracker/billing'

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

const analyticsRangeSchema = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
  scope: z.enum(['personal', 'organization', 'department']).optional(),
})

export type AnalyticsScope = 'workspace' | 'department' | 'personal'
export type AnalyticsSelectedScope = 'personal' | 'organization' | 'department'

export type AnalyticsPayload = {
  scope: AnalyticsScope
  selectedScope: AnalyticsSelectedScope
  availableScopes: AnalyticsSelectedScope[]
  scopeLabel: string
  notice: string | null
  startDate: string
  endDate: string
  summary: {
    totalSeconds: number
    billableSeconds: number
    nonBillableSeconds: number
    entryCount: number
    activeMembers: number | null
  }
  dailyTotals: Array<{ date: string; seconds: number }>
  projectTotals: Array<{
    projectId: string
    name: string
    color: string
    seconds: number
  }>
  billableSplit: Array<{ label: 'Billable' | 'Non-billable'; seconds: number }>
  heatmap: Array<{ date: string; seconds: number; intensity: number }>
  topTasks: Array<{ description: string; seconds: number; entryCount: number }>
  topTags: Array<{
    tagId: string
    name: string
    color: string
    seconds: number
    entryCount: number
  }>
  topDepartments: Array<{
    departmentId: string
    name: string
    color: string
    seconds: number
    memberCount: number
  }>
}

function toIso(date: Date | string | null) {
  if (!date) {
    return null
  }

  return new Date(date).toISOString()
}

async function assertWorkspaceCatalogs(
  workspaceId: string,
  projectId: string,
  tagIds: string[],
) {
  const [project, tags] = await Promise.all([
    prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
        archived: false,
      },
    }),
    tagIds.length
      ? prisma.tag.findMany({
          where: {
            id: {
              in: tagIds,
            },
            workspaceId,
            archived: false,
          },
        })
      : Promise.resolve([]),
  ])

  if (!project) {
    throw new Error('Selected project is not available in this workspace.')
  }

  if (tags.length !== new Set(tagIds).size) {
    throw new Error(
      'One or more selected tags are not available in this workspace.',
    )
  }
}

function calculateDuration(startedAt: Date, endedAt: Date | null) {
  if (!endedAt) {
    return 0
  }

  return Math.max(
    0,
    Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000),
  )
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function getAnalyticsDateRange(data: z.infer<typeof analyticsRangeSchema>) {
  const now = new Date()
  const fallbackEnd = parseDateOnly(toDateKey(now))
  const fallbackStart = addUtcDays(fallbackEnd, -29)
  let start = parseDateOnly(data.startDate)
  let end = parseDateOnly(data.endDate)

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    start = fallbackStart
    end = fallbackEnd
  }

  const maxStart = addUtcDays(end, -365)
  if (start < maxStart) {
    start = maxStart
  }

  return {
    start,
    end,
    endExclusive: addUtcDays(end, 1),
    startDate: toDateKey(start),
    endDate: toDateKey(end),
  }
}

function buildDateKeys(start: Date, end: Date) {
  const keys: string[] = []
  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor = addUtcDays(cursor, 1)
  ) {
    keys.push(toDateKey(cursor))
  }
  return keys
}

export async function getTrackerState(): Promise<TrackerState> {
  const access = await requireWorkspaceAccess()
  const workspaceId = access.workspace.id
  const memberId = access.member.id

  const [roles, departments, cohorts, projects, tags, members, entries] =
    await Promise.all([
      prisma.workspaceRole.findMany({
        where: { workspaceId },
        orderBy: [{ permissionLevel: 'asc' }, { name: 'asc' }],
      }),
      prisma.department.findMany({
        where: { workspaceId },
        orderBy: { name: 'asc' },
      }),
      prisma.cohort.findMany({
        where: { workspaceId },
        orderBy: { name: 'asc' },
      }),
      prisma.project.findMany({
        where: { workspaceId, archived: false },
        orderBy: { name: 'asc' },
      }),
      prisma.tag.findMany({
        where: { workspaceId, archived: false },
        orderBy: { name: 'asc' },
      }),
      prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: {
          user: true,
          workspaceRole: true,
          cohorts: {
            include: {
              cohort: true,
            },
          },
        },
        orderBy: { email: 'asc' },
      }),
      prisma.timeEntry.findMany({
        where: {
          workspaceId,
          workspaceMemberId: memberId,
        },
        include: {
          tags: true,
        },
        orderBy: {
          startedAt: 'desc',
        },
      }),
    ])

  return {
    workspace: {
      id: access.workspace.id,
      name: access.workspace.name,
      timezone: access.workspace.timezone,
      defaultBillableRate: Number(access.workspace.defaultBillableRate),
      billableCurrency: access.workspace.billableCurrency,
      googleSheetUrl: access.workspace.googleSheetUrl,
      googleSheetSyncedAt: access.workspace.googleSheetSyncedAt
        ? access.workspace.googleSheetSyncedAt.toISOString()
        : null,
    },
    currentMemberId: memberId,
    roles: roles.map((role) => ({
      id: role.id,
      name: role.name,
      permissionLevel: role.permissionLevel,
      color: role.color,
    })),
    departments: departments.map((department) => ({
      id: department.id,
      name: department.name,
    })),
    cohorts: cohorts.map((cohort) => ({
      id: cohort.id,
      name: cohort.name,
      departmentId: cohort.departmentId ?? '',
    })),
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      color: project.color,
    })),
    tags: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    })),
    members: members.map((member) => ({
      id: member.id,
      name: member.user?.name ?? member.email,
      email: member.email,
      image: member.user?.image ?? null,
      workspaceRoleId: member.workspaceRoleId ?? '',
      roleName: member.workspaceRole?.name ?? 'No role',
      permissionLevel: member.workspaceRole?.permissionLevel ?? 'EMPLOYEE',
      departmentId: member.departmentId ?? '',
      cohortIds: member.cohorts.map((cohortMember) => cohortMember.cohortId),
      status: member.status,
      billableRate:
        member.billableRate == null ? null : Number(member.billableRate),
    })),
    entries: entries.map((entry) => ({
      id: entry.id,
      workspaceMemberId: entry.workspaceMemberId,
      description: entry.description,
      projectId: entry.projectId ?? '',
      tagIds: entry.tags.map((tag) => tag.tagId),
      billable: entry.billable,
      startedAt: entry.startedAt.toISOString(),
      endedAt: toIso(entry.endedAt),
      durationSeconds: entry.durationSeconds,
      notes: entry.notes ?? '',
    })),
  }
}

export async function startTimer(data: z.infer<typeof startTimerSchema>) {
  const access = await requireWorkspaceAccess()
  const tagIds = [...new Set(data.tagIds.filter(Boolean))]

  await assertWorkspaceCatalogs(access.workspace.id, data.projectId, tagIds)

  const activeEntry = await prisma.timeEntry.findFirst({
    where: {
      workspaceId: access.workspace.id,
      workspaceMemberId: access.member.id,
      endedAt: null,
    },
  })

  if (activeEntry) {
    throw new Error('Stop your current timer before starting a new one.')
  }

  await prisma.timeEntry.create({
    data: {
      workspaceId: access.workspace.id,
      workspaceMemberId: access.member.id,
      description: data.description,
      projectId: data.projectId,
      billable: data.billable,
      startedAt: new Date(),
      endedAt: null,
      durationSeconds: 0,
      notes: '',
      tags: {
        create: tagIds.map((tagId) => ({ tagId })),
      },
    },
  })
}

export async function stopTimer(data: z.infer<typeof entryIdSchema>) {
  const access = await requireWorkspaceAccess()
  const entry = await prisma.timeEntry.findFirst({
    where: {
      id: data.id,
      workspaceId: access.workspace.id,
      workspaceMemberId: access.member.id,
      endedAt: null,
    },
  })

  if (!entry) {
    return
  }

  const endedAt = new Date()
  await prisma.timeEntry.update({
    where: { id: entry.id },
    data: {
      endedAt,
      durationSeconds: calculateDuration(entry.startedAt, endedAt),
    },
  })
}

export async function createManualEntry(
  data: z.infer<typeof entryInputSchema>,
) {
  const access = await requireWorkspaceAccess()
  const tagIds = [...new Set(data.tagIds.filter(Boolean))]
  const startedAt = new Date(data.startedAt)
  const endedAt = data.endedAt ? new Date(data.endedAt) : null

  await assertWorkspaceCatalogs(access.workspace.id, data.projectId, tagIds)

  await prisma.timeEntry.create({
    data: {
      workspaceId: access.workspace.id,
      workspaceMemberId: access.member.id,
      description: data.description,
      projectId: data.projectId,
      billable: data.billable,
      startedAt,
      endedAt,
      durationSeconds: calculateDuration(startedAt, endedAt),
      notes: data.notes,
      tags: {
        create: tagIds.map((tagId) => ({ tagId })),
      },
    },
  })
}

export async function updateEntry(data: z.infer<typeof updateEntrySchema>) {
  const access = await requireWorkspaceAccess()
  const tagIds = [...new Set(data.tagIds.filter(Boolean))]
  const startedAt = new Date(data.startedAt)
  const endedAt = data.endedAt ? new Date(data.endedAt) : null

  await assertWorkspaceCatalogs(access.workspace.id, data.projectId, tagIds)

  const entry = await prisma.timeEntry.findFirstOrThrow({
    where: {
      id: data.id,
      workspaceId: access.workspace.id,
      workspaceMemberId: access.member.id,
    },
  })

  await prisma.timeEntry.update({
    where: {
      id: entry.id,
    },
    data: {
      description: data.description,
      projectId: data.projectId,
      billable: data.billable,
      startedAt,
      endedAt,
      durationSeconds: calculateDuration(startedAt, endedAt),
      notes: data.notes,
      tags: {
        deleteMany: {},
        create: tagIds.map((tagId) => ({ tagId })),
      },
    },
  })
}

export async function deleteEntry(data: z.infer<typeof entryIdSchema>) {
  const access = await requireWorkspaceAccess()

  await prisma.timeEntry.deleteMany({
    where: {
      id: data.id,
      workspaceId: access.workspace.id,
      workspaceMemberId: access.member.id,
    },
  })
}

export async function duplicateEntry(data: z.infer<typeof entryIdSchema>) {
  const access = await requireWorkspaceAccess()
  const entry = await prisma.timeEntry.findFirstOrThrow({
    where: {
      id: data.id,
      workspaceId: access.workspace.id,
      workspaceMemberId: access.member.id,
    },
    include: {
      tags: true,
    },
  })
  const startedAt = new Date()
  startedAt.setMinutes(0, 0, 0)
  const durationSeconds = Math.max(entry.durationSeconds, 3600)
  const endedAt = new Date(startedAt.getTime() + durationSeconds * 1000)

  await prisma.timeEntry.create({
    data: {
      workspaceId: access.workspace.id,
      workspaceMemberId: access.member.id,
      description: entry.description,
      projectId: entry.projectId,
      billable: entry.billable,
      startedAt,
      endedAt,
      durationSeconds,
      notes: entry.notes,
      tags: {
        create: entry.tags.map((tag) => ({ tagId: tag.tagId })),
      },
    },
  })
}

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

function assertOwnerOrAdmin(access: {
  member: { workspaceRole: { permissionLevel: string } | null }
}) {
  const level = access.member.workspaceRole?.permissionLevel
  if (level !== 'OWNER' && level !== 'ADMIN') {
    throw new Error('Only Owners and Admins can perform this action.')
  }
}

export async function createWorkspaceMember(
  data: z.infer<typeof inviteMemberSchema>,
) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  const email = data.email.toLowerCase()

  const existing = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: access.workspace.id,
      email: { equals: email, mode: 'insensitive' },
    },
  })

  if (existing) {
    throw new Error(`${data.email} is already a member of this workspace.`)
  }

  const roleExists = await prisma.workspaceRole.findFirst({
    where: { id: data.workspaceRoleId, workspaceId: access.workspace.id },
  })

  if (!roleExists) {
    throw new Error('Selected role does not exist in this workspace.')
  }

  await prisma.workspaceMember.create({
    data: {
      workspaceId: access.workspace.id,
      email,
      workspaceRoleId: data.workspaceRoleId,
      status: 'INVITED',
      departmentId: data.departmentId || null,
      invitedById: access.member.id,
    },
  })
}

export async function createWorkspaceRole(
  data: z.infer<typeof createRoleSchema>,
) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  const existing = await prisma.workspaceRole.findFirst({
    where: {
      workspaceId: access.workspace.id,
      name: { equals: data.name, mode: 'insensitive' },
    },
  })

  if (existing) {
    throw new Error(
      `A role named "${data.name}" already exists in this workspace.`,
    )
  }

  await prisma.workspaceRole.create({
    data: {
      workspaceId: access.workspace.id,
      name: data.name,
      permissionLevel: data.permissionLevel,
      color: data.color,
    },
  })
}

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

export async function createProject(data: z.infer<typeof createProjectSchema>) {
  const access = await requireWorkspaceAccess()

  const existing = await prisma.project.findFirst({
    where: {
      workspaceId: access.workspace.id,
      name: { equals: data.name, mode: 'insensitive' },
    },
  })
  if (existing)
    throw new Error(`A project named "${data.name}" already exists.`)

  await prisma.project.create({
    data: {
      workspaceId: access.workspace.id,
      name: data.name,
      color: data.color,
    },
  })
}

export async function updateProject(data: z.infer<typeof updateProjectSchema>) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  await prisma.project.updateMany({
    where: { id: data.id, workspaceId: access.workspace.id },
    data: { name: data.name, color: data.color },
  })
}

export async function archiveProject(data: z.infer<typeof idSchema>) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  await prisma.project.updateMany({
    where: { id: data.id, workspaceId: access.workspace.id },
    data: { archived: true },
  })
}

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

export async function createTag(data: z.infer<typeof createTagSchema>) {
  const access = await requireWorkspaceAccess()

  const existing = await prisma.tag.findFirst({
    where: {
      workspaceId: access.workspace.id,
      name: { equals: data.name, mode: 'insensitive' },
    },
  })
  if (existing) throw new Error(`A tag named "${data.name}" already exists.`)

  await prisma.tag.create({
    data: {
      workspaceId: access.workspace.id,
      name: data.name,
      color: data.color,
    },
  })
}

export async function updateTag(data: z.infer<typeof updateTagSchema>) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  await prisma.tag.updateMany({
    where: { id: data.id, workspaceId: access.workspace.id },
    data: { name: data.name, color: data.color },
  })
}

export async function archiveTag(data: z.infer<typeof idSchema>) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  await prisma.tag.updateMany({
    where: { id: data.id, workspaceId: access.workspace.id },
    data: { archived: true },
  })
}

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

export async function createDepartment(
  data: z.infer<typeof createDepartmentSchema>,
) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  const existing = await prisma.department.findFirst({
    where: {
      workspaceId: access.workspace.id,
      name: { equals: data.name, mode: 'insensitive' },
    },
  })
  if (existing)
    throw new Error(`A department named "${data.name}" already exists.`)

  await prisma.department.create({
    data: {
      workspaceId: access.workspace.id,
      name: data.name,
      description: data.description,
      color: data.color,
    },
  })
}

export async function updateDepartment(
  data: z.infer<typeof updateDepartmentSchema>,
) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  await prisma.department.updateMany({
    where: { id: data.id, workspaceId: access.workspace.id },
    data: {
      name: data.name,
      description: data.description,
      ...(data.color !== undefined && { color: data.color }),
      ...(data.headMemberId !== undefined && {
        headMemberId: data.headMemberId || null,
      }),
    },
  })
}

export async function deleteDepartment(data: z.infer<typeof idSchema>) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  // Members' departmentId is set null automatically via onDelete: SetNull
  await prisma.department.deleteMany({
    where: { id: data.id, workspaceId: access.workspace.id },
  })
}

// ─── Cohorts ──────────────────────────────────────────────────────────────────

const createCohortSchema = z.object({
  name: z.string().trim().min(1).max(120),
  departmentId: z.string().min(1),
})

const updateCohortSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  departmentId: z.string().min(1),
})

export async function createCohort(data: z.infer<typeof createCohortSchema>) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  const department = await prisma.department.findFirst({
    where: { id: data.departmentId, workspaceId: access.workspace.id },
  })
  if (!department) throw new Error('Selected department does not exist.')

  const existing = await prisma.cohort.findFirst({
    where: {
      workspaceId: access.workspace.id,
      departmentId: data.departmentId,
      name: { equals: data.name, mode: 'insensitive' },
    },
  })
  if (existing)
    throw new Error(
      `A cohort named "${data.name}" already exists in ${department.name}.`,
    )

  await prisma.cohort.create({
    data: {
      workspaceId: access.workspace.id,
      departmentId: data.departmentId,
      name: data.name,
    },
  })
}

export async function updateCohort(data: z.infer<typeof updateCohortSchema>) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  const department = await prisma.department.findFirst({
    where: { id: data.departmentId, workspaceId: access.workspace.id },
  })
  if (!department) throw new Error('Selected department does not exist.')

  const duplicate = await prisma.cohort.findFirst({
    where: {
      id: { not: data.id },
      workspaceId: access.workspace.id,
      departmentId: data.departmentId,
      name: { equals: data.name, mode: 'insensitive' },
    },
  })
  if (duplicate)
    throw new Error(
      `A cohort named "${data.name}" already exists in ${department.name}.`,
    )

  await prisma.cohort.updateMany({
    where: { id: data.id, workspaceId: access.workspace.id },
    data: { name: data.name, departmentId: data.departmentId },
  })
}

export async function deleteCohort(data: z.infer<typeof idSchema>) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  // CohortMember rows cascade via schema
  await prisma.cohort.deleteMany({
    where: { id: data.id, workspaceId: access.workspace.id },
  })
}

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

type CurrencyOption = {
  code: string
  name: string
}

const FALLBACK_CURRENCIES: CurrencyOption[] = [
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'USD', name: 'United States Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'INR', name: 'Indian Rupee' },
]

let currencyCache: {
  expiresAt: number
  options: CurrencyOption[]
} | null = null

function normalizeCurrencyOptions(options: CurrencyOption[]) {
  const unique = new Map<string, CurrencyOption>()
  for (const option of options) {
    const code = normalizeCurrency(option.code)
    unique.set(code, { code, name: option.name.trim() || code })
  }
  return [...unique.values()].sort((a, b) => a.code.localeCompare(b.code))
}

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

export async function updateWorkspaceMember(
  data: z.infer<typeof updateWorkspaceMemberSchema>,
) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  const target = await prisma.workspaceMember.findFirst({
    where: { id: data.memberId, workspaceId: access.workspace.id },
  })
  if (!target) throw new Error('Member not found in this workspace.')

  if (data.workspaceRoleId) {
    const roleExists = await prisma.workspaceRole.findFirst({
      where: { id: data.workspaceRoleId, workspaceId: access.workspace.id },
    })
    if (!roleExists)
      throw new Error('Selected role does not exist in this workspace.')
  }

  const effectiveDepartmentId =
    data.departmentId !== undefined ? data.departmentId : target.departmentId

  if (effectiveDepartmentId) {
    const departmentExists = await prisma.department.findFirst({
      where: { id: effectiveDepartmentId, workspaceId: access.workspace.id },
    })
    if (!departmentExists)
      throw new Error('Selected department does not exist in this workspace.')
  }

  if (data.cohortIds !== undefined && data.cohortIds.length > 0) {
    if (!effectiveDepartmentId) {
      throw new Error('Select a department before assigning cohorts.')
    }

    const validCohorts = await prisma.cohort.findMany({
      where: {
        id: { in: data.cohortIds },
        workspaceId: access.workspace.id,
        departmentId: effectiveDepartmentId,
      },
      select: { id: true },
    })
    if (validCohorts.length !== data.cohortIds.length) {
      throw new Error('Selected cohorts must belong to the member department.')
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.workspaceMember.update({
      where: { id: data.memberId },
      data: {
        ...(data.workspaceRoleId !== undefined && {
          workspaceRoleId: data.workspaceRoleId,
        }),
        ...(data.departmentId !== undefined && {
          departmentId: data.departmentId || null,
        }),
      },
    })

    if (data.cohortIds !== undefined) {
      await tx.cohortMember.deleteMany({ where: { memberId: data.memberId } })
      if (data.cohortIds.length > 0) {
        await tx.cohortMember.createMany({
          data: data.cohortIds.map((cohortId) => ({
            cohortId,
            memberId: data.memberId,
          })),
        })
      }
    } else if (data.departmentId !== undefined) {
      await tx.cohortMember.deleteMany({ where: { memberId: data.memberId } })
    }
  })
}

export async function setMemberStatus(
  data: z.infer<typeof setMemberStatusSchema>,
) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  if (data.memberId === access.member.id) {
    throw new Error('You cannot change your own account status.')
  }

  const target = await prisma.workspaceMember.findFirst({
    where: { id: data.memberId, workspaceId: access.workspace.id },
    include: { workspaceRole: true },
  })
  if (!target) throw new Error('Member not found in this workspace.')

  await prisma.workspaceMember.update({
    where: { id: data.memberId },
    data: { status: data.status },
  })
}

export async function updateWorkspaceBilling(
  data: z.infer<typeof updateWorkspaceBillingSchema>,
) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  await prisma.workspace.update({
    where: { id: access.workspace.id },
    data: {
      defaultBillableRate: toFiniteRate(data.defaultBillableRate),
      billableCurrency: normalizeCurrency(data.billableCurrency),
    },
  })
}

export async function updateMemberBillableRate(
  data: z.infer<typeof updateMemberBillableRateSchema>,
) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  const target = await prisma.workspaceMember.findFirst({
    where: { id: data.memberId, workspaceId: access.workspace.id },
  })
  if (!target) throw new Error('Member not found in this workspace.')

  await prisma.workspaceMember.update({
    where: { id: data.memberId },
    data: {
      billableRate:
        data.billableRate == null ? null : toFiniteRate(data.billableRate),
    },
  })
}

export async function getCurrencyOptions() {
  if (currencyCache && currencyCache.expiresAt > Date.now()) {
    return currencyCache.options
  }

  try {
    const response = await fetch('https://api.frankfurter.dev/v2/currencies')
    if (!response.ok) throw new Error('Currency list request failed.')

    const data = (await response.json()) as unknown
    const parsed = Array.isArray(data)
      ? data
          .filter(
            (item): item is { iso_code: string; name: string } =>
              item != null &&
              typeof item === 'object' &&
              typeof item.iso_code === 'string' &&
              typeof item.name === 'string',
          )
          .map((item) => ({ code: item.iso_code, name: item.name }))
      : data && typeof data === 'object'
        ? Object.entries(data as Record<string, unknown>)
            .filter(
              (entry): entry is [string, string] =>
                typeof entry[1] === 'string',
            )
            .map(([code, name]) => ({ code, name }))
        : []

    const options = normalizeCurrencyOptions([
      ...FALLBACK_CURRENCIES,
      ...parsed,
    ])
    currencyCache = {
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      options,
    }
    return options
  } catch {
    return normalizeCurrencyOptions(FALLBACK_CURRENCIES)
  }
}

function toDateOnly(value?: string | null) {
  return value ? new Date(value) : null
}

function fromDateOnly(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : ''
}

export async function getMemberDetail(data: z.infer<typeof memberIdSchema>) {
  const access = await requireWorkspaceAccess()
  const canManage =
    access.member.workspaceRole?.permissionLevel === 'OWNER' ||
    access.member.workspaceRole?.permissionLevel === 'ADMIN'

  const member = await prisma.workspaceMember.findFirst({
    where: { id: data.memberId, workspaceId: access.workspace.id },
    include: {
      user: {
        include: {
          profile: {
            include: { address: true },
          },
        },
      },
      workspaceRole: true,
      department: true,
      cohorts: { include: { cohort: true } },
      employeeProfile: {
        include: { governmentIds: true },
      },
    },
  })
  if (!member) throw new Error('Member not found in this workspace.')

  const billableEntries = await prisma.timeEntry.findMany({
    where: {
      workspaceId: access.workspace.id,
      workspaceMemberId: member.id,
      billable: true,
    },
    select: { durationSeconds: true },
  })
  const billableSeconds = billableEntries.reduce(
    (sum, entry) => sum + entry.durationSeconds,
    0,
  )

  const memberRate =
    member.billableRate == null
      ? null
      : toFiniteRate(Number(member.billableRate))
  const defaultRate = toFiniteRate(Number(access.workspace.defaultBillableRate))
  const effectiveRate = computeEffectiveRate(memberRate, defaultRate)
  const billableCurrency = normalizeCurrency(access.workspace.billableCurrency)
  const employeeProfile = member.employeeProfile
  const profile = member.user?.profile

  return {
    canManage,
    workspace: {
      id: access.workspace.id,
      name: access.workspace.name,
      defaultBillableRate: defaultRate,
      billableCurrency,
    },
    member: {
      id: member.id,
      name: member.user?.name ?? member.email,
      email: member.email,
      image: member.user?.image ?? null,
      status: member.status,
      billableRate: canManage ? memberRate : null,
      effectiveRate: canManage ? effectiveRate : null,
      billableSeconds: canManage ? billableSeconds : 0,
      earningsPreview: canManage
        ? toFiniteRate((billableSeconds / 3600) * effectiveRate)
        : 0,
      role: member.workspaceRole
        ? {
            id: member.workspaceRole.id,
            name: member.workspaceRole.name,
            permissionLevel: member.workspaceRole.permissionLevel,
            color: member.workspaceRole.color,
          }
        : null,
      department: member.department
        ? { id: member.department.id, name: member.department.name }
        : null,
      cohorts: member.cohorts.map((cohortMember) => ({
        id: cohortMember.cohort.id,
        name: cohortMember.cohort.name,
      })),
      personal: {
        firstName: profile?.firstName ?? '',
        middleName: profile?.middleName ?? '',
        lastName: profile?.lastName ?? '',
        contactNumber: profile?.contactNumber ?? '',
        birthDate: fromDateOnly(profile?.birthDate),
        gender: profile?.gender ?? '',
        maritalStatus: profile?.maritalStatus ?? '',
        address: profile?.address
          ? {
              buildingNo: profile.address.buildingNo ?? '',
              street: profile.address.street ?? '',
              city: profile.address.city ?? '',
              province: profile.address.province ?? '',
              postalCode: profile.address.postalCode ?? '',
              country: profile.address.country,
            }
          : null,
      },
      employeeProfile:
        canManage && employeeProfile
          ? {
              employeeNumber: employeeProfile.employeeNumber ?? '',
              positionTitle: employeeProfile.positionTitle ?? '',
              employmentType: employeeProfile.employmentType,
              employmentStatus: employeeProfile.employmentStatus,
              hireDate: fromDateOnly(employeeProfile.hireDate),
              regularizationDate: fromDateOnly(
                employeeProfile.regularizationDate,
              ),
              separationDate: fromDateOnly(employeeProfile.separationDate),
            }
          : null,
      governmentIds:
        canManage && employeeProfile?.governmentIds
          ? {
              sssNumber: employeeProfile.governmentIds.sssNumber ?? '',
              philHealthNumber:
                employeeProfile.governmentIds.philHealthNumber ?? '',
              tinNumber: employeeProfile.governmentIds.tinNumber ?? '',
              pagIbigNumber: employeeProfile.governmentIds.pagIbigNumber ?? '',
            }
          : null,
    },
  }
}

export async function updateMemberDetail(
  data: z.infer<typeof updateMemberDetailSchema>,
) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  const target = await prisma.workspaceMember.findFirst({
    where: { id: data.memberId, workspaceId: access.workspace.id },
  })
  if (!target) throw new Error('Member not found in this workspace.')

  await prisma.$transaction(async (tx) => {
    let employeeProfileId: string | null = null

    if (data.employeeProfile) {
      const e = data.employeeProfile
      const profile = await tx.employeeProfile.upsert({
        where: { workspaceMemberId: data.memberId },
        create: {
          workspaceMemberId: data.memberId,
          employeeNumber: emptyToNull(e.employeeNumber),
          positionTitle: emptyToNull(e.positionTitle),
          employmentType: e.employmentType ?? 'FULL_TIME',
          employmentStatus: e.employmentStatus ?? 'ACTIVE',
          hireDate: toDateOnly(e.hireDate),
          regularizationDate: toDateOnly(e.regularizationDate),
          separationDate: toDateOnly(e.separationDate),
        },
        update: {
          employeeNumber: emptyToNull(e.employeeNumber),
          positionTitle: emptyToNull(e.positionTitle),
          employmentType: e.employmentType,
          employmentStatus: e.employmentStatus,
          hireDate: toDateOnly(e.hireDate),
          regularizationDate: toDateOnly(e.regularizationDate),
          separationDate: toDateOnly(e.separationDate),
        },
      })
      employeeProfileId = profile.id
    } else {
      const profile = await tx.employeeProfile.findUnique({
        where: { workspaceMemberId: data.memberId },
      })
      employeeProfileId = profile?.id ?? null
    }

    if (data.governmentIds) {
      if (!employeeProfileId) {
        const profile = await tx.employeeProfile.create({
          data: { workspaceMemberId: data.memberId },
        })
        employeeProfileId = profile.id
      }

      const g = data.governmentIds
      await tx.employeeGovernmentId.upsert({
        where: { employeeProfileId },
        create: {
          employeeProfileId,
          sssNumber: emptyToNull(g.sssNumber),
          philHealthNumber: emptyToNull(g.philHealthNumber),
          tinNumber: emptyToNull(g.tinNumber),
          pagIbigNumber: emptyToNull(g.pagIbigNumber),
        },
        update: {
          sssNumber: emptyToNull(g.sssNumber),
          philHealthNumber: emptyToNull(g.philHealthNumber),
          tinNumber: emptyToNull(g.tinNumber),
          pagIbigNumber: emptyToNull(g.pagIbigNumber),
        },
      })
    }
  })
}

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
  contactNumber: z.string().trim().max(50).optional().or(z.literal('')),
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

function emptyToNull<T extends string | undefined>(v: T): string | null {
  if (v === undefined || v === '') return null
  return v
}

export async function updateProfile(data: z.infer<typeof updateProfileSchema>) {
  const access = await requireWorkspaceAccess()

  const birthDate = data.birthDate ? new Date(data.birthDate) : null
  const gender = data.gender || null
  const maritalStatus = data.maritalStatus ? data.maritalStatus : null

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: access.user.id },
      data: { name: data.name, image: data.avatarUrl || null },
    })

    const profile = await tx.userProfile.upsert({
      where: { userId: access.user.id },
      create: {
        userId: access.user.id,
        firstName: data.firstName,
        middleName: emptyToNull(data.middleName),
        lastName: data.lastName,
        contactNumber: emptyToNull(data.contactNumber),
        birthDate,
        gender,
        maritalStatus,
      },
      update: {
        firstName: data.firstName,
        middleName: emptyToNull(data.middleName),
        lastName: data.lastName,
        contactNumber: emptyToNull(data.contactNumber),
        birthDate,
        gender,
        maritalStatus,
      },
    })

    if (data.address) {
      const a = data.address
      await tx.userAddress.upsert({
        where: { userProfileId: profile.id },
        create: {
          userProfileId: profile.id,
          buildingNo: emptyToNull(a.buildingNo),
          street: emptyToNull(a.street),
          city: emptyToNull(a.city),
          province: emptyToNull(a.province),
          postalCode: emptyToNull(a.postalCode),
          country: a.country || 'Philippines',
        },
        update: {
          buildingNo: emptyToNull(a.buildingNo),
          street: emptyToNull(a.street),
          city: emptyToNull(a.city),
          province: emptyToNull(a.province),
          postalCode: emptyToNull(a.postalCode),
          country: a.country || 'Philippines',
        },
      })
    }
  })
}

export async function getSelfProfile() {
  const access = await requireWorkspaceAccess()
  const user = await prisma.user.findUnique({
    where: { id: access.user.id },
    include: {
      profile: {
        include: { address: true },
      },
    },
  })

  const profile = user?.profile
  return {
    user: {
      id: user?.id ?? access.user.id,
      name: user?.name ?? access.user.name,
      email: user?.email ?? access.user.email,
      image: user?.image ?? null,
    },
    profile: profile
      ? {
          firstName: profile.firstName,
          middleName: profile.middleName ?? '',
          lastName: profile.lastName,
          contactNumber: profile.contactNumber ?? '',
          birthDate: fromDateOnly(profile.birthDate),
          gender: profile.gender ?? '',
          maritalStatus: profile.maritalStatus ?? '',
        }
      : null,
    address: profile?.address
      ? {
          buildingNo: profile.address.buildingNo ?? '',
          street: profile.address.street ?? '',
          city: profile.address.city ?? '',
          province: profile.address.province ?? '',
          postalCode: profile.address.postalCode ?? '',
          country: profile.address.country,
        }
      : null,
  }
}

// ─── Workspace settings ───────────────────────────────────────────────────────

const updateWorkspaceSettingsSchema = z.object({
  name: z.string().trim().min(1).max(150),
  timezone: z.string().trim().min(1).max(80),
})

export async function updateWorkspaceSettings(
  data: z.infer<typeof updateWorkspaceSettingsSchema>,
) {
  const access = await requireWorkspaceAccess()

  const level = access.member.workspaceRole?.permissionLevel
  if (level !== 'OWNER') {
    throw new Error('Only the workspace Owner can change workspace settings.')
  }

  await prisma.workspace.update({
    where: { id: access.workspace.id },
    data: { name: data.name, timezone: data.timezone },
  })
}

// ─── Analytics dashboard ─────────────────────────────────────────────────────

export async function getAnalytics(
  data: z.infer<typeof analyticsRangeSchema>,
): Promise<AnalyticsPayload> {
  const access = await requireWorkspaceAccess()
  const range = getAnalyticsDateRange(data)
  const level = access.member.workspaceRole?.permissionLevel ?? 'EMPLOYEE'
  const departmentId = access.member.departmentId
  const defaultScope: AnalyticsSelectedScope =
    level === 'OWNER' || level === 'ADMIN'
      ? 'organization'
      : level === 'MANAGER'
        ? 'department'
        : 'personal'
  const requestedScope = data.scope ?? defaultScope
  const availableScopes: AnalyticsSelectedScope[] =
    level === 'OWNER' || level === 'ADMIN'
      ? ['personal', 'organization']
      : level === 'MANAGER'
        ? ['personal', 'department']
        : ['personal']

  let scope: AnalyticsScope = 'personal'
  let selectedScope: AnalyticsSelectedScope = 'personal'
  let scopeLabel = 'Your time'
  let notice: string | null = null
  let memberWhere: {
    workspaceId: string
    status: 'ACTIVE'
    departmentId?: string
  } | null = null
  const entryWhere: {
    workspaceId: string
    endedAt: { not: null }
    startedAt: { gte: Date; lt: Date }
    workspaceMemberId?: string
    workspaceMember?: { departmentId: string }
  } = {
    workspaceId: access.workspace.id,
    endedAt: { not: null },
    startedAt: { gte: range.start, lt: range.endExclusive },
  }

  if (
    (level === 'OWNER' || level === 'ADMIN') &&
    requestedScope === 'organization'
  ) {
    scope = 'workspace'
    selectedScope = 'organization'
    scopeLabel = `${access.workspace.name} workspace`
    memberWhere = { workspaceId: access.workspace.id, status: 'ACTIVE' }
  } else if (
    level === 'MANAGER' &&
    requestedScope === 'department' &&
    departmentId
  ) {
    const department = await prisma.department.findFirst({
      where: { id: departmentId, workspaceId: access.workspace.id },
      select: { name: true },
    })
    scope = 'department'
    selectedScope = 'department'
    scopeLabel = department?.name
      ? `${department.name} department`
      : 'Your department'
    entryWhere.workspaceMember = { departmentId }
    memberWhere = {
      workspaceId: access.workspace.id,
      status: 'ACTIVE',
      departmentId,
    }
  } else {
    entryWhere.workspaceMemberId = access.member.id
    if (level === 'MANAGER' && requestedScope === 'department') {
      notice =
        'Managers need a department assignment to see department analytics. Showing your own time for now.'
    }
  }

  const [entries, activeMembers] = await Promise.all([
    prisma.timeEntry.findMany({
      where: entryWhere,
      select: {
        description: true,
        billable: true,
        durationSeconds: true,
        startedAt: true,
        projectId: true,
        project: { select: { id: true, name: true, color: true } },
        tags: {
          select: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        workspaceMember: {
          select: {
            id: true,
            department: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { startedAt: 'asc' },
    }),
    memberWhere ? prisma.workspaceMember.count({ where: memberWhere }) : null,
  ])

  const dateKeys = buildDateKeys(range.start, range.end)
  const dailySeconds = new Map(dateKeys.map((date) => [date, 0]))
  const projectSeconds = new Map<
    string,
    { projectId: string; name: string; color: string; seconds: number }
  >()
  const taskSeconds = new Map<
    string,
    { description: string; seconds: number; entryCount: number }
  >()
  const tagSeconds = new Map<
    string,
    {
      tagId: string
      name: string
      color: string
      seconds: number
      entryCount: number
    }
  >()
  const departmentSeconds = new Map<
    string,
    {
      departmentId: string
      name: string
      color: string
      seconds: number
      memberIds: Set<string>
    }
  >()

  let totalSeconds = 0
  let billableSeconds = 0

  for (const entry of entries) {
    const seconds = Math.max(0, entry.durationSeconds)
    totalSeconds += seconds
    if (entry.billable) {
      billableSeconds += seconds
    }

    const date = toDateKey(entry.startedAt)
    dailySeconds.set(date, (dailySeconds.get(date) ?? 0) + seconds)

    const projectId = entry.project?.id ?? entry.projectId ?? 'none'
    const existingProject = projectSeconds.get(projectId)
    projectSeconds.set(projectId, {
      projectId,
      name: entry.project?.name ?? 'No project',
      color: entry.project?.color ?? '#94a3b8',
      seconds: (existingProject?.seconds ?? 0) + seconds,
    })

    if (selectedScope === 'personal') {
      const description = entry.description.trim() || 'Untitled task'
      const task = taskSeconds.get(description)
      taskSeconds.set(description, {
        description,
        seconds: (task?.seconds ?? 0) + seconds,
        entryCount: (task?.entryCount ?? 0) + 1,
      })
    }

    for (const entryTag of entry.tags) {
      const tag = entryTag.tag
      const existingTag = tagSeconds.get(tag.id)
      tagSeconds.set(tag.id, {
        tagId: tag.id,
        name: tag.name,
        color: tag.color,
        seconds: (existingTag?.seconds ?? 0) + seconds,
        entryCount: (existingTag?.entryCount ?? 0) + 1,
      })
    }

    const department = entry.workspaceMember.department
    const departmentKey = department?.id ?? 'unassigned'
    const existingDepartment = departmentSeconds.get(departmentKey)
    const memberIds = existingDepartment?.memberIds ?? new Set<string>()
    memberIds.add(entry.workspaceMember.id)
    departmentSeconds.set(departmentKey, {
      departmentId: departmentKey,
      name: department?.name ?? 'Unassigned',
      color: department?.color ?? '#94a3b8',
      seconds: (existingDepartment?.seconds ?? 0) + seconds,
      memberIds,
    })
  }

  const dailyTotals = dateKeys.map((date) => ({
    date,
    seconds: dailySeconds.get(date) ?? 0,
  }))
  const maxDailySeconds = Math.max(0, ...dailyTotals.map((day) => day.seconds))

  return {
    scope,
    selectedScope,
    availableScopes,
    scopeLabel,
    notice,
    startDate: range.startDate,
    endDate: range.endDate,
    summary: {
      totalSeconds,
      billableSeconds,
      nonBillableSeconds: totalSeconds - billableSeconds,
      entryCount: entries.length,
      activeMembers,
    },
    dailyTotals,
    projectTotals: [...projectSeconds.values()].sort(
      (a, b) => b.seconds - a.seconds,
    ),
    billableSplit: [
      { label: 'Billable', seconds: billableSeconds },
      { label: 'Non-billable', seconds: totalSeconds - billableSeconds },
    ],
    heatmap: dailyTotals.map((day) => ({
      ...day,
      intensity:
        maxDailySeconds === 0
          ? 0
          : Math.max(1, Math.ceil((day.seconds / maxDailySeconds) * 4)),
    })),
    topTasks: [...taskSeconds.values()]
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 8),
    topTags: [...tagSeconds.values()]
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 5),
    topDepartments: [...departmentSeconds.values()]
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 5)
      .map(({ memberIds, ...department }) => ({
        ...department,
        memberCount: memberIds.size,
      })),
  }
}

// ─── Member analytics (owner/admin only) ─────────────────────────────────────

export type MemberStat = {
  memberId: string
  totalSeconds: number
  billableSeconds: number
  entryCount: number
  thisWeekSeconds: number
  thisMonthSeconds: number
  topProjects: Array<{ projectId: string; seconds: number }>
}

export async function getMemberAnalytics(): Promise<MemberStat[]> {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  const now = new Date()

  const weekStart = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  const dayOfWeek = weekStart.getDay()
  weekStart.setDate(
    weekStart.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek),
  )

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const entries = await prisma.timeEntry.findMany({
    where: { workspaceId: access.workspace.id, endedAt: { not: null } },
    select: {
      workspaceMemberId: true,
      durationSeconds: true,
      billable: true,
      startedAt: true,
      projectId: true,
    },
  })

  const statsMap: Partial<
    Record<
      string,
      Omit<MemberStat, 'topProjects'> & {
        projectSeconds: Record<string, number>
      }
    >
  > = {}

  for (const entry of entries) {
    const id = entry.workspaceMemberId
    if (!statsMap[id]) {
      statsMap[id] = {
        memberId: id,
        totalSeconds: 0,
        billableSeconds: 0,
        entryCount: 0,
        thisWeekSeconds: 0,
        thisMonthSeconds: 0,
        projectSeconds: {},
      }
    }
    const s = statsMap[id]
    const secs = entry.durationSeconds
    s.totalSeconds += secs
    s.entryCount++
    if (entry.billable) s.billableSeconds += secs
    const entryStart = new Date(entry.startedAt)
    if (entryStart >= weekStart) s.thisWeekSeconds += secs
    if (entryStart >= monthStart) s.thisMonthSeconds += secs
    if (entry.projectId) {
      s.projectSeconds[entry.projectId] =
        (s.projectSeconds[entry.projectId] ?? 0) + secs
    }
  }

  return Object.values(statsMap)
    .filter((stat): stat is NonNullable<typeof stat> => Boolean(stat))
    .map(({ projectSeconds, ...rest }) => ({
      ...rest,
      topProjects: Object.entries(projectSeconds)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([projectId, seconds]) => ({ projectId, seconds })),
    }))
}

export const trackerSchemas = {
  entryInputSchema,
  startTimerSchema,
  entryIdSchema,
  updateEntrySchema,
  inviteMemberSchema,
  analyticsRangeSchema,
}
