import '@tanstack/react-start/server-only'
import { z } from 'zod'
import { prisma } from '#/db'
import { requireWorkspaceAccess } from './workspace-access.server'
import type { TrackerState } from '#/lib/time-tracker/types'

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
    throw new Error('One or more selected tags are not available in this workspace.')
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

export async function createManualEntry(data: z.infer<typeof entryInputSchema>) {
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

function assertOwnerOrAdmin(access: { member: { workspaceRole: { permissionLevel: string } | null } }) {
  const level = access.member.workspaceRole?.permissionLevel
  if (level !== 'OWNER' && level !== 'ADMIN') {
    throw new Error('Only Owners and Admins can perform this action.')
  }
}

export async function createWorkspaceMember(data: z.infer<typeof inviteMemberSchema>) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  const email = data.email.toLowerCase()

  const existing = await prisma.workspaceMember.findFirst({
    where: { workspaceId: access.workspace.id, email: { equals: email, mode: 'insensitive' } },
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

export async function createWorkspaceRole(data: z.infer<typeof createRoleSchema>) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  const existing = await prisma.workspaceRole.findFirst({
    where: { workspaceId: access.workspace.id, name: { equals: data.name, mode: 'insensitive' } },
  })

  if (existing) {
    throw new Error(`A role named "${data.name}" already exists in this workspace.`)
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
    where: { workspaceId: access.workspace.id, name: { equals: data.name, mode: 'insensitive' } },
  })
  if (existing) throw new Error(`A project named "${data.name}" already exists.`)

  await prisma.project.create({
    data: { workspaceId: access.workspace.id, name: data.name, color: data.color },
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
    where: { workspaceId: access.workspace.id, name: { equals: data.name, mode: 'insensitive' } },
  })
  if (existing) throw new Error(`A tag named "${data.name}" already exists.`)

  await prisma.tag.create({
    data: { workspaceId: access.workspace.id, name: data.name, color: data.color },
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

export async function createDepartment(data: z.infer<typeof createDepartmentSchema>) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  const existing = await prisma.department.findFirst({
    where: { workspaceId: access.workspace.id, name: { equals: data.name, mode: 'insensitive' } },
  })
  if (existing) throw new Error(`A department named "${data.name}" already exists.`)

  await prisma.department.create({
    data: {
      workspaceId: access.workspace.id,
      name: data.name,
      description: data.description,
      color: data.color,
    },
  })
}

export async function updateDepartment(data: z.infer<typeof updateDepartmentSchema>) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  await prisma.department.updateMany({
    where: { id: data.id, workspaceId: access.workspace.id },
    data: {
      name: data.name,
      description: data.description,
      ...(data.color !== undefined && { color: data.color }),
      ...(data.headMemberId !== undefined && { headMemberId: data.headMemberId || null }),
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
})

const updateCohortSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
})

export async function createCohort(data: z.infer<typeof createCohortSchema>) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  const existing = await prisma.cohort.findFirst({
    where: { workspaceId: access.workspace.id, name: { equals: data.name, mode: 'insensitive' } },
  })
  if (existing) throw new Error(`A cohort named "${data.name}" already exists.`)

  await prisma.cohort.create({
    data: { workspaceId: access.workspace.id, name: data.name },
  })
}

export async function updateCohort(data: z.infer<typeof updateCohortSchema>) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  await prisma.cohort.updateMany({
    where: { id: data.id, workspaceId: access.workspace.id },
    data: { name: data.name },
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

export async function updateWorkspaceMember(data: z.infer<typeof updateWorkspaceMemberSchema>) {
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
    if (!roleExists) throw new Error('Selected role does not exist in this workspace.')
  }

  await prisma.$transaction(async (tx) => {
    await tx.workspaceMember.update({
      where: { id: data.memberId },
      data: {
        ...(data.workspaceRoleId !== undefined && { workspaceRoleId: data.workspaceRoleId }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId || null }),
      },
    })

    if (data.cohortIds !== undefined) {
      await tx.cohortMember.deleteMany({ where: { memberId: data.memberId } })
      if (data.cohortIds.length > 0) {
        await tx.cohortMember.createMany({
          data: data.cohortIds.map((cohortId) => ({ cohortId, memberId: data.memberId })),
        })
      }
    }
  })
}

export async function setMemberStatus(data: z.infer<typeof setMemberStatusSchema>) {
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

// ─── Profile update ───────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(150),
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  contactNumber: z.string().trim().max(50).optional(),
  avatarUrl: z.string().url().max(500).optional().or(z.literal('')),
})

export async function updateProfile(data: z.infer<typeof updateProfileSchema>) {
  const access = await requireWorkspaceAccess()

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: access.user.id },
      data: { name: data.name, image: data.avatarUrl || null },
    })

    await tx.userProfile.upsert({
      where: { userId: access.user.id },
      create: {
        userId: access.user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        contactNumber: data.contactNumber,
      },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        contactNumber: data.contactNumber,
      },
    })
  })
}

// ─── Workspace settings ───────────────────────────────────────────────────────

const updateWorkspaceSettingsSchema = z.object({
  name: z.string().trim().min(1).max(150),
  timezone: z.string().trim().min(1).max(80),
})

export async function updateWorkspaceSettings(data: z.infer<typeof updateWorkspaceSettingsSchema>) {
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

export const trackerSchemas = {
  entryInputSchema,
  startTimerSchema,
  entryIdSchema,
  updateEntrySchema,
  inviteMemberSchema,
}
