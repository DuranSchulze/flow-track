import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '#/components/time-tracker/AppShell'

export const Route = createFileRoute('/app')({
  component: AppShell,
})

