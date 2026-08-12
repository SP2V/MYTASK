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
  return (
    <Card>
      <CardContent className="flex items-center gap-3 px-5 py-4">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-md bg-muted',
            tone === 'destructive' && 'bg-destructive/10 text-destructive',
          )}
        >
          <Icon className="size-4.5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-semibold leading-none tabular-nums">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
