import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  taskFormSchema,
  type TaskFormValues,
  type RecurrenceFrequency,
} from '@/features/tasks/schemas/task.schema'
import { useCategories } from '@/features/categories/hooks/use-categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const RECURRENCE_OPTIONS: { value: 'NONE' | RecurrenceFrequency; label: string }[] = [
  { value: 'NONE', label: 'Does not repeat' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'CUSTOM', label: 'Custom (every N days)' },
]

interface TaskFormProps {
  defaultValues?: Partial<TaskFormValues>
  onSubmit: (values: TaskFormValues) => Promise<void> | void
  onCancel: () => void
  submitLabel?: string
  defaultAdvancedOpen?: boolean
  defaultCategoryId?: string | null
  defaultPriority?: TaskFormValues['priority']
}

export function TaskForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save Task',
  defaultAdvancedOpen = false,
  defaultCategoryId = null,
  defaultPriority = 'MEDIUM',
}: TaskFormProps) {
  const categories = useCategories()
  const [advancedOpen, setAdvancedOpen] = useState(defaultAdvancedOpen)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: null,
      priority: defaultPriority,
      categoryId: defaultCategoryId,
      dueDate: null,
      dueTime: null,
      recurrence: null,
      notes: null,
      ...defaultValues,
    },
  })

  const dueDate = watch('dueDate')
  const recurrence = watch('recurrence')

  const submit = handleSubmit(async (values) => {
    setSubmitting(true)
    try {
      await onSubmit(values)
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="task-title">Task title</Label>
        <Input
          id="task-title"
          placeholder="What needs to be done?"
          autoFocus
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'task-title-error' : undefined}
          {...register('title')}
        />
        {errors.title && (
          <p id="task-title-error" role="alert" className="text-xs text-destructive">
            {errors.title.message}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="flex items-center gap-1 self-start text-sm font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={advancedOpen}
      >
        {advancedOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        Advanced options
      </button>

      {advancedOpen && (
        <div className="flex flex-col gap-4 rounded-md border p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              placeholder="Add more detail (optional)"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-due-date">Due date</Label>
              <Input id="task-due-date" type="date" {...register('dueDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-due-time">Due time</Label>
              <Input
                id="task-due-time"
                type="time"
                disabled={!dueDate}
                aria-invalid={!!errors.dueTime}
                {...register('dueTime')}
              />
              {errors.dueTime && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.dueTime.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="task-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-category">Category</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? 'none'}
                    onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
                  >
                    <SelectTrigger id="task-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Uncategorized</SelectItem>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Recurrence</Label>
            <Controller
              control={control}
              name="recurrence"
              render={({ field }) => {
                const value = field.value?.frequency ?? 'NONE'
                return (
                  <div className="flex flex-col gap-3">
                    <Select
                      value={value}
                      onValueChange={(v) => {
                        if (v === 'NONE') {
                          field.onChange(null)
                        } else {
                          field.onChange({
                            frequency: v as RecurrenceFrequency,
                            interval: field.value?.interval ?? 1,
                            daysOfWeek: field.value?.daysOfWeek ?? null,
                            dayOfMonth: field.value?.dayOfMonth ?? null,
                            endDate: field.value?.endDate ?? null,
                            enabled: true,
                          })
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {field.value && (
                      <div className="flex flex-col gap-3 rounded-md bg-muted/50 p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Every</span>
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            className="w-16"
                            value={field.value.interval}
                            onChange={(e) =>
                              field.onChange({
                                ...field.value!,
                                interval: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                          />
                          <span className="text-muted-foreground">
                            {field.value.frequency === 'DAILY' && 'day(s)'}
                            {field.value.frequency === 'WEEKLY' && 'week(s)'}
                            {field.value.frequency === 'MONTHLY' && 'month(s)'}
                            {field.value.frequency === 'YEARLY' && 'year(s)'}
                            {field.value.frequency === 'CUSTOM' && 'day(s)'}
                          </span>
                        </div>

                        {field.value.frequency === 'WEEKLY' && (
                          <div className="flex gap-1">
                            {WEEKDAY_LABELS.map((label, index) => {
                              const active = field.value!.daysOfWeek?.includes(index) ?? false
                              return (
                                <button
                                  type="button"
                                  key={index}
                                  aria-pressed={active}
                                  aria-label={
                                    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
                                      index
                                    ]
                                  }
                                  onClick={() => {
                                    const current = field.value!.daysOfWeek ?? []
                                    const next = active
                                      ? current.filter((d) => d !== index)
                                      : [...current, index]
                                    field.onChange({
                                      ...field.value!,
                                      daysOfWeek: next.length ? next : null,
                                    })
                                  }}
                                  className={cn(
                                    'flex size-8 items-center justify-center rounded-full border text-xs font-medium',
                                    active
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-input bg-background text-muted-foreground',
                                  )}
                                >
                                  {label}
                                </button>
                              )
                            })}
                          </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="recurrence-end-date" className="text-xs text-muted-foreground">
                            Ends on (optional)
                          </Label>
                          <Input
                            id="recurrence-end-date"
                            type="date"
                            value={field.value.endDate ?? ''}
                            onChange={(e) =>
                              field.onChange({ ...field.value!, endDate: e.target.value || null })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea id="task-notes" placeholder="Any extra notes (optional)" {...register('notes')} />
          </div>
        </div>
      )}

      {recurrence && !advancedOpen && (
        <p className="text-xs text-muted-foreground">Recurrence configured — expand advanced options to edit.</p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
