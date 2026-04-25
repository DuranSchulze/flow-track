import { Button } from '#/components/ui/button'
import { formatHours } from '#/lib/time-tracker/store'
import type { ViewMode } from '#/lib/time-tracker/types'

const VIEW_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
] as const satisfies readonly { value: ViewMode; label: string }[]

export function DashboardHeader({
  workspaceName,
  userName,
  userRoleName,
  view,
  onChangeView,
  selectedTotalSeconds,
}: {
  workspaceName: string
  userName: string
  userRoleName: string
  view: ViewMode
  onChangeView: (view: ViewMode) => void
  selectedTotalSeconds: number
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-sm font-semibold text-primary">
            {workspaceName}
          </p>
          <h1 className="m-0 mt-1 text-2xl font-bold tracking-tight text-foreground">
            Time Tracker
          </h1>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            {userName} · {userRoleName}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div
            className="inline-flex overflow-hidden rounded-md border border-border bg-background p-1"
            role="group"
            aria-label="Time tracker view"
          >
            {VIEW_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={view === option.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onChangeView(option.value)}
                aria-pressed={view === option.value}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-muted px-4 py-3 text-right">
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {view} total
            </p>
            <p className="m-0 mt-1 text-2xl font-bold text-foreground">
              {formatHours(selectedTotalSeconds)}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
