import '@tanstack/react-start/server-only'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'
import { prisma } from '#/db'

export type WorkspaceAccess = Awaited<ReturnType<typeof requireWorkspaceAccess>>

export class WorkspaceAccessError extends Error {
  constructor(message = 'No workspace access found for this account.') {
    super(message)
    this.name = 'WorkspaceAccessError'
  }
}

export async function getAuthSession() {
  const request = getRequest()
  return auth.api.getSession({ headers: request.headers })
}

export async function requireWorkspaceAccess() {
  const session = await getAuthSession()

  if (!session?.user) {
    throw new WorkspaceAccessError('Please sign in to continue.')
  }

  const email = session.user.email.toLowerCase()
  const member = await prisma.workspaceMember.findFirst({
    where: {
      email: {
        equals: email,
        mode: 'insensitive',
      },
    },
    include: {
      workspace: true,
      workspaceRole: true,
      department: true,
      cohorts: {
        include: {
          cohort: true,
        },
      },
      employeeProfile: {
        include: {
          governmentIds: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  if (!member) {
    throw new WorkspaceAccessError()
  }

  if (member.userId && member.userId !== session.user.id) {
    throw new WorkspaceAccessError(
      'This workspace invitation is already linked to another account.',
    )
  }

  const linkedMember =
    member.userId === session.user.id && member.status === 'ACTIVE'
      ? member
      : await prisma.workspaceMember.update({
          where: {
            id: member.id,
          },
          data: {
            userId: member.userId ?? session.user.id,
            status: 'ACTIVE',
          },
          include: {
            workspace: true,
            workspaceRole: true,
            department: true,
            cohorts: {
              include: {
                cohort: true,
              },
            },
            employeeProfile: {
              include: {
                governmentIds: true,
              },
            },
          },
        })

  return {
    session,
    user: session.user,
    workspace: linkedMember.workspace,
    member: linkedMember,
  }
}
