import { formatHours } from '#/lib/time-tracker/store'
import { Metric } from './Metric'

export function MetricsRow({
  selectedTotalSeconds,
  billableSeconds,
  allPersonalSeconds,
}: {
  selectedTotalSeconds: number
  billableSeconds: number
  allPersonalSeconds: number
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <Metric label="Selected range" value={formatHours(selectedTotalSeconds)} />
      <Metric label="Billable in range" value={formatHours(billableSeconds)} />
      <Metric label="All personal time" value={formatHours(allPersonalSeconds)} />
    </section>
  )
}
