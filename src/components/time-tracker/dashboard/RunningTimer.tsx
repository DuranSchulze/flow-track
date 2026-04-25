import {
  formatDurationPrecise,
  getEntrySecondsPrecise,
} from '#/lib/time-tracker/store'
import type { TimeEntry } from '#/lib/time-tracker/types'
import { useNowTick } from './hooks/useNowTick'

export function RunningTimer({ entry }: { entry: TimeEntry }) {
  const tick = useNowTick(50)

  return (
    <p className="m-0 font-mono text-2xl font-bold tabular-nums text-foreground">
      {formatDurationPrecise(getEntrySecondsPrecise(entry, tick))}
    </p>
  )
}
