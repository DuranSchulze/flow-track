import { createFileRoute } from '@tanstack/react-router'
import { ProfileScreen } from '#/components/time-tracker/WorkspaceScreens'

export const Route = createFileRoute('/app/profile')({
  component: ProfileScreen,
})

