import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  tone?: 'default' | 'destructive'
}

export function StatCard({ label, value, icon: Icon, tone = 'default' }: StatCardProps) {
  const isDestructive = tone === 'destructive'

  return (
    <Card className="group relative overflow-hidden border-border/60 bg-card/80 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-sm">
      <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors',
            isDestructive
              ? 'bg-destructive/15 text-destructive'
              : 'bg-primary/10 text-primary group-hover:bg-primary/15',
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-2xl font-bold tracking-tight leading-none tabular-nums',
              isDestructive ? 'text-destructive' : 'text-foreground',
            )}
          >
            {value}
          </p>
          <p className="mt-1.5 truncate text-xs font-medium text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
