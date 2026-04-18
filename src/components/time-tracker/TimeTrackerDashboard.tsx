import { useEffect, useMemo, useRef, useState } from 'react'
import { gooeyToast } from 'goey-toast'
import { useRouter } from '@tanstack/react-router'
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  Copy,
  Filter,
  Pause,
  Pencil,
  Play,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
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
  createProjectFn,
  createTagFn,
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

type SortKey = 'newest' | 'oldest' | 'longest' | 'shortest'

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

  // ── Input mode toggle ──
  const [inputMode, setInputMode] = useState<'timer' | 'manual'>('timer')

  // ── Timer state ──
  const [timerDescription, setTimerDescription] = useState('')
  const [timerProjectId, setTimerProjectId] = useState(
    state.projects[0]?.id || '',
  )
  const [timerTagIds, setTimerTagIds] = useState<string[]>([
    state.tags[0]?.id || '',
  ])
  const [timerBillable, setTimerBillable] = useState(false)

  // ── Manual draft state ──
  const [draft, setDraft] = useState<DraftEntry>(() =>
    emptyDraft(state.projects[0]?.id || '', state.tags[0]?.id || ''),
  )

  // ── Inline edit state ──
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<DraftEntry>(() =>
    emptyDraft(state.projects[0]?.id || '', state.tags[0]?.id || ''),
  )

  // ── Filter + sort state ──
  const [filterProject, setFilterProject] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [filterBillable, setFilterBillable] = useState<'all' | 'yes' | 'no'>(
    'all',
  )
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [showFilters, setShowFilters] = useState(false)

  const [pending, setPending] = useState(false)

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!timerProjectId && state.projects[0])
      setTimerProjectId(state.projects[0].id)
    if (!timerTagIds.filter(Boolean).length && state.tags[0])
      setTimerTagIds([state.tags[0].id])
  }, [state.projects, state.tags, timerProjectId, timerTagIds])

  const currentUser = state.members.find((m) => m.id === state.currentMemberId)!
  const activeEntry = state.entries.find(
    (e) => e.workspaceMemberId === state.currentMemberId && !e.endedAt,
  )
  const baseFiltered = useFilteredEntries(
    state.entries,
    view,
    state.currentMemberId,
  )

  // Apply filter + sort on top of the view-filtered entries
  const filteredEntries = useMemo(() => {
    let result = [...baseFiltered]

    if (filterProject)
      result = result.filter((e) => e.projectId === filterProject)
    if (filterTag) result = result.filter((e) => e.tagIds.includes(filterTag))
    if (filterBillable === 'yes') result = result.filter((e) => e.billable)
    if (filterBillable === 'no') result = result.filter((e) => !e.billable)

    result.sort((a, b) => {
      if (sortKey === 'newest')
        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      if (sortKey === 'oldest')
        return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
      if (sortKey === 'longest')
        return getEntrySeconds(b, tick) - getEntrySeconds(a, tick)
      if (sortKey === 'shortest')
        return getEntrySeconds(a, tick) - getEntrySeconds(b, tick)
      return 0
    })

    return result
  }, [baseFiltered, filterProject, filterTag, filterBillable, sortKey, tick])

  const totals = useMemo(() => {
    const selectedTotal = baseFiltered.reduce(
      (sum, e) => sum + getEntrySeconds(e, tick),
      0,
    )
    const allPersonal = state.entries
      .filter((e) => e.workspaceMemberId === state.currentMemberId)
      .reduce((sum, e) => sum + getEntrySeconds(e, tick), 0)
    const billable = baseFiltered
      .filter((e) => e.billable)
      .reduce((sum, e) => sum + getEntrySeconds(e, tick), 0)
    return { selectedTotal, allPersonal, billable }
  }, [baseFiltered, state.currentMemberId, state.entries, tick])

  const range = getViewRange(view)

  const activeFilterCount = [
    filterProject !== '',
    filterTag !== '',
    filterBillable !== 'all',
    sortKey !== 'newest',
  ].filter(Boolean).length

  function selectedTags(tagIds: string[]) {
    return state.tags.filter((t) => tagIds.includes(t.id))
  }

  function calculateManualSeconds(d: DraftEntry) {
    return Math.max(
      0,
      Math.floor(
        (new Date(d.endedAt).getTime() - new Date(d.startedAt).getTime()) /
          1000,
      ),
    )
  }

  async function runMutation(
    action: () => Promise<void>,
    successMessage?: string,
  ) {
    setPending(true)
    try {
      await action()
      await router.invalidate()
      if (successMessage) gooeyToast.success(successMessage)
    } catch (err) {
      gooeyToast.error('Action failed', {
        description:
          err instanceof Error ? err.message : 'Something went wrong.',
      })
    } finally {
      setPending(false)
    }
  }

  function toEntryPayload(d: DraftEntry) {
    return {
      description: d.description.trim(),
      projectId: d.projectId,
      tagIds: d.tagIds.filter(Boolean),
      billable: d.billable,
      startedAt: new Date(d.startedAt).toISOString(),
      endedAt: new Date(d.endedAt).toISOString(),
      durationSeconds: calculateManualSeconds(d),
      notes: d.notes.trim(),
    }
  }

  function startTimer() {
    if (activeEntry || !timerDescription.trim()) return
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
    if (!activeEntry) return
    void runMutation(
      () => stopTimerFn({ data: { id: activeEntry.id } }),
      'Timer stopped',
    )
  }

  function addManualEntry() {
    if (!draft.description.trim() || calculateManualSeconds(draft) <= 0) return
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
    if (!editingId || !editingDraft.description.trim()) return
    void runMutation(async () => {
      await updateEntryFn({
        data: { id: editingId, ...toEntryPayload(editingDraft) },
      })
      setEditingId(null)
    }, 'Entry saved')
  }

  function clearFilters() {
    setFilterProject('')
    setFilterTag('')
    setFilterBillable('all')
    setSortKey('newest')
  }

  async function handleCreateProject(name: string, color: string) {
    await runMutation(async () => {
      await createProjectFn({ data: { name, color } })
    }, `Project "${name}" created`)
  }

  async function handleCreateTag(name: string, color: string) {
    await runMutation(async () => {
      await createTagFn({ data: { name, color } })
    }, `Tag "${name}" created`)
  }

  return (
    <div className="grid gap-6">
      {/* ── Header + metrics ── */}
      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-semibold text-primary">
              {state.workspace.name}
            </p>
            <h1 className="m-0 mt-1 text-2xl font-bold tracking-tight text-foreground">
              Time Tracker
            </h1>
            <p className="m-0 mt-1 text-sm text-muted-foreground">
              {currentUser.name} · {currentUser.roleName}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted px-4 py-3 text-right">
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {view} total
            </p>
            <p className="m-0 mt-1 text-2xl font-bold text-foreground">
              {formatHours(totals.selectedTotal)}
            </p>
          </div>
        </div>
      </section>

      {/* ── Metrics row ── */}
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

      {/* ── Input section with toggle ── */}
      <section className="rounded-lg border border-border bg-card shadow-sm">
        {/* Toggle tabs */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setInputMode('timer')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              inputMode === 'timer'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Play className="mr-1.5 inline h-3.5 w-3.5" />
            Timer
          </button>
          <button
            type="button"
            onClick={() => setInputMode('manual')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              inputMode === 'manual'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Pencil className="mr-1.5 inline h-3.5 w-3.5" />
            Manual entry
          </button>
        </div>

        <div className="p-4">
          {/* ── Timer panel ── */}
          {inputMode === 'timer' && (
            <div className="grid gap-3">
              <div className="grid gap-3 lg:grid-cols-[1fr_200px_200px_130px]">
                <input
                  value={timerDescription}
                  onChange={(e) => setTimerDescription(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && startTimer()}
                  placeholder="What are you working on?"
                  disabled={!!activeEntry}
                  className="h-11 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary disabled:bg-muted disabled:text-muted-foreground"
                />
                <ProjectPicker
                  projects={state.projects}
                  value={timerProjectId}
                  onChange={setTimerProjectId}
                  onCreate={handleCreateProject}
                  disabled={!!activeEntry}
                />
                <TagPicker
                  tags={state.tags}
                  value={timerTagIds}
                  onChange={setTimerTagIds}
                  onCreate={handleCreateTag}
                  disabled={!!activeEntry}
                />
                <button
                  type="button"
                  onClick={activeEntry ? stopTimer : startTimer}
                  disabled={
                    pending || (!activeEntry && !timerDescription.trim())
                  }
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground ${
                    activeEntry
                      ? 'bg-destructive text-primary-foreground hover:brightness-110'
                      : 'bg-primary text-primary-foreground hover:brightness-110'
                  }`}
                >
                  {activeEntry ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {activeEntry ? 'Stop' : 'Start'}
                </button>
              </div>

              {!activeEntry && (
                <label className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={timerBillable}
                    onChange={(e) => setTimerBillable(e.target.checked)}
                  />
                  Billable
                </label>
              )}

              {activeEntry && (
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
                  <p className="m-0 text-xs font-bold uppercase tracking-wide text-primary">
                    Running now
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <p className="m-0 font-bold text-foreground">
                      {activeEntry.description}
                    </p>
                    <p className="m-0 font-mono text-2xl font-bold text-foreground">
                      {formatDuration(getEntrySeconds(activeEntry, tick))}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Manual entry panel ── */}
          {inputMode === 'manual' && (
            <div className="grid gap-3">
              <p className="m-0 text-sm text-muted-foreground">
                Add time when work was tracked outside the timer.
              </p>
              <EntryDraftForm
                draft={draft}
                setDraft={setDraft}
                projects={state.projects}
                tags={state.tags}
                onCreateProject={handleCreateProject}
                onCreateTag={handleCreateTag}
              />
              <div>
                <button
                  type="button"
                  onClick={addManualEntry}
                  disabled={
                    pending ||
                    !draft.description.trim() ||
                    calculateManualSeconds(draft) <= 0
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Add entry
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Entries section ── */}
      <section className="rounded-lg border border-border bg-card shadow-sm">
        {/* Entries header + filter controls */}
        <div className="border-b border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-bold text-foreground">Entries</h2>
              <p className="m-0 mt-1 text-sm text-muted-foreground">
                {range.start.toLocaleDateString()} –{' '}
                {new Date(range.end.getTime() - 1).toLocaleDateString()}
                {filteredEntries.length !== baseFiltered.length && (
                  <span className="ml-2 text-primary font-semibold">
                    {filteredEntries.length} of {baseFiltered.length} shown
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                >
                  <X className="h-3 w-3" />
                  Clear ({activeFilterCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowFilters((p) => !p)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  showFilters || activeFilterCount > 0
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-foreground hover:bg-accent'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                Filter / Sort
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 rounded-full bg-card px-1.5 text-xs font-bold text-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filter + sort panel */}
          {showFilters && (
            <div className="mt-3 grid gap-3 rounded-lg border border-border bg-muted p-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                Project
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="h-8 rounded border border-border bg-card text-foreground px-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">All projects</option>
                  {state.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                Tag
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="h-8 rounded border border-border bg-card text-foreground px-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">All tags</option>
                  {state.tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                Billable
                <select
                  value={filterBillable}
                  onChange={(e) =>
                    setFilterBillable(e.target.value as 'all' | 'yes' | 'no')
                  }
                  className="h-8 rounded border border-border bg-card text-foreground px-2 text-sm outline-none focus:border-primary"
                >
                  <option value="all">All entries</option>
                  <option value="yes">Billable only</option>
                  <option value="no">Non-billable only</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <ArrowDownUp className="h-3 w-3" />
                  Sort by
                </span>
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="h-8 rounded border border-border bg-card text-foreground px-2 text-sm outline-none focus:border-primary"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="longest">Longest first</option>
                  <option value="shortest">Shortest first</option>
                </select>
              </label>
            </div>
          )}
        </div>

        {/* Entries table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
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
              {filteredEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    {baseFiltered.length === 0
                      ? 'No entries in this period yet.'
                      : 'No entries match your filters.'}
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const project = state.projects.find(
                    (p) => p.id === entry.projectId,
                  )
                  return (
                    <tr key={entry.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        {editingId === entry.id ? (
                          <EntryDraftForm
                            compact
                            draft={editingDraft}
                            setDraft={setEditingDraft}
                            projects={state.projects}
                            tags={state.tags}
                            onCreateProject={handleCreateProject}
                            onCreateTag={handleCreateTag}
                          />
                        ) : (
                          <div>
                            <p className="m-0 font-semibold text-foreground">
                              {entry.description}
                            </p>
                            <p className="m-0 mt-1 text-xs text-muted-foreground">
                              {new Date(entry.startedAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {project ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs font-semibold text-foreground">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: project.color }}
                            />
                            {project.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No project
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {selectedTags(entry.tagIds).map((tag) => (
                            <span
                              key={tag.id}
                              className="rounded-lg border border-border px-2 py-0.5 text-xs font-semibold"
                              style={{
                                color: tag.color,
                                borderColor: tag.color + '55',
                              }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                            entry.billable
                              ? 'bg-primary/15 text-primary'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {entry.billable ? 'Billable' : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        {formatDuration(getEntrySeconds(entry, tick))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {editingId === entry.id ? (
                            <>
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={pending}
                                className="rounded-lg bg-primary p-2 text-primary-foreground hover:brightness-110"
                                aria-label="Save entry"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent"
                                aria-label="Cancel edit"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openEdit(entry)}
                              disabled={pending}
                              className="rounded-lg border border-border p-2 text-foreground hover:bg-accent"
                              aria-label="Edit entry"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => duplicateEntry(entry)}
                            disabled={pending}
                            className="rounded-lg border border-border p-2 text-foreground hover:bg-accent"
                            aria-label="Duplicate entry"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeEntry(entry.id)}
                            disabled={pending}
                            className="rounded-lg border border-destructive/30 p-2 text-destructive hover:bg-destructive/10"
                            aria-label="Delete entry"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="m-0 mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  )
}

function EntryDraftForm({
  draft,
  setDraft,
  projects,
  tags,
  onCreateProject,
  onCreateTag,
  compact = false,
}: {
  draft: DraftEntry
  setDraft: (draft: DraftEntry) => void
  projects: { id: string; name: string; color: string }[]
  tags: { id: string; name: string; color: string }[]
  onCreateProject?: (name: string, color: string) => Promise<void>
  onCreateTag?: (name: string, color: string) => Promise<void>
  compact?: boolean
}) {
  return (
    <div className={compact ? 'grid gap-2' : 'grid gap-3 lg:grid-cols-6'}>
      <input
        value={draft.description}
        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        placeholder="Task description"
        className="h-10 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary lg:col-span-2"
      />
      <ProjectPicker
        projects={projects}
        value={draft.projectId}
        onChange={(id) => setDraft({ ...draft, projectId: id })}
        onCreate={onCreateProject ?? (() => Promise.resolve())}
      />
      <TagPicker
        tags={tags}
        value={draft.tagIds}
        onChange={(ids) => setDraft({ ...draft, tagIds: ids })}
        onCreate={onCreateTag ?? (() => Promise.resolve())}
      />
      <input
        type="datetime-local"
        value={draft.startedAt}
        onChange={(e) => setDraft({ ...draft, startedAt: e.target.value })}
        className="h-10 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
      />
      <input
        type="datetime-local"
        value={draft.endedAt}
        onChange={(e) => setDraft({ ...draft, endedAt: e.target.value })}
        className="h-10 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
      />
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        <input
          type="checkbox"
          checked={draft.billable}
          onChange={(e) => setDraft({ ...draft, billable: e.target.checked })}
        />
        Billable
      </label>
      {!compact && (
        <input
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          placeholder="Notes (optional)"
          className="h-10 rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary lg:col-span-5"
        />
      )}
    </div>
  )
}

function ProjectPicker({
  projects,
  value,
  onChange,
  onCreate,
  disabled = false,
}: {
  projects: { id: string; name: string; color: string }[]
  value: string
  onChange: (id: string) => void
  onCreate: (name: string, color: string) => Promise<void>
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#2563eb')
  const [createPending, setCreatePending] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const selected = projects.find((p) => p.id === value)
  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreatePending(true)
    try {
      await onCreate(newName.trim(), newColor)
      setNewName('')
      setNewColor('#2563eb')
      setCreating(false)
      setOpen(false)
    } finally {
      setCreatePending(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:border-border/80 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
      >
        {selected ? (
          <>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: selected.color }}
            />
            <span className="flex-1 truncate text-left">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-left text-muted-foreground">
            No project
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <div className="border-b border-border p-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="h-8 w-full rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No projects found
              </p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(p.id)
                    setOpen(false)
                    setSearch('')
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent ${
                    p.id === value
                      ? 'font-semibold text-foreground'
                      : 'text-foreground'
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="flex-1 truncate text-left">{p.name}</span>
                  {p.id === value && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>
          <div className="border-t border-border p-2">
            {creating ? (
              <form onSubmit={handleCreate} className="grid gap-2">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Project name"
                    className="h-8 flex-1 rounded-lg border border-border bg-card text-foreground px-2 text-sm outline-none focus:border-primary"
                  />
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    title="Pick a color"
                    className="h-8 w-10 cursor-pointer rounded-lg border border-border p-0.5"
                  />
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="submit"
                    disabled={createPending || !newName.trim()}
                    className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground"
                  >
                    {createPending ? 'Creating…' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false)
                      setNewName('')
                    }}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
              >
                <Plus className="h-3.5 w-3.5" />
                New project
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TagPicker({
  tags,
  value,
  onChange,
  onCreate,
  disabled = false,
}: {
  tags: { id: string; name: string; color: string }[]
  value: string[]
  onChange: (ids: string[]) => void
  onCreate: (name: string, color: string) => Promise<void>
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#14b8a6')
  const [createPending, setCreatePending] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const selected = tags.filter((t) => value.includes(t.id))
  const filtered = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  )

  function toggleTag(id: string) {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    )
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreatePending(true)
    try {
      await onCreate(newName.trim(), newColor)
      setNewName('')
      setNewColor('#14b8a6')
      setCreating(false)
    } finally {
      setCreatePending(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:border-border/80 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
      >
        <div className="flex flex-1 items-center gap-1 overflow-hidden">
          {selected.length > 0 ? (
            selected.slice(0, 2).map((t) => (
              <span
                key={t.id}
                className="shrink-0 rounded px-1.5 py-0.5 text-xs font-bold"
                style={{ backgroundColor: t.color + '22', color: t.color }}
              >
                {t.name}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground">No tags</span>
          )}
          {selected.length > 2 && (
            <span className="text-xs text-muted-foreground">
              +{selected.length - 2}
            </span>
          )}
        </div>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <div className="border-b border-border p-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tags…"
              className="h-8 w-full rounded-lg border border-border bg-card text-foreground px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No tags found
              </p>
            ) : (
              filtered.map((t) => {
                const checked = value.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    <span
                      className={`flex-1 truncate text-left ${
                        checked
                          ? 'font-semibold text-foreground'
                          : 'text-foreground'
                      }`}
                    >
                      {t.name}
                    </span>
                    {checked && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                )
              })
            )}
          </div>
          <div className="border-t border-border p-2">
            {creating ? (
              <form onSubmit={handleCreate} className="grid gap-2">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Tag name"
                    className="h-8 flex-1 rounded-lg border border-border bg-card text-foreground px-2 text-sm outline-none focus:border-primary"
                  />
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    title="Pick a color"
                    className="h-8 w-10 cursor-pointer rounded-lg border border-border p-0.5"
                  />
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="submit"
                    disabled={createPending || !newName.trim()}
                    className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground"
                  >
                    {createPending ? 'Creating…' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false)
                      setNewName('')
                    }}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
              >
                <Plus className="h-3.5 w-3.5" />
                New tag
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
