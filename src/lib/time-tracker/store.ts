import { useEffect, useMemo, useState } from 'react'
import type { TimeEntry, TrackerState, ViewMode } from './types'

const STORAGE_KEY = 'clockify-timer.mvp-state.v1'

const now = new Date()
const startOfToday = new Date(now)
startOfToday.setHours(9, 0, 0, 0)

const yesterday = new Date(startOfToday)
yesterday.setDate(yesterday.getDate() - 1)

export const initialTrackerState: TrackerState = {
  workspace: {
    id: 'workspace-dfp',
    name: 'Duran File Pino',
    timezone: 'Asia/Manila',
  },
  currentUserId: 'user-ana',
  departments: [
    { id: 'dept-ops', name: 'Operations' },
    { id: 'dept-design', name: 'Design' },
    { id: 'dept-dev', name: 'Development' },
  ],
  cohorts: [
    { id: 'cohort-alpha', name: 'Alpha Cohort' },
    { id: 'cohort-night', name: 'Night Shift' },
  ],
  projects: [
    { id: 'project-clockify', name: 'Clockify Timer MVP', color: '#2563eb' },
    { id: 'project-client', name: 'Client Operations', color: '#059669' },
    { id: 'project-admin', name: 'Internal Admin', color: '#7c3aed' },
  ],
  tags: [
    { id: 'tag-build', name: 'Build', color: '#0f766e' },
    { id: 'tag-research', name: 'Research', color: '#9333ea' },
    { id: 'tag-meeting', name: 'Meeting', color: '#ca8a04' },
    { id: 'tag-support', name: 'Support', color: '#dc2626' },
  ],
  members: [
    {
      id: 'user-ana',
      name: 'Ana Santos',
      email: 'ana@duranfilepino.com',
      role: 'OWNER',
      departmentId: 'dept-dev',
      cohortIds: ['cohort-alpha'],
      status: 'ACTIVE',
    },
    {
      id: 'user-mika',
      name: 'Mika Reyes',
      email: 'mika@duranfilepino.com',
      role: 'ADMIN',
      departmentId: 'dept-ops',
      cohortIds: ['cohort-night'],
      status: 'ACTIVE',
    },
    {
      id: 'user-joel',
      name: 'Joel Cruz',
      email: 'joel@duranfilepino.com',
      role: 'EMPLOYEE',
      departmentId: 'dept-design',
      cohortIds: ['cohort-alpha'],
      status: 'INVITED',
    },
  ],
  entries: [
    {
      id: 'entry-1',
      userId: 'user-ana',
      description: 'Build timer dashboard layout',
      projectId: 'project-clockify',
      tagIds: ['tag-build'],
      billable: false,
      startedAt: startOfToday.toISOString(),
      endedAt: new Date(startOfToday.getTime() + 2.25 * 60 * 60 * 1000).toISOString(),
      durationSeconds: 8100,
      notes: 'Created MVP dashboard structure.',
    },
    {
      id: 'entry-2',
      userId: 'user-ana',
      description: 'Workspace permissions planning',
      projectId: 'project-admin',
      tagIds: ['tag-research', 'tag-meeting'],
      billable: false,
      startedAt: yesterday.toISOString(),
      endedAt: new Date(yesterday.getTime() + 1.5 * 60 * 60 * 1000).toISOString(),
      durationSeconds: 5400,
      notes: 'Owner/Admin/Employee rules.',
    },
  ],
}

export function useTrackerState() {
  const [state, setState] = useState<TrackerState>(initialTrackerState)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setState(JSON.parse(stored) as TrackerState)
      }
    } catch {
      setState(initialTrackerState)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return { state, setState }
}

export function getEntrySeconds(entry: TimeEntry, tick = Date.now()) {
  if (entry.endedAt) {
    return entry.durationSeconds
  }

  return Math.max(0, Math.floor((tick - new Date(entry.startedAt).getTime()) / 1000))
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

export function useFilteredEntries(entries: TimeEntry[], view: ViewMode, userId: string) {
  return useMemo(() => {
    const { start, end } = getViewRange(view)
    return entries
      .filter((entry) => entry.userId === userId)
      .filter((entry) => {
        const entryStart = new Date(entry.startedAt)
        return entryStart >= start && entryStart < end
      })
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
  }, [entries, userId, view])
}

export function dateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

