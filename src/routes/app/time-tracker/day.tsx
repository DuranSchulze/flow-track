import { createFileRoute } from '@tanstack/react-router'
import { TimeTrackerDashboard } from '#/components/time-tracker/TimeTrackerDashboard'

export const Route = createFileRoute('/app/time-tracker/day')({
  component: () => <TimeTrackerDashboard view="day" />,
})

