import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '#/lib/utils'

type ButtonProps = React.ComponentProps<'button'> & {
  asChild?: boolean
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors outline-none disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'outline' &&
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
        variant === 'destructive' &&
          'bg-destructive text-white hover:bg-destructive/90',
        size === 'default' && 'h-9 px-4 py-2',
        size === 'sm' && 'h-8 px-3',
        size === 'lg' && 'h-10 px-6',
        size === 'icon' && 'h-9 w-9',
        className,
      )}
      {...props}
    />
  )
}

export { Button }

