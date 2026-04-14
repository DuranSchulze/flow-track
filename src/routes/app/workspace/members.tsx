import { createFileRoute } from '@tanstack/react-router'
import { MembersScreen } from '#/components/time-tracker/WorkspaceScreens'

export const Route = createFileRoute('/app/workspace/members')({
  component: MembersScreen,
})

