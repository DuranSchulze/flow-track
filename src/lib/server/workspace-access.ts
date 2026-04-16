import { createServerFn } from '@tanstack/react-start'

export const getWorkspaceAccessFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { requireWorkspaceAccess } = await import('./workspace-access.server')
    return requireWorkspaceAccess()
  },
)
