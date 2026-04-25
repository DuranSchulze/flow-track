import { AlertTriangle, BarChart3 } from 'lucide-react'
import type { AnalyticsPayload } from '#/lib/server/tracker.server'
import { AnalyticsCharts } from './AnalyticsCharts'
import { AnalyticsDateRange } from './AnalyticsDateRange'
import { AnalyticsHeatmap } from './AnalyticsHeatmap'
import { AnalyticsSummaryCards } from './AnalyticsSummaryCards'
import type { AnalyticsQuery, AnalyticsScopeSearch } from './analytics.utils'
import { formatRange } from './analytics.utils'

const copyByScope = {
  workspace: {
    eyebrow: 'Workspace analytics',
    title: 'Organization activity',
    description: 'A clean view of completed tracked work across the workspace.',
  },
  department: {
    eyebrow: 'Department analytics',
    title: 'Department activity',
    description: 'Completed tracked work for members in your department.',
  },
  personal: {
    eyebrow: 'Personal analytics',
    title: 'Your time activity',
    description: 'A focused view of your completed tracked work.',
  },
} as const

const scopeLabels: Record<AnalyticsScopeSearch, string> = {
  personal: 'My analytics',
  organization: 'Organization',
  department: 'Department',
}

export function AnalyticsScreen({
  analytics,
  onChangeQuery,
}: {
  analytics: AnalyticsPayload
  onChangeQuery: (query: AnalyticsQuery) => void
}) {
  const copy = copyByScope[analytics.scope]
  const currentQuery = {
    startDate: analytics.startDate,
    endDate: analytics.endDate,
    scope: analytics.selectedScope,
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary">
              <BarChart3 className="h-3.5 w-3.5" />
              {copy.eyebrow}
            </div>
            <h1 className="m-0 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {copy.title}
            </h1>
            <p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {copy.description}
            </p>
            <p className="m-0 mt-3 text-sm font-bold text-foreground">
              {analytics.scopeLabel} ·{' '}
              {formatRange(analytics.startDate, analytics.endDate)}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-start xl:items-end">
            {analytics.availableScopes.length > 1 && (
              <div className="inline-flex w-fit rounded-lg border border-border bg-background p-1">
                {analytics.availableScopes.map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => onChangeQuery({ ...currentQuery, scope })}
                    className={`h-9 rounded-md px-3 text-sm font-bold transition-colors ${
                      analytics.selectedScope === scope
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    {scopeLabels[scope]}
                  </button>
                ))}
              </div>
            )}

            <AnalyticsDateRange
              range={{
                startDate: analytics.startDate,
                endDate: analytics.endDate,
              }}
              onChangeRange={(range) =>
                onChangeQuery({ ...range, scope: analytics.selectedScope })
              }
            />
          </div>
        </div>
      </section>

      {analytics.notice && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-medium text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="m-0">{analytics.notice}</p>
        </div>
      )}

      <AnalyticsSummaryCards summary={analytics.summary} />
      <AnalyticsCharts analytics={analytics} />
      <AnalyticsHeatmap
        heatmap={analytics.heatmap}
        projectTotals={analytics.projectTotals}
        topTasks={analytics.topTasks}
        topTags={analytics.topTags}
        topDepartments={analytics.topDepartments}
        selectedScope={analytics.selectedScope}
      />
    </div>
  )
}
