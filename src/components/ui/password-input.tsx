import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '#/lib/utils'

export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>
>(function PasswordInputInner({ className, ...props }, ref) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        {...props}
        ref={ref}
        type={show ? 'text' : 'password'}
        className={cn(
          'h-11 w-full rounded-lg border border-slate-300 bg-white pl-3 pr-11 text-sm text-slate-950 outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50',
          className,
        )}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex h-11 w-11 items-center justify-center rounded-r-lg text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 dark:text-slate-400 dark:hover:text-slate-100"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
})
