import { ProjectPicker } from '../pickers/ProjectPicker'
import { TagPicker } from '../pickers/TagPicker'
import type { DraftEntry } from './utils'

const noopCreate = () => Promise.resolve()

export function EntryDraftForm({
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
        onCreate={onCreateProject ?? noopCreate}
      />
      <TagPicker
        tags={tags}
        value={draft.tagIds}
        onChange={(ids) => setDraft({ ...draft, tagIds: ids })}
        onCreate={onCreateTag ?? noopCreate}
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
