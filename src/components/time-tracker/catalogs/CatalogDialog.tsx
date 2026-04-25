import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export type CatalogAccent = {
  bg: string
  border: string
  text: string
}

export function CatalogCard({
  title,
  description,
  count,
  icon,
  accent,
  preview,
  onOpen,
}: {
  title: string
  description: string
  count: number
  icon: ReactNode
  accent: CatalogAccent
  preview: ReactNode
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group grid min-h-[180px] gap-4 rounded-lg border border-border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`grid h-11 w-11 place-items-center rounded-lg border ${accent.border} ${accent.bg} ${accent.text}`}
        >
          {icon}
        </span>
        <span className="rounded-full border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground">
          {count}
        </span>
      </div>
      <div>
        <h2 className="m-0 text-lg font-bold text-foreground">{title}</h2>
        <p className="m-0 mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="mt-auto min-h-7">{preview}</div>
    </button>
  )
}

export function CatalogDialog({
  title,
  description,
  countLabel,
  icon,
  accent,
  canManage,
  createForm,
  children,
  onClose,
}: {
  title: string
  description: string
  countLabel: string
  icon: ReactNode
  accent: CatalogAccent
  canManage: boolean
  createForm: ReactNode
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <section className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border ${accent.border} ${accent.bg} ${accent.text}`}
            >
              {icon}
            </span>
            <div className="min-w-0">
              <p className="m-0 text-xs font-bold uppercase tracking-wide text-primary">
                {countLabel}
              </p>
              <h2 className="m-0 mt-1 text-xl font-bold text-foreground">
                {title}
              </h2>
              <p className="m-0 mt-1 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close catalog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid min-h-0 gap-5 overflow-y-auto p-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          {canManage && (
            <aside className="rounded-lg border border-border bg-background p-4">
              {createForm}
            </aside>
          )}
          <div className={canManage ? 'min-w-0' : 'min-w-0 lg:col-span-2'}>
            {children}
          </div>
        </div>
      </section>
    </div>
  )
}
