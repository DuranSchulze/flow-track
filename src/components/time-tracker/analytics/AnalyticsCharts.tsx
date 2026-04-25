import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalyticsPayload } from '#/lib/server/tracker.server'
import { formatChartDate, formatHours, toChartHours } from './analytics.utils'

const fallbackColors = ['#2563eb', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6']

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm font-semibold text-muted-foreground">
      {label}
    </div>
  )
}

function ChartShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="m-0 text-base font-black text-foreground">{title}</h2>
        <p className="m-0 mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

export function AnalyticsCharts({
  analytics,
}: {
  analytics: AnalyticsPayload
}) {
  const trendData = analytics.dailyTotals.map((day) => ({
    date: day.date,
    label: formatChartDate(day.date),
    hours: toChartHours(day.seconds),
  }))
  const projectData = analytics.projectTotals.slice(0, 8).map((project) => ({
    name: project.name,
    hours: toChartHours(project.seconds),
    color: project.color,
  }))
  const billableData = analytics.billableSplit
    .filter((item) => item.seconds > 0)
    .map((item, index) => ({
      name: item.label,
      seconds: item.seconds,
      hours: toChartHours(item.seconds),
      color: index === 0 ? '#16a34a' : '#94a3b8',
    }))

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
      <ChartShell
        title="Daily trend"
        subtitle="Hours tracked per day in the selected range."
      >
        {analytics.summary.totalSeconds === 0 ? (
          <EmptyPanel label="No completed time entries in this range." />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient
                    id="analyticsTrend"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip
                  formatter={(value) => [`${value}h`, 'Hours']}
                  labelFormatter={(_, payload) => payload[0]?.payload.date}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#analyticsTrend)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartShell>

      <ChartShell
        title="Billable split"
        subtitle="How much of the selected time can be billed."
      >
        {billableData.length === 0 ? (
          <EmptyPanel label="No billable data yet." />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={billableData}
                  dataKey="seconds"
                  nameKey="name"
                  innerRadius={72}
                  outerRadius={105}
                  paddingAngle={3}
                >
                  {billableData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatHours(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartShell>

      <ChartShell
        title="Project breakdown"
        subtitle="Top projects by tracked hours."
      >
        {projectData.length === 0 ? (
          <EmptyPanel label="Projects will appear after entries are completed." />
        ) : (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={projectData}
                layout="vertical"
                margin={{ left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <Tooltip formatter={(value) => [`${value}h`, 'Hours']} />
                <Bar dataKey="hours" radius={[0, 6, 6, 0]}>
                  {projectData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.color ||
                        fallbackColors[index % fallbackColors.length]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartShell>
    </div>
  )
}
