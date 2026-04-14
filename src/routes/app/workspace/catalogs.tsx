import { createFileRoute } from '@tanstack/react-router'
import { CatalogsScreen } from '#/components/time-tracker/WorkspaceScreens'

export const Route = createFileRoute('/app/workspace/catalogs')({
  component: CatalogsScreen,
})

