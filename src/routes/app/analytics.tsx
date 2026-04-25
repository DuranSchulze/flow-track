import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AnalyticsScreen } from '#/components/time-tracker/analytics/AnalyticsScreen'
import type {
  AnalyticsQuery,
  AnalyticsScopeSearch,
} from '#/components/time-tracker/analytics/analytics.utils'
import {
  getDefaultAnalyticsRange,
  isAnalyticsScope,
  isDateKey,
  parseDateKey,
} from '#/components/time-tracker/analytics/analytics.utils'
import { getAnalyticsFn } from '#/lib/server/tracker'

type AnalyticsSearch = {
  startDate?: string
  endDate?: string
  scope?: AnalyticsScopeSearch
}

function resolveQuery(search: AnalyticsSearch): AnalyticsQuery {
  if (isDateKey(search.startDate) && isDateKey(search.endDate)) {
    const start = parseDateKey(search.startDate)
    const end = parseDateKey(search.endDate)
    if (start && end && start <= end) {
      return {
        startDate: search.startDate,
        endDate: search.endDate,
        scope: search.scope,
      }
    }
  }

  return {
    ...getDefaultAnalyticsRange(),
    scope: search.scope,
  }
}

export const Route = createFileRoute('/app/analytics')({
  validateSearch: (search: Record<string, unknown>): AnalyticsSearch => ({
    startDate: isDateKey(search.startDate) ? search.startDate : undefined,
    endDate: isDateKey(search.endDate) ? search.endDate : undefined,
    scope: isAnalyticsScope(search.scope) ? search.scope : undefined,
  }),
  loaderDeps: ({ search }) => resolveQuery(search),
  loader: ({ deps }) => getAnalyticsFn({ data: deps }),
  staleTime: 30_000,
  component: AnalyticsRoute,
})

function AnalyticsRoute() {
  const analytics = Route.useLoaderData()
  const navigate = useNavigate()

  function changeQuery(query: AnalyticsQuery) {
    void navigate({
      to: '/app/analytics',
      search: query,
    })
  }

  return <AnalyticsScreen analytics={analytics} onChangeQuery={changeQuery} />
}
