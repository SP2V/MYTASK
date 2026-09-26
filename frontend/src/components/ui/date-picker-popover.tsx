import { useMemo, useState } from 'react'
import { addDays, addMonths, format, isSameDay, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerPopoverProps {
  id?: string
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  clearable?: boolean
}

function dateFromValue(value: string | null): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function valueFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function DatePickerPopover({
  id,
  value,
  onChange,
  placeholder = 'Choose a date',
  disabled = false,
  className,
  clearable = true,
}: DatePickerPopoverProps) {
  const selectedDate = dateFromValue(value)
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate ?? new Date()))
  const days = useMemo(() => {
    const first = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 0 })
    return Array.from({ length: 42 }, (_, index) => addDays(first, index))
  }, [visibleMonth])

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) setVisibleMonth(startOfMonth(dateFromValue(value) ?? new Date()))
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          disabled={disabled}
          aria-label={value ? `Date: ${format(selectedDate!, 'PPP')}` : placeholder}
          className={cn('h-9 w-full justify-start gap-2 rounded-lg border-border/70 text-left text-xs font-normal', !value && 'text-muted-foreground', className)}
        >
          <CalendarDays className="size-3.5 shrink-0" />
          <span className="truncate">{selectedDate ? format(selectedDate, 'PPP') : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[292px] p-3">
        <div className="mb-3 flex items-center justify-between">
          <Button type="button" variant="ghost" size="icon" aria-label="Previous month" className="size-8" onClick={() => setVisibleMonth((month) => subMonths(month, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="text-sm font-semibold">{format(visibleMonth, 'MMMM yyyy')}</div>
          <Button type="button" variant="ghost" size="icon" aria-label="Next month" className="size-8" onClick={() => setVisibleMonth((month) => addMonths(month, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, index) => <div key={`${day}-${index}`} className="py-1">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const isCurrentMonth = day.getMonth() === visibleMonth.getMonth()
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
            const isToday = isSameDay(day, new Date())
            return (
              <button
                type="button"
                key={valueFromDate(day)}
                aria-label={format(day, 'EEEE, MMMM d, yyyy')}
                aria-pressed={isSelected}
                onClick={() => {
                  onChange(valueFromDate(day))
                  setOpen(false)
                }}
                className={cn(
                  'flex size-8 items-center justify-center rounded-lg text-xs transition-colors hover:bg-accent hover:text-accent-foreground',
                  !isCurrentMonth && 'text-muted-foreground/50',
                  isToday && !isSelected && 'border border-primary/50 font-semibold',
                  isSelected && 'bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                )}
              >
                {day.getDate()}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2">
          {clearable ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-muted-foreground" onClick={() => { onChange(null); setOpen(false) }}>
              <X className="size-3.5" /> Clear
            </Button>
          ) : <span />}
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { onChange(valueFromDate(new Date())); setOpen(false) }}>
            Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
