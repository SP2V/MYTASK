import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-border/70 bg-card/35 px-4 py-16 text-center backdrop-blur-xs">
      {icon && (
        <div className="mb-1 flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-2xl shadow-2xs">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  )
}
