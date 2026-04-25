import { useState } from 'react'
import { Play, SlidersHorizontal, Square } from 'lucide-react'
import type { SearchableItem } from '#/components/ui/searchable-create-popover'
import type { TimeEntry } from '#/lib/time-tracker/types'
import { ProjectPicker } from '../pickers/ProjectPicker'
import { TagPicker } from '../pickers/TagPicker'
import { BillableToggleButton } from './BillableToggleButton'
import { DescriptionAutocomplete } from './DescriptionAutocomplete'
import { RunningTimer } from './RunningTimer'
import { TimerOptionsSheet } from './TimerOptionsSheet'

export function TimerPanel({
  projects,
  tags,
  description,
  onDescriptionChange,
  descriptionSuggestions,
  onApplySuggestion,
  projectId,
  onProjectIdChange,
  tagIds,
  onTagIdsChange,
  billable,
  onBillableChange,
  onCreateProject,
  onCreateTag,
  activeEntry,
  pending,
  onStart,
  onStop,
}: {
  projects: SearchableItem[]
  tags: SearchableItem[]
  description: string
  onDescriptionChange: (value: string) => void
  descriptionSuggestions: string[]
  onApplySuggestion: (description: string) => void
  projectId: string
  onProjectIdChange: (id: string) => void
  tagIds: string[]
  onTagIdsChange: (ids: string[]) => void
  billable: boolean
  onBillableChange: (next: boolean) => void
  onCreateProject: (name: string, color: string) => Promise<void>
  onCreateTag: (name: string, color: string) => Promise<void>
  activeEntry: TimeEntry | undefined
  pending: boolean
  onStart: () => void
  onStop: () => void
}) {
  const [optionsOpen, setOptionsOpen] = useState(false)

  return (
    <div className="grid gap-3">
      <div
        className={`grid gap-3 ${
          activeEntry
            ? 'sm:grid-cols-[minmax(0,1fr)_130px] lg:grid-cols-[minmax(0,1fr)_200px_200px_130px]'
            : 'sm:grid-cols-[minmax(0,1fr)_auto_auto] lg:grid-cols-[minmax(0,1fr)_200px_200px_44px_130px]'
        }`}
      >
        <DescriptionAutocomplete
          value={description}
          onChange={onDescriptionChange}
          suggestions={descriptionSuggestions}
          onApplySuggestion={onApplySuggestion}
          onSubmit={onStart}
          disabled={!!activeEntry}
        />
        <div className="hidden lg:block">
          <ProjectPicker
            projects={projects}
            value={projectId}
            onChange={onProjectIdChange}
            onCreate={onCreateProject}
            disabled={!!activeEntry}
          />
        </div>
        <div className="hidden lg:block">
          <TagPicker
            tags={tags}
            value={tagIds}
            onChange={onTagIdsChange}
            onCreate={onCreateTag}
            disabled={!!activeEntry}
          />
        </div>
        {!activeEntry && (
          <>
            <BillableToggleButton
              pressed={billable}
              onPressedChange={onBillableChange}
              className="hidden lg:inline-flex"
            />
            <button
              type="button"
              onClick={() => setOptionsOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-bold text-foreground shadow-sm transition-colors hover:bg-accent lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Options
            </button>
          </>
        )}
        <button
          type="button"
          onClick={activeEntry ? onStop : onStart}
          disabled={pending || (!activeEntry && !description.trim())}
          className={`inline-flex h-11 min-w-[130px] items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground ${
            activeEntry
              ? 'bg-destructive text-destructive-foreground hover:brightness-110'
              : 'bg-primary text-primary-foreground hover:brightness-110'
          }`}
        >
          {activeEntry ? (
            <Square className="h-4 w-4 fill-current" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {activeEntry ? 'Stop timer' : 'Start'}
        </button>
      </div>

      {activeEntry && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
          <p className="m-0 text-xs font-bold uppercase tracking-wide text-primary">
            Running now
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 font-bold text-foreground">
              {activeEntry.description}
            </p>
            <RunningTimer entry={activeEntry} />
          </div>
        </div>
      )}

      {optionsOpen && !activeEntry && (
        <TimerOptionsSheet
          projects={projects}
          tags={tags}
          projectId={projectId}
          onProjectIdChange={onProjectIdChange}
          tagIds={tagIds}
          onTagIdsChange={onTagIdsChange}
          billable={billable}
          onBillableChange={onBillableChange}
          onCreateProject={onCreateProject}
          onCreateTag={onCreateTag}
          onClose={() => setOptionsOpen(false)}
        />
      )}
    </div>
  )
}
