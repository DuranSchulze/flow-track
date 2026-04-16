import { useMemo } from 'react'
import type { TimeEntry, ViewMode } from './types'

export function getEntrySeconds(entry: TimeEntry, tick = Date.now()) {
  if (entry.endedAt) {
    return entry.durationSeconds
  }

  return Math.max(
    0,
    Math.floor((tick - new Date(entry.startedAt).getTime()) / 1000),
  )
}

export function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainder = safeSeconds % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

export function formatHours(seconds: number) {
  return `${(seconds / 3600).toFixed(2)}h`
}

export function getViewRange(view: ViewMode, date = new Date()) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)

  if (view === 'week') {
    const day = start.getDay()
    const offset = day === 0 ? -6 : 1 - day
    start.setDate(start.getDate() + offset)
  }

  if (view === 'month') {
    start.setDate(1)
  }

  const end = new Date(start)

  if (view === 'day') {
    end.setDate(start.getDate() + 1)
  } else if (view === 'week') {
    end.setDate(start.getDate() + 7)
  } else {
    end.setMonth(start.getMonth() + 1)
  }

  return { start, end }
}

export function useFilteredEntries(
  entries: TimeEntry[],
  view: ViewMode,
  workspaceMemberId: string,
) {
  return useMemo(() => {
    const { start, end } = getViewRange(view)
    return entries
      .filter((entry) => entry.workspaceMemberId === workspaceMemberId)
      .filter((entry) => {
        const entryStart = new Date(entry.startedAt)
        return entryStart >= start && entryStart < end
      })
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      )
  }, [entries, workspaceMemberId, view])
}

export function dateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}
