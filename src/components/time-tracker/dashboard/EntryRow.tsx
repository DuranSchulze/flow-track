import { Copy, Pencil, Save, Trash2, X } from 'lucide-react'
import {
  formatDurationPrecise,
  getEntrySecondsPrecise,
} from '#/lib/time-tracker/store'
import type { TimeEntry } from '#/lib/time-tracker/types'
import type { SearchableItem } from '#/components/ui/searchable-create-popover'
import { EntryDraftForm } from './EntryDraftForm'
import type { DraftEntry } from './utils'

export function EntryRow({
  entry,
  tick,
  projects,
  tags,
  isEditing,
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
  entry: TimeEntry
  tick: number
  projects: SearchableItem[]
  tags: SearchableItem[]
  isEditing: boolean
  editingDraft: DraftEntry
  setEditingDraft: (draft: DraftEntry) => void
  pending: boolean
  onCreateProject: (name: string, color: string) => Promise<void>
  onCreateTag: (name: string, color: string) => Promise<void>
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const project = projects.find((p) => p.id === entry.projectId)
  const entryTags = tags.filter((t) => entry.tagIds.includes(t.id))

  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3">
        {isEditing ? (
          <EntryDraftForm
            compact
            draft={editingDraft}
            setDraft={setEditingDraft}
            projects={projects}
            tags={tags}
            onCreateProject={onCreateProject}
            onCreateTag={onCreateTag}
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
          <span className="text-xs text-muted-foreground">No project</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {entryTags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-lg border border-border px-2 py-0.5 text-xs font-semibold"
              style={{ color: tag.color, borderColor: tag.color + '55' }}
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
      <td className="px-4 py-3 font-mono font-bold tabular-nums text-foreground">
        {formatDurationPrecise(getEntrySecondsPrecise(entry, tick))}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={onSaveEdit}
                disabled={pending}
                className="rounded-lg bg-primary p-2 text-primary-foreground hover:brightness-110"
                aria-label="Save entry"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent"
                aria-label="Cancel edit"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onStartEdit}
              disabled={pending}
              className="rounded-lg border border-border p-2 text-foreground hover:bg-accent"
              aria-label="Edit entry"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onDuplicate}
            disabled={pending}
            className="rounded-lg border border-border p-2 text-foreground hover:bg-accent"
            aria-label="Duplicate entry"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
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
}
