export const inputClass =
  'h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary'

export function SubmitButton({
  pending,
  label,
}: {
  pending: boolean
  label: string
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground transition-colors hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground"
    >
      {pending ? 'Creating...' : label}
    </button>
  )
}

export function FormTitle({ title }: { title: string }) {
  return <h3 className="m-0 text-sm font-bold text-foreground">{title}</h3>
}

export function ColorInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm font-semibold text-foreground">
      Color
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-14 cursor-pointer rounded-lg border border-border p-1"
      />
    </label>
  )
}
