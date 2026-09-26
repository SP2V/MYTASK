import { useState, type ClipboardEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, ChevronUp, ImagePlus, SlidersHorizontal, X } from 'lucide-react'
import { toast } from 'sonner'
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
import { DatePickerPopover } from '@/components/ui/date-picker-popover'
import { TimePickerPopover } from '@/components/ui/time-picker-popover'
import { cn } from '@/lib/utils'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024

const CALENDAR_COLORS = [
  { id: '1', name: 'Lavender', hex: '#7986cb' },
  { id: '2', name: 'Sage', hex: '#33b679' },
  { id: '3', name: 'Grape', hex: '#8e24aa' },
  { id: '4', name: 'Flamingo', hex: '#e67c73' },
  { id: '5', name: 'Banana', hex: '#f6c026' },
  { id: '6', name: 'Tangerine', hex: '#f5511d' },
  { id: '7', name: 'Peacock', hex: '#039be5' },
  { id: '8', name: 'Graphite', hex: '#616161' },
  { id: '9', name: 'Blueberry', hex: '#3f51b5' },
  { id: '10', name: 'Basil', hex: '#0b8043' },
  { id: '11', name: 'Tomato', hex: '#d50000' },
] as const

function compressScreenshot(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(sourceUrl)
      const maxDimension = 1800
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Unable to prepare screenshot'))
        return
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      const encode = (quality: number) =>
        new Promise<Blob>((blobResolve, blobReject) => {
          canvas.toBlob(
            (blob) => (blob ? blobResolve(blob) : blobReject(new Error('Unable to encode screenshot'))),
            'image/webp',
            quality,
          )
        })

      void (async () => {
        try {
          let blob = await encode(0.88)
          if (blob.size > MAX_SCREENSHOT_BYTES) blob = await encode(0.72)
          if (blob.size > MAX_SCREENSHOT_BYTES) {
            reject(new Error('Screenshot exceeds the 2 MB limit after compression'))
            return
          }
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error('Unable to read screenshot'))
          reader.readAsDataURL(blob)
        } catch (error) {
          reject(error)
        }
      })()
    }

    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl)
      reject(new Error('Unsupported screenshot image'))
    }
    image.src = sourceUrl
  })
}

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
  defaultDescriptionImage?: string | null
  onSubmit: (values: TaskFormValues, descriptionImage: string | null) => Promise<void> | void
  onCancel: () => void
  submitLabel?: string
  defaultAdvancedOpen?: boolean
  defaultCategoryId?: string | null
  defaultPriority?: TaskFormValues['priority']
}

export function TaskForm({
  defaultValues,
  defaultDescriptionImage = null,
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
  const [descriptionImage, setDescriptionImage] = useState<string | null>(defaultDescriptionImage)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: null,
      priority: defaultPriority,
      calendarColorId: null,
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

  const handleDescriptionPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'))
    const file = imageItem?.getAsFile()
    if (!file) return

    event.preventDefault()
    void compressScreenshot(file)
      .then(setDescriptionImage)
      .catch(() => toast.error('Unable to paste screenshot. Use an image under 2 MB.'))
  }

  const submit = handleSubmit(async (values) => {
    setSubmitting(true)
    try {
      await onSubmit(values, descriptionImage)
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <form onSubmit={submit} className="flex flex-col gap-4.5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="task-title" className="text-sm font-semibold text-foreground">
          Task title
        </Label>
        <Input
          id="task-title"
          placeholder="What needs to be done?"
          autoFocus
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'task-title-error' : undefined}
          className="h-10 rounded-xl border-border/80 text-sm font-medium transition-colors focus:border-primary"
          {...register('title')}
        />
        {errors.title && (
          <p id="task-title-error" role="alert" className="text-xs font-medium text-destructive">
            {errors.title.message}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="flex items-center gap-1.5 self-start rounded-md py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        aria-expanded={advancedOpen}
      >
        <SlidersHorizontal className="size-3.5" />
        <span>Advanced options</span>
        {advancedOpen ? <ChevronUp className="size-3.5 ml-0.5" /> : <ChevronDown className="size-3.5 ml-0.5" />}
      </button>

      {advancedOpen && (
        <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-accent/25 p-4 backdrop-blur-xs">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-description" className="text-xs font-medium text-muted-foreground">
              Description
            </Label>
            <Textarea
              id="task-description"
              placeholder="Add more detail, then paste a screenshot with Ctrl+V (optional)"
              className="min-h-20 rounded-lg border-border/70 text-xs"
              onPaste={handleDescriptionPaste}
              {...register('description')}
            />
            {descriptionImage ? (
              <div className="relative mt-2 inline-flex max-w-full rounded-lg border border-border/70 bg-background/70 p-2">
                <img
                  src={descriptionImage}
                  alt="Pasted task screenshot"
                  className="max-h-56 max-w-full rounded-md object-contain"
                />
                <button
                  type="button"
                  onClick={() => setDescriptionImage(null)}
                  aria-label="Remove screenshot"
                  className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ImagePlus className="size-3.5" /> Paste a screenshot directly into this field.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-due-date" className="text-xs font-medium text-muted-foreground">
                Due date
              </Label>
              <Controller
                control={control}
                name="dueDate"
                render={({ field }) => (
                  <DatePickerPopover
                    id="task-due-date"
                    value={field.value}
                    onChange={(nextDate) => {
                      field.onChange(nextDate)
                      if (!nextDate) setValue('dueTime', null, { shouldValidate: true })
                    }}
                    placeholder="Choose a date"
                  />
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-due-time" className="text-xs font-medium text-muted-foreground">
                Due time
              </Label>
              <Controller
                control={control}
                name="dueTime"
                render={({ field }) => (
                  <TimePickerPopover
                    id="task-due-time"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Choose a time"
                    disabled={!dueDate}
                  />
                )}
              />
              {errors.dueTime && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.dueTime.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground">Calendar event color</Label>
            <Controller
              control={control}
              name="calendarColorId"
              render={({ field }) => (
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Calendar event color">
                  <button
                    type="button"
                    aria-label="Default calendar color"
                    aria-pressed={!field.value}
                    onClick={() => field.onChange(null)}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-full border text-[10px] font-semibold text-muted-foreground transition-all',
                      !field.value ? 'border-foreground ring-2 ring-ring ring-offset-2 ring-offset-background' : 'border-border hover:border-foreground/50',
                    )}
                  >
                    A
                  </button>
                  {CALENDAR_COLORS.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      aria-label={`${color.name} calendar color`}
                      aria-pressed={field.value === color.id}
                      onClick={() => field.onChange(color.id)}
                      className={cn(
                        'size-7 rounded-full border border-black/10 transition-all',
                        field.value === color.id && 'ring-2 ring-foreground ring-offset-2 ring-offset-background',
                      )}
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
              )}
            />
            <p className="text-[11px] text-muted-foreground">Choose how this task appears on the app and Google calendars.</p>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-priority" className="text-xs font-medium text-muted-foreground">
                Priority
              </Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="task-priority" className="rounded-lg border-border/70 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
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
              <Label htmlFor="task-category" className="text-xs font-medium text-muted-foreground">
                Category
              </Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? 'none'}
                    onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
                  >
                    <SelectTrigger id="task-category" className="rounded-lg border-border/70 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
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
            <Label className="text-xs font-medium text-muted-foreground">Recurrence</Label>
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
                      <SelectTrigger className="rounded-lg border-border/70 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {RECURRENCE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {field.value && (
                      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Every</span>
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            className="h-8 w-16 rounded-md text-xs"
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
                                    'flex size-8 items-center justify-center rounded-full border text-xs font-semibold transition-all',
                                    active
                                      ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                                      : 'border-border/80 bg-background text-muted-foreground hover:border-foreground/40',
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
                          <DatePickerPopover
                            id="recurrence-end-date"
                            value={field.value.endDate}
                            onChange={(endDate) => field.onChange({ ...field.value!, endDate })}
                            placeholder="No end date"
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
            <Label htmlFor="task-notes" className="text-xs font-medium text-muted-foreground">
              Notes
            </Label>
            <Textarea
              id="task-notes"
              placeholder="Any extra notes (optional)"
              className="min-h-16 rounded-lg border-border/70 text-xs"
              {...register('notes')}
            />
          </div>
        </div>
      )}

      {recurrence && !advancedOpen && (
        <p className="text-xs text-muted-foreground">Recurrence configured — expand advanced options to edit.</p>
      )}

      <div className="flex justify-end gap-2.5 pt-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="rounded-xl shadow-xs"
          disabled={submitting}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
