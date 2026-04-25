import { z } from 'zod'
import { prisma } from '#/db'
import { requireWorkspaceAccess } from '../workspace-access.server'
import { extractSheetId } from './extract-sheet-id'

export async function getServiceAccountEmail() {
  // Auth is required so anonymous visitors can't probe whether the env is configured.
  await requireWorkspaceAccess()
  const { getServiceAccountEmail: read } = await import('./auth.server')
  try {
    return { email: read() }
  } catch {
    return { email: null as string | null }
  }
}

const updateGoogleSheetSchema = z.object({
  url: z.string().trim().max(500),
})

export async function updateWorkspaceGoogleSheet(
  data: z.infer<typeof updateGoogleSheetSchema>,
) {
  const access = await requireWorkspaceAccess()

  const level = access.member.workspaceRole?.permissionLevel
  if (level !== 'OWNER') {
    throw new Error(
      'Only the workspace Owner can change the Google Sheet URL.',
    )
  }

  const trimmed = data.url.trim()
  if (trimmed === '') {
    await prisma.workspace.update({
      where: { id: access.workspace.id },
      data: {
        googleSheetUrl: null,
        googleSheetSyncedAt: null,
        googleSheetSyncedBy: null,
      },
    })
    return { url: null as string | null }
  }

  // Throws InvalidSheetUrlError on bad input — surfaces to the UI as a toast.
  extractSheetId(trimmed)

  await prisma.workspace.update({
    where: { id: access.workspace.id },
    data: { googleSheetUrl: trimmed },
  })
  return { url: trimmed }
}

export { updateGoogleSheetSchema }
