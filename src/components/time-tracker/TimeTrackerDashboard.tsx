import { useEffect, useMemo, useState } from 'react'
import { gooeyToast } from 'goey-toast'
import { useRouter } from '@tanstack/react-router'
import { Copy, Pause, Pencil, Play, Plus, Save, Trash2 } from 'lucide-react'
import {
  dateTimeLocalValue,
  formatDuration,
  formatHours,
  getEntrySeconds,
  getViewRange,
  useFilteredEntries,
} from '#/lib/time-tracker/store'
import {
  createManualEntryFn,
  deleteEntryFn,
  duplicateEntryFn,
  startTimerFn,
  stopTimerFn,
  updateEntryFn,
} from '#/lib/server/tracker'
import type {
  TimeEntry,
  TrackerState,
  ViewMode,
} from '#/lib/time-tracker/types'

type DraftEntry = {
  description: string
  projectId: string
  tagIds: string[]
  billable: boolean
  startedAt: string
  endedAt: string
  notes: string
}

const emptyDraft = (projectId = '', tagId = ''): DraftEntry => {
  const start = new Date()
  start.setMinutes(0, 0, 0)
  const end = new Date(start)
  end.setHours(start.getHours() + 1)

  return {
    description: '',
    projectId,
    tagIds: tagId ? [tagId] : [],
    billable: false,
    startedAt: dateTimeLocalValue(start),
    endedAt: dateTimeLocalValue(end),
    notes: '',
  }
}

export function TimeTrackerDashboard({
  state,
  view = 'week',
}: {
  state: TrackerState
  view?: ViewMode
}) {
  const router = useRouter()
  const [tick, setTick] = useState(() => Date.now())
  const [timerDescription, setTimerDescription] = useState('')
  const [timerProjectId, setTimerProjectId] = useState(
    state.projects[0]?.id || '',
  )
  const [timerTagIds, setTimerTagIds] = useState<string[]>([
    state.tags[0]?.id || '',
  ])
  const [timerBillable, setTimerBillable] = useState(false)
  const [draft, setDraft] = useState<DraftEntry>(() =>
    emptyDraft(state.projects[0]?.id || '', state.tags[0]?.id || ''),
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<DraftEntry>(() =>
    emptyDraft(state.projects[0]?.id || '', state.tags[0]?.id || ''),
  )
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!timerProjectId && state.projects[0]) {
      setTimerProjectId(state.projects[0].id)
    }
    if (!timerTagIds.filter(Boolean).length && state.tags[0]) {
      setTimerTagIds([state.tags[0].id])
    }
  }, [state.projects, state.tags, timerProjectId, timerTagIds])

  const currentUser = state.members.find(
    (member) => member.id === state.currentMemberId,
  )!
  const activeEntry = state.entries.find(
    (entry) =>
      entry.workspaceMemberId === state.currentMemberId && !entry.endedAt,
  )
  const filteredEntries = useFilteredEntries(
    state.entries,
    view,
    state.currentMemberId,
  )

  const totals = useMemo(() => {
    const selectedTotal = filteredEntries.reduce(
      (sum, entry) => sum + getEntrySeconds(entry, tick),
      0,
    )
    const allPersonal = state.entries
      .filter((entry) => entry.workspaceMemberId === state.currentMemberId)
      .reduce((sum, entry) => sum + getEntrySeconds(entry, tick), 0)
    const billable = filteredEntries
      .filter((entry) => entry.billable)
      .reduce((sum, entry) => sum + getEntrySeconds(entry, tick), 0)

    return { selectedTotal, allPersonal, billable }
  }, [filteredEntries, state.currentMemberId, state.entries, tick])

  const range = getViewRange(view)

  function selectedTags(tagIds: string[]) {
    return state.tags.filter((tag) => tagIds.includes(tag.id))
  }

  function calculateManualSeconds(entryDraft: DraftEntry) {
    const start = new Date(entryDraft.startedAt)
    const end = new Date(entryDraft.endedAt)
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000))
  }

  async function runMutation(
    action: () => Promise<void>,
    successMessage?: string,
  ) {
    setPending(true)
    try {
      await action()
      await router.invalidate()
      if (successMessage) {
        gooeyToast.success(successMessage)
      }
    } catch (mutationError) {
      gooeyToast.error('Action failed', {
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'Something went wrong. Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  function toEntryPayload(entryDraft: DraftEntry) {
    const startedAt = new Date(entryDraft.startedAt)
    const endedAt = new Date(entryDraft.endedAt)

    return {
      description: entryDraft.description.trim(),
      projectId: entryDraft.projectId,
      tagIds: entryDraft.tagIds.filter(Boolean),
      billable: entryDraft.billable,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationSeconds: calculateManualSeconds(entryDraft),
      notes: entryDraft.notes.trim(),
    }
  }

  function startTimer() {
    if (activeEntry || !timerDescription.trim()) {
      return
    }

    void runMutation(async () => {
      await startTimerFn({
        data: {
          description: timerDescription.trim(),
          projectId: timerProjectId,
          tagIds: timerTagIds.filter(Boolean),
          billable: timerBillable,
        },
      })
      setTimerDescription('')
    }, 'Timer started')
  }

  function stopTimer() {
    if (!activeEntry) {
      return
    }

    void runMutation(
      () => stopTimerFn({ data: { id: activeEntry.id } }),
      'Timer stopped',
    )
  }

  function addManualEntry() {
    if (!draft.description.trim() || calculateManualSeconds(draft) <= 0) {
      return
    }

    void runMutation(async () => {
      await createManualEntryFn({ data: toEntryPayload(draft) })
      setDraft(emptyDraft(state.projects[0]?.id || '', state.tags[0]?.id || ''))
    }, 'Entry added')
  }

  function removeEntry(id: string) {
    void runMutation(() => deleteEntryFn({ data: { id } }), 'Entry deleted')
  }

  function duplicateEntry(entry: TimeEntry) {
    void runMutation(
      () => duplicateEntryFn({ data: { id: entry.id } }),
      'Entry duplicated',
    )
  }

  function openEdit(entry: TimeEntry) {
    setEditingId(entry.id)
    setEditingDraft({
      description: entry.description,
      projectId: entry.projectId,
      tagIds: entry.tagIds,
      billable: entry.billable,
      startedAt: dateTimeLocalValue(new Date(entry.startedAt)),
      endedAt: dateTimeLocalValue(new Date(entry.endedAt || Date.now())),
      notes: entry.notes,
    })
  }

  function saveEdit() {
    if (!editingId || !editingDraft.description.trim()) {
      return
    }

    void runMutation(async () => {
      await updateEntryFn({
        data: {
          id: editingId,
          ...toEntryPayload(editingDraft),
        },
      })
      setEditingId(null)
    }, 'Entry saved')
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-semibold text-teal-700">
              {state.workspace.name}
            </p>
            <h1 className="m-0 mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Time Tracker
            </h1>
            <p className="m-0 mt-1 text-sm text-slate-500">
              {currentUser.name} - {currentUser.roleName}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {view} total
            </p>
            <p className="m-0 mt-1 text-2xl font-bold text-slate-950">
              {formatHours(totals.selectedTotal)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_150px]">
          <input
            value={timerDescription}
            onChange={(event) => setTimerDescription(event.target.value)}
            placeholder="What are you working on?"
            className="h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
          />
          <select
            value={timerProjectId}
            onChange={(event) => setTimerProjectId(event.target.value)}
            className="h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
          >
            {state.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            value={timerTagIds[0] || ''}
            onChange={(event) => setTimerTagIds([event.target.value])}
            className="h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
          >
            {state.tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={activeEntry ? stopTimer : startTimer}
            disabled={pending || (!activeEntry && !timerDescription.trim())}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {activeEntry ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {activeEntry ? 'Stop' : 'Start'}
          </button>
        </div>

        <label className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={timerBillable}
            onChange={(event) => setTimerBillable(event.target.checked)}
          />
          Billable
        </label>

        {activeEntry && (
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
            <p className="m-0 text-sm font-semibold text-teal-800">
              Running now
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 font-bold text-slate-950">
                {activeEntry.description}
              </p>
              <p className="m-0 font-mono text-2xl font-bold text-slate-950">
                {formatDuration(getEntrySeconds(activeEntry, tick))}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Metric
          label="Selected range"
          value={formatHours(totals.selectedTotal)}
        />
        <Metric
          label="Billable in range"
          value={formatHours(totals.billable)}
        />
        <Metric
          label="All personal time"
          value={formatHours(totals.allPersonal)}
        />
      </section>

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-bold text-slate-950">
              Manual entry
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Add time when work was tracked outside the timer.
            </p>
          </div>
          <button
            type="button"
            onClick={addManualEntry}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800"
          >
            <Plus className="h-4 w-4" />
            Add entry
          </button>
        </div>
        <EntryDraftForm
          draft={draft}
          setDraft={setDraft}
          projects={state.projects}
          tags={state.tags}
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="m-0 text-lg font-bold text-slate-950">Entries</h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              {range.start.toLocaleDateString()} to{' '}
              {new Date(range.end.getTime() - 1).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Billable</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => {
                const project = state.projects.find(
                  (item) => item.id === entry.projectId,
                )
                return (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      {editingId === entry.id ? (
                        <EntryDraftForm
                          compact
                          draft={editingDraft}
                          setDraft={setEditingDraft}
                          projects={state.projects}
                          tags={state.tags}
                        />
                      ) : (
                        <div>
                          <p className="m-0 font-semibold text-slate-950">
                            {entry.description}
                          </p>
                          <p className="m-0 mt-1 text-xs text-slate-500">
                            {new Date(entry.startedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {project?.name || 'No project'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {selectedTags(entry.tagIds).map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {entry.billable ? 'Yes' : 'No'}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold">
                      {formatDuration(getEntrySeconds(entry, tick))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {editingId === entry.id ? (
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={pending}
                            className="rounded-lg bg-slate-950 p-2 text-white"
                            aria-label="Save entry"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEdit(entry)}
                            disabled={pending}
                            className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
                            aria-label="Edit entry"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => duplicateEntry(entry)}
                          disabled={pending}
                          className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
                          aria-label="Duplicate entry"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          disabled={pending}
                          className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50"
                          aria-label="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="m-0 mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  )
}

function EntryDraftForm({
  draft,
  setDraft,
  projects,
  tags,
  compact = false,
}: {
  draft: DraftEntry
  setDraft: (draft: DraftEntry) => void
  projects: { id: string; name: string }[]
  tags: { id: string; name: string }[]
  compact?: boolean
}) {
  return (
    <div className={compact ? 'grid gap-2' : 'grid gap-3 lg:grid-cols-6'}>
      <input
        value={draft.description}
        onChange={(event) =>
          setDraft({ ...draft, description: event.target.value })
        }
        placeholder="Task description"
        className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 lg:col-span-2"
      />
      <select
        value={draft.projectId}
        onChange={(event) =>
          setDraft({ ...draft, projectId: event.target.value })
        }
        className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <select
        value={draft.tagIds[0] || ''}
        onChange={(event) =>
          setDraft({ ...draft, tagIds: [event.target.value] })
        }
        className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
      >
        {tags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </select>
      <input
        type="datetime-local"
        value={draft.startedAt}
        onChange={(event) =>
          setDraft({ ...draft, startedAt: event.target.value })
        }
        className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
      />
      <input
        type="datetime-local"
        value={draft.endedAt}
        onChange={(event) =>
          setDraft({ ...draft, endedAt: event.target.value })
        }
        className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
      />
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={draft.billable}
          onChange={(event) =>
            setDraft({ ...draft, billable: event.target.checked })
          }
        />
        Billable
      </label>
      {!compact && (
        <input
          value={draft.notes}
          onChange={(event) =>
            setDraft({ ...draft, notes: event.target.value })
          }
          placeholder="Notes"
          className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 lg:col-span-5"
        />
      )}
    </div>
  )
}
