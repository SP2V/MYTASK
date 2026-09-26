import { useEffect, useState } from 'react'
import { Check, Clock3, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface TimePickerPopoverProps {
  id?: string
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

function parseTime(value: string | null): { hour: number; minute: number } {
  const match = value?.match(/^(\d{2}):(\d{2})$/)
  if (!match) return { hour: 9, minute: 0 }
  return { hour: Number(match[1]), minute: Number(match[2]) }
}

function to24Hour(hour: number, period: 'AM' | 'PM'): number {
  if (period === 'AM') return hour === 12 ? 0 : hour
  return hour === 12 ? 12 : hour + 12
}

function formatDisplay(value: string): string {
  const { hour, minute } = parseTime(value)
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`
}

export function TimePickerPopover({
  id,
  value,
  onChange,
  placeholder = 'Choose a time',
  disabled = false,
  className,
}: TimePickerPopoverProps) {
  const [open, setOpen] = useState(false)
  const parsed = parseTime(value)
  const [hour, setHour] = useState(parsed.hour % 12 || 12)
  const [minute, setMinute] = useState(parsed.minute)
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.hour >= 12 ? 'PM' : 'AM')

  useEffect(() => {
    if (!open) return
    const current = parseTime(value)
    setHour(current.hour % 12 || 12)
    setMinute(current.minute)
    setPeriod(current.hour >= 12 ? 'PM' : 'AM')
  }, [open, value])

  const save = () => {
    onChange(`${String(to24Hour(hour, period)).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          disabled={disabled}
          aria-label={value ? `Time: ${formatDisplay(value)}` : placeholder}
          className={cn('h-9 w-full justify-start gap-2 rounded-lg border-border/70 text-left text-xs font-normal', !value && 'text-muted-foreground', className)}
        >
          <Clock3 className="size-3.5 shrink-0" />
          <span className="truncate">{value ? formatDisplay(value) : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <div className="mb-3 text-sm font-semibold">Choose time</div>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <div>
            <div className="mb-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Hour</div>
            <div role="listbox" aria-label="Hour" className="h-48 overflow-y-auto rounded-lg border border-border/70 bg-background/40 p-1">
              {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={hour === item}
                  key={item}
                  onClick={() => setHour(item)}
                  className={cn('mb-0.5 flex h-8 w-full items-center justify-center rounded-md text-sm hover:bg-accent', hour === item && 'bg-primary text-primary-foreground hover:bg-primary')}
                >
                  {String(item).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Minute</div>
            <div role="listbox" aria-label="Minute" className="h-48 overflow-y-auto rounded-lg border border-border/70 bg-background/40 p-1">
              {Array.from({ length: 60 }, (_, item) => item).map((item) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={minute === item}
                  key={item}
                  onClick={() => setMinute(item)}
                  className={cn('mb-0.5 flex h-8 w-full items-center justify-center rounded-md text-sm hover:bg-accent', minute === item && 'bg-primary text-primary-foreground hover:bg-primary')}
                >
                  {String(item).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Period</div>
            <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-background/40 p-1">
              {(['AM', 'PM'] as const).map((item) => (
                <button
                  type="button"
                  aria-pressed={period === item}
                  key={item}
                  onClick={() => setPeriod(item)}
                  className={cn('flex h-8 items-center justify-center rounded-md px-2 text-xs hover:bg-accent', period === item && 'bg-primary text-primary-foreground hover:bg-primary')}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2">
          <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-muted-foreground" onClick={() => { onChange(null); setOpen(false) }}>
            <X className="size-3.5" /> Clear
          </Button>
          <Button type="button" size="sm" className="h-8 gap-1 text-xs" onClick={save}>
            <Check className="size-3.5" /> Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
