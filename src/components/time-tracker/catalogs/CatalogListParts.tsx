import { Trash2 } from 'lucide-react'
import { gooeyToast } from 'goey-toast'

export function ListRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
      {children}
    </div>
  )
}

export function CatalogName({ name }: { name: string }) {
  return (
    <p className="m-0 min-w-0 flex-1 truncate text-sm font-bold text-foreground">
      {name}
    </p>
  )
}

export function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="h-3 w-3 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  )
}

export function DangerButton({
  title,
  pending,
  onClick,
}: {
  title: string
  pending: boolean
  onClick: () => Promise<void>
}) {
  return (
    <button
      type="button"
      onClick={() => {
        void onClick().catch((err) => {
          gooeyToast.error('Action failed', {
            description:
              err instanceof Error ? err.message : 'Please try again.',
          })
        })
      }}
      disabled={pending}
      title={title}
      className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
