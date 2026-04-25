import { useState } from 'react'
import { Pencil, Play } from 'lucide-react'
import type { SearchableItem } from '#/components/ui/searchable-create-popover'
import type { TimeEntry } from '#/lib/time-tracker/types'
import { ManualEntryPanel } from './ManualEntryPanel'
import { TimerPanel } from './TimerPanel'
import type { DraftEntry } from './utils'

export function InputSection({
  projects,
  tags,
  // timer
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
  activeEntry,
  onStart,
  onStop,
  // manual
  draft,
  setDraft,
  onAddManual,
  // shared
  onCreateProject,
  onCreateTag,
  pending,
}: {
  projects: SearchableItem[]
  tags: SearchableItem[]
  description: string
  onDescriptionChange: (v: string) => void
  descriptionSuggestions: string[]
  onApplySuggestion: (description: string) => void
  projectId: string
  onProjectIdChange: (id: string) => void
  tagIds: string[]
  onTagIdsChange: (ids: string[]) => void
  billable: boolean
  onBillableChange: (next: boolean) => void
  activeEntry: TimeEntry | undefined
  onStart: () => void
  onStop: () => void
  draft: DraftEntry
  setDraft: (draft: DraftEntry) => void
  onAddManual: () => void
  onCreateProject: (name: string, color: string) => Promise<void>
  onCreateTag: (name: string, color: string) => Promise<void>
  pending: boolean
}) {
  const [mode, setMode] = useState<'timer' | 'manual'>('timer')

  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setMode('timer')}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            mode === 'timer'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Play className="mr-1.5 inline h-3.5 w-3.5" />
          Timer
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            mode === 'manual'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Pencil className="mr-1.5 inline h-3.5 w-3.5" />
          Manual entry
        </button>
      </div>

      <div className="p-4">
        {mode === 'timer' && (
          <TimerPanel
            projects={projects}
            tags={tags}
            description={description}
            onDescriptionChange={onDescriptionChange}
            descriptionSuggestions={descriptionSuggestions}
            onApplySuggestion={onApplySuggestion}
            projectId={projectId}
            onProjectIdChange={onProjectIdChange}
            tagIds={tagIds}
            onTagIdsChange={onTagIdsChange}
            billable={billable}
            onBillableChange={onBillableChange}
            onCreateProject={onCreateProject}
            onCreateTag={onCreateTag}
            activeEntry={activeEntry}
            pending={pending}
            onStart={onStart}
            onStop={onStop}
          />
        )}

        {mode === 'manual' && (
          <ManualEntryPanel
            draft={draft}
            setDraft={setDraft}
            projects={projects}
            tags={tags}
            onCreateProject={onCreateProject}
            onCreateTag={onCreateTag}
            pending={pending}
            onSubmit={onAddManual}
          />
        )}
      </div>
    </section>
  )
}
