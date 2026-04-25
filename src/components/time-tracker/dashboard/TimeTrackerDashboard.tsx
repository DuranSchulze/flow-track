import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  dateTimeLocalValue,
  getEntrySeconds,
  useFilteredEntries,
} from '#/lib/time-tracker/store'
import type {
  TimeEntry,
  TrackerState,
  ViewMode,
} from '#/lib/time-tracker/types'
import { DashboardHeader } from './DashboardHeader'
import { MetricsRow } from './MetricsRow'
import { InputSection } from './InputSection'
import { EntriesSection } from './EntriesSection'
import { useNowTick } from './hooks/useNowTick'
import { useDescriptionSuggestions } from './hooks/useDescriptionSuggestions'
import { useTrackerMutations } from './hooks/useTrackerMutations'
import { useEntriesFilterSort } from './hooks/useEntriesFilterSort'
import {
  calculateManualSeconds,
  emptyDraft,
  toEntryPayload,
  type DraftEntry,
} from './utils'

export function TimeTrackerDashboard({
  state,
  view = 'week',
}: {
  state: TrackerState
  view?: ViewMode
}) {
  const navigate = useNavigate()
  const mutations = useTrackerMutations()
  const tick = useNowTick(1000)

  // Timer-input state
  const [timerDescription, setTimerDescription] = useState('')
  const [timerProjectId, setTimerProjectId] = useState(
    state.projects[0]?.id || '',
  )
  const [timerTagIds, setTimerTagIds] = useState<string[]>([
    state.tags[0]?.id || '',
  ])
  const [timerBillable, setTimerBillable] = useState(false)

  // Manual draft + inline edit state
  const [draft, setDraft] = useState<DraftEntry>(() =>
    emptyDraft(state.projects[0]?.id || '', state.tags[0]?.id || ''),
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<DraftEntry>(() =>
    emptyDraft(state.projects[0]?.id || '', state.tags[0]?.id || ''),
  )

  const { suggestions: descriptionSuggestions, lookupEntry } =
    useDescriptionSuggestions(
      state.entries,
      state.currentMemberId,
      timerDescription,
    )

  // Backfill defaults when projects/tags first load
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

  const {
    filteredEntries,
    activeFilterCount,
    clearFilters,
    controls: filterControls,
  } = useEntriesFilterSort(baseFiltered, tick)

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

  function applyDescriptionSuggestion(description: string) {
    const matchingEntry = lookupEntry(description)
    setTimerDescription(description)
    if (matchingEntry) {
      setTimerProjectId(matchingEntry.projectId)
      setTimerTagIds(matchingEntry.tagIds)
      setTimerBillable(matchingEntry.billable)
    }
  }

  function startTimer() {
    if (activeEntry || !timerDescription.trim()) return
    void mutations.startTimer(
      {
        description: timerDescription.trim(),
        projectId: timerProjectId,
        tagIds: timerTagIds.filter(Boolean),
        billable: timerBillable,
      },
      () => setTimerDescription(''),
    )
  }

  function stopTimer() {
    if (!activeEntry) return
    void mutations.stopTimer(activeEntry.id)
  }

  function addManualEntry() {
    if (!draft.description.trim() || calculateManualSeconds(draft) <= 0) return
    void mutations.addManualEntry(toEntryPayload(draft), () => {
      setDraft(emptyDraft(state.projects[0]?.id || '', state.tags[0]?.id || ''))
    })
  }

  function startEdit(entry: TimeEntry) {
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
    void mutations.updateEntry(editingId, toEntryPayload(editingDraft), () => {
      setEditingId(null)
    })
  }

  function changeView(nextView: ViewMode) {
    void navigate({
      to: '/app/time-tracker',
      search: { view: nextView },
    })
  }

  return (
    <div className="grid gap-6">
      <DashboardHeader
        workspaceName={state.workspace.name}
        userName={currentUser.name}
        userRoleName={currentUser.roleName}
        view={view}
        onChangeView={changeView}
        selectedTotalSeconds={totals.selectedTotal}
      />

      <MetricsRow
        selectedTotalSeconds={totals.selectedTotal}
        billableSeconds={totals.billable}
        allPersonalSeconds={totals.allPersonal}
      />

      <InputSection
        projects={state.projects}
        tags={state.tags}
        description={timerDescription}
        onDescriptionChange={setTimerDescription}
        descriptionSuggestions={descriptionSuggestions}
        onApplySuggestion={applyDescriptionSuggestion}
        projectId={timerProjectId}
        onProjectIdChange={setTimerProjectId}
        tagIds={timerTagIds}
        onTagIdsChange={setTimerTagIds}
        billable={timerBillable}
        onBillableChange={setTimerBillable}
        activeEntry={activeEntry}
        onStart={startTimer}
        onStop={stopTimer}
        draft={draft}
        setDraft={setDraft}
        onAddManual={addManualEntry}
        onCreateProject={mutations.createProject}
        onCreateTag={mutations.createTag}
        pending={mutations.pending}
      />

      <EntriesSection
        view={view}
        baseFiltered={baseFiltered}
        filteredEntries={filteredEntries}
        activeFilterCount={activeFilterCount}
        clearFilters={clearFilters}
        filterControls={filterControls}
        projects={state.projects}
        tags={state.tags}
        tick={tick}
        editingId={editingId}
        editingDraft={editingDraft}
        setEditingDraft={setEditingDraft}
        pending={mutations.pending}
        onCreateProject={mutations.createProject}
        onCreateTag={mutations.createTag}
        onStartEdit={startEdit}
        onCancelEdit={() => setEditingId(null)}
        onSaveEdit={saveEdit}
        onDuplicate={mutations.duplicateEntry}
        onDelete={mutations.deleteEntry}
      />
    </div>
  )
}
