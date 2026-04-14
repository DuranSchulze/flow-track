import * as React from 'react'
import { cn } from '#/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-input bg-background ring-offset-background flex h-9 w-full rounded-lg border px-3 py-1 text-base shadow-xs transition-colors outline-none',
        'placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        className,
      )}
      {...props}
    />
  )
}

export { Input }

