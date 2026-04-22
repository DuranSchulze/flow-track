import { createServerFn } from '@tanstack/react-start'

export const createWorkspaceFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { name: string; timezone?: string; slug?: string }) => {
      if (!input || typeof input.name !== 'string') {
        throw new Error('Workspace name is required.')
      }
      return {
        name: input.name,
        timezone: input.timezone,
        slug: input.slug,
      }
    },
  )
  .handler(async ({ data }) => {
    const { createWorkspaceForCurrentUser } = await import(
      './workspaces.server'
    )
    return createWorkspaceForCurrentUser(data)
  })
