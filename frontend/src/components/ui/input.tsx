import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          'flex h-9 w-full min-w-0 rounded-xl border border-border/80 bg-background/70 px-3 py-1 text-sm shadow-2xs backdrop-blur-xs transition-colors outline-none dark:border-border/60 dark:bg-background/50',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          'placeholder:text-muted-foreground/70',
          'focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/30',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
