import * as React from 'react'
import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          'flex min-h-16 w-full rounded-xl border border-border/80 bg-background/70 px-3.5 py-2.5 text-sm shadow-2xs backdrop-blur-xs transition-colors outline-none dark:border-border/60 dark:bg-background/50',
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
Textarea.displayName = 'Textarea'

export { Textarea }
