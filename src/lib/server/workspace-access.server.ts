import '@tanstack/react-start/server-only'
import { getRequest, getResponse } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'
import { prisma } from '#/db'

export type WorkspaceAccess = Awaited<ReturnType<typeof requireWorkspaceAccess>>

export class WorkspaceAccessError extends Error {
  constructor(message = 'No workspace access found for this account.') {
    super(message)
    this.name = 'WorkspaceAccessError'
  }
}

export const ACTIVE_WORKSPACE_COOKIE = 'active_workspace_slug'

const MEMBER_INCLUDE = {
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
} as const

export async function getAuthSession() {
  const request = getRequest()
  return auth.api.getSession({ headers: request.headers })
}

function readActiveWorkspaceCookie(): string | null {
  const cookieHeader = getRequest().headers.get('cookie')
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rest] = part.trim().split('=')
    if (rawName === ACTIVE_WORKSPACE_COOKIE) {
      return decodeURIComponent(rest.join('=')) || null
    }
  }
  return null
}

export function setActiveWorkspaceCookie(slug: string) {
  const response = getResponse()
  const value = encodeURIComponent(slug)
  response.headers.append(
    'set-cookie',
    `${ACTIVE_WORKSPACE_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`,
  )
}

export function clearActiveWorkspaceCookie() {
  const response = getResponse()
  response.headers.append(
    'set-cookie',
    `${ACTIVE_WORKSPACE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`,
  )
}

export async function listUserWorkspaces(userId: string, email: string) {
  const lowerEmail = email.toLowerCase()
  const members = await prisma.workspaceMember.findMany({
    where: {
      status: { in: ['ACTIVE', 'INVITED'] },
      OR: [
        { userId },
        { userId: null, email: { equals: lowerEmail, mode: 'insensitive' } },
      ],
    },
    include: {
      workspace: true,
      workspaceRole: true,
    },
    orderBy: { createdAt: 'asc' },
  })
  return members
}

export async function requireWorkspaceAccess(slug?: string | null) {
  const session = await getAuthSession()

  if (!session?.user) {
    throw new WorkspaceAccessError('Please sign in to continue.')
  }

  const userId = session.user.id
  const email = session.user.email.toLowerCase()

  const memberships = await prisma.workspaceMember.findMany({
    where: {
      OR: [
        { userId },
        { userId: null, email: { equals: email, mode: 'insensitive' } },
      ],
    },
    include: MEMBER_INCLUDE,
    orderBy: { createdAt: 'asc' },
  })

  if (memberships.length === 0) {
    throw new WorkspaceAccessError()
  }

  const requestedSlug = slug ?? readActiveWorkspaceCookie()

  let chosen =
    (requestedSlug &&
      memberships.find((m) => m.workspace.slug === requestedSlug)) ||
    memberships[0]

  if (chosen.userId && chosen.userId !== userId) {
    throw new WorkspaceAccessError(
      'This workspace invitation is already linked to another account.',
    )
  }

  if (!chosen.userId || chosen.status !== 'ACTIVE') {
    chosen = await prisma.workspaceMember.update({
      where: { id: chosen.id },
      data: { userId: chosen.userId ?? userId, status: 'ACTIVE' },
      include: MEMBER_INCLUDE,
    })
  }

  return {
    session,
    user: session.user,
    workspace: chosen.workspace,
    member: chosen,
  }
}
