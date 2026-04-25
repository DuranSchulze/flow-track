import { Plus } from 'lucide-react'
import type { SearchableItem } from '#/components/ui/searchable-create-popover'
import { EntryDraftForm } from './EntryDraftForm'
import { calculateManualSeconds, type DraftEntry } from './utils'

export function ManualEntryPanel({
  draft,
  setDraft,
  projects,
  tags,
  onCreateProject,
  onCreateTag,
  pending,
  onSubmit,
}: {
  draft: DraftEntry
  setDraft: (draft: DraftEntry) => void
  projects: SearchableItem[]
  tags: SearchableItem[]
  onCreateProject: (name: string, color: string) => Promise<void>
  onCreateTag: (name: string, color: string) => Promise<void>
  pending: boolean
  onSubmit: () => void
}) {
  return (
    <div className="grid gap-3">
      <p className="m-0 text-sm text-muted-foreground">
        Add time when work was tracked outside the timer.
      </p>
      <EntryDraftForm
        draft={draft}
        setDraft={setDraft}
        projects={projects}
        tags={tags}
        onCreateProject={onCreateProject}
        onCreateTag={onCreateTag}
      />
      <div>
        <button
          type="button"
          onClick={onSubmit}
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
  )
}
