import { createFileRoute } from '@tanstack/react-router'
import { SettingsScreen } from '#/components/time-tracker/WorkspaceScreens'

export const Route = createFileRoute('/app/workspace/settings')({
  component: SettingsScreen,
})

