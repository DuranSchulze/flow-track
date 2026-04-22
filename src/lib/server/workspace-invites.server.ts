import '@tanstack/react-start/server-only'
import crypto from 'node:crypto'
import { prisma } from '#/db'
import { sendInviteEmail } from './mailer'
import {
  getAuthSession,
  requireWorkspaceAccess,
  setActiveWorkspaceCookie,
} from './workspace-access.server'

const INVITE_TTL_DAYS = 7

export class WorkspaceInviteError extends Error {
  readonly code: InviteErrorCode
  constructor(code: InviteErrorCode, message: string) {
    super(message)
    this.name = 'WorkspaceInviteError'
    this.code = code
  }
}

export type InviteErrorCode =
  | 'not_found'
  | 'expired'
  | 'revoked'
  | 'already_accepted'
  | 'wrong_account'
  | 'forbidden'
  | 'duplicate'
  | 'invalid_role'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function getAppUrl(): string {
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

function assertOwnerOrAdmin(access: {
  member: { workspaceRole: { permissionLevel: string } | null }
}) {
  const level = access.member.workspaceRole?.permissionLevel
  if (level !== 'OWNER' && level !== 'ADMIN') {
    throw new WorkspaceInviteError(
      'forbidden',
      'Only Owners and Admins can manage invites.',
    )
  }
}

export async function listWorkspaceInvites() {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)
  return prisma.workspaceInvite.findMany({
    where: { workspaceId: access.workspace.id, acceptedAt: null, revokedAt: null },
    include: { workspaceRole: true, department: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createWorkspaceInvite(input: {
  email: string
  workspaceRoleId: string
  departmentId?: string | null
}) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  const email = input.email.trim().toLowerCase()
  if (!email.includes('@')) {
    throw new WorkspaceInviteError('duplicate', 'Enter a valid email address.')
  }

  const role = await prisma.workspaceRole.findFirst({
    where: { id: input.workspaceRoleId, workspaceId: access.workspace.id },
  })
  if (!role) {
    throw new WorkspaceInviteError('invalid_role', 'Selected role does not exist.')
  }

  const existingMember = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: access.workspace.id,
      email: { equals: email, mode: 'insensitive' },
      status: 'ACTIVE',
    },
  })
  if (existingMember) {
    throw new WorkspaceInviteError(
      'duplicate',
      `${input.email} is already a member of this workspace.`,
    )
  }

  const token = generateToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

  const invite = await prisma.workspaceInvite.upsert({
    where: {
      workspaceId_email: { workspaceId: access.workspace.id, email },
    },
    update: {
      workspaceRoleId: role.id,
      departmentId: input.departmentId ?? null,
      invitedById: access.member.id,
      tokenHash,
      expiresAt,
      acceptedAt: null,
      revokedAt: null,
    },
    create: {
      workspaceId: access.workspace.id,
      email,
      workspaceRoleId: role.id,
      departmentId: input.departmentId ?? null,
      invitedById: access.member.id,
      tokenHash,
      expiresAt,
    },
    include: { workspaceRole: true },
  })

  await sendInviteEmail({
    to: email,
    workspaceName: access.workspace.name,
    inviterName: access.user.name || access.user.email,
    roleName: invite.workspaceRole?.name ?? 'Member',
    inviteUrl: `${getAppUrl()}/invite/${token}`,
  })

  return {
    id: invite.id,
    email: invite.email,
    expiresAt: invite.expiresAt,
  }
}

export async function resendWorkspaceInvite(input: { inviteId: string }) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  const invite = await prisma.workspaceInvite.findFirst({
    where: { id: input.inviteId, workspaceId: access.workspace.id },
    include: { workspaceRole: true },
  })
  if (!invite) throw new WorkspaceInviteError('not_found', 'Invite not found.')
  if (invite.acceptedAt)
    throw new WorkspaceInviteError('already_accepted', 'Invite already accepted.')

  const token = generateToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

  const updated = await prisma.workspaceInvite.update({
    where: { id: invite.id },
    data: { tokenHash, expiresAt, revokedAt: null },
    include: { workspaceRole: true },
  })

  await sendInviteEmail({
    to: updated.email,
    workspaceName: access.workspace.name,
    inviterName: access.user.name || access.user.email,
    roleName: updated.workspaceRole?.name ?? 'Member',
    inviteUrl: `${getAppUrl()}/invite/${token}`,
  })

  return { id: updated.id, expiresAt: updated.expiresAt }
}

export async function revokeWorkspaceInvite(input: { inviteId: string }) {
  const access = await requireWorkspaceAccess()
  assertOwnerOrAdmin(access)

  const invite = await prisma.workspaceInvite.findFirst({
    where: { id: input.inviteId, workspaceId: access.workspace.id },
  })
  if (!invite) throw new WorkspaceInviteError('not_found', 'Invite not found.')

  await prisma.workspaceInvite.update({
    where: { id: invite.id },
    data: { revokedAt: new Date() },
  })
  return { id: invite.id }
}

export type InvitePreview = {
  workspaceName: string
  inviteEmail: string
  roleName: string
  inviterName: string | null
  status: 'ready' | 'expired' | 'revoked' | 'already_accepted' | 'not_found'
}

async function loadInviteByToken(token: string) {
  const tokenHash = hashToken(token)
  return prisma.workspaceInvite.findUnique({
    where: { tokenHash },
    include: {
      workspace: true,
      workspaceRole: true,
      invitedBy: { include: { user: true } },
    },
  })
}

export async function previewInvite(token: string): Promise<InvitePreview> {
  const invite = await loadInviteByToken(token)
  if (!invite) {
    return {
      workspaceName: '',
      inviteEmail: '',
      roleName: '',
      inviterName: null,
      status: 'not_found',
    }
  }
  const base = {
    workspaceName: invite.workspace.name,
    inviteEmail: invite.email,
    roleName: invite.workspaceRole?.name ?? 'Member',
    inviterName:
      invite.invitedBy?.user?.name ?? invite.invitedBy?.email ?? null,
  }
  if (invite.revokedAt) return { ...base, status: 'revoked' }
  if (invite.acceptedAt) return { ...base, status: 'already_accepted' }
  if (invite.expiresAt < new Date()) return { ...base, status: 'expired' }
  return { ...base, status: 'ready' }
}

export async function acceptInvite(token: string) {
  const session = await getAuthSession()
  if (!session?.user) {
    throw new WorkspaceInviteError(
      'forbidden',
      'Please sign in to accept this invitation.',
    )
  }

  const invite = await loadInviteByToken(token)
  if (!invite) throw new WorkspaceInviteError('not_found', 'Invite not found.')
  if (invite.revokedAt)
    throw new WorkspaceInviteError('revoked', 'This invitation was revoked.')
  if (invite.acceptedAt)
    throw new WorkspaceInviteError(
      'already_accepted',
      'This invitation was already accepted.',
    )
  if (invite.expiresAt < new Date())
    throw new WorkspaceInviteError('expired', 'This invitation has expired.')

  const userEmail = session.user.email.toLowerCase()
  if (userEmail !== invite.email.toLowerCase()) {
    throw new WorkspaceInviteError(
      'wrong_account',
      `This invitation is for ${invite.email}. You are signed in as ${session.user.email}.`,
    )
  }

  const result = await prisma.$transaction(async (tx) => {
    const member = await tx.workspaceMember.upsert({
      where: {
        workspaceId_email: {
          workspaceId: invite.workspaceId,
          email: invite.email,
        },
      },
      update: {
        userId: session.user.id,
        workspaceRoleId: invite.workspaceRoleId,
        departmentId: invite.departmentId,
        invitedById: invite.invitedById,
        status: 'ACTIVE',
      },
      create: {
        workspaceId: invite.workspaceId,
        email: invite.email,
        userId: session.user.id,
        workspaceRoleId: invite.workspaceRoleId,
        departmentId: invite.departmentId,
        invitedById: invite.invitedById,
        status: 'ACTIVE',
      },
    })

    await tx.workspaceInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    })

    return member
  })

  setActiveWorkspaceCookie(invite.workspace.slug)

  return {
    workspaceId: invite.workspaceId,
    slug: invite.workspace.slug,
    name: invite.workspace.name,
    memberId: result.id,
  }
}
