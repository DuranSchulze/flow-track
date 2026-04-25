import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import { getViewRange } from '#/lib/time-tracker/store'
import type { TimeEntry, ViewMode } from '#/lib/time-tracker/types'
import type { SearchableItem } from '#/components/ui/searchable-create-popover'
import { EntriesFilters } from './EntriesFilters'
import { EntryRow } from './EntryRow'
import type {
  BillableFilter,
  SortKey,
} from './hooks/useEntriesFilterSort'
import type { DraftEntry } from './utils'

export function EntriesSection({
  view,
  baseFiltered,
  filteredEntries,
  activeFilterCount,
  clearFilters,
  filterControls,
  projects,
  tags,
  tick,
  editingId,
  editingDraft,
  setEditingDraft,
  pending,
  onCreateProject,
  onCreateTag,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDuplicate,
  onDelete,
}: {
  view: ViewMode
  baseFiltered: TimeEntry[]
  filteredEntries: TimeEntry[]
  activeFilterCount: number
  clearFilters: () => void
  filterControls: {
    filterProject: string
    setFilterProject: (v: string) => void
    filterTag: string
    setFilterTag: (v: string) => void
    filterBillable: BillableFilter
    setFilterBillable: (v: BillableFilter) => void
    sortKey: SortKey
    setSortKey: (v: SortKey) => void
  }
  projects: SearchableItem[]
  tags: SearchableItem[]
  tick: number
  editingId: string | null
  editingDraft: DraftEntry
  setEditingDraft: (draft: DraftEntry) => void
  pending: boolean
  onCreateProject: (name: string, color: string) => Promise<void>
  onCreateTag: (name: string, color: string) => Promise<void>
  onStartEdit: (entry: TimeEntry) => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [showFilters, setShowFilters] = useState(false)
  const range = getViewRange(view)

  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
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

        {showFilters && (
          <EntriesFilters
            projects={projects}
            tags={tags}
            {...filterControls}
          />
        )}
      </div>

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
              filteredEntries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  tick={tick}
                  projects={projects}
                  tags={tags}
                  isEditing={editingId === entry.id}
                  editingDraft={editingDraft}
                  setEditingDraft={setEditingDraft}
                  pending={pending}
                  onCreateProject={onCreateProject}
                  onCreateTag={onCreateTag}
                  onStartEdit={() => onStartEdit(entry)}
                  onCancelEdit={onCancelEdit}
                  onSaveEdit={onSaveEdit}
                  onDuplicate={() => onDuplicate(entry.id)}
                  onDelete={() => onDelete(entry.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
