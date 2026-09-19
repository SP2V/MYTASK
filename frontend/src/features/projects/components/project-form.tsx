import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import { z } from 'zod'
import { projectEditSchema, type ProjectEditValues } from '@/features/projects/schemas/project.schema'
import { generateId } from '@/lib/id'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface StepRow {
  localKey: string
  id?: string
  title: string
}

interface ProjectFormProps {
  defaultValues?: ProjectEditValues
  submitLabel?: string
  onSubmit: (values: ProjectEditValues) => Promise<void> | void
  onCancel: () => void
}

const detailsSchema = projectEditSchema.pick({ title: true, description: true })
type DetailsValues = z.infer<typeof detailsSchema>

function toRows(steps?: ProjectEditValues['steps']): StepRow[] {
  if (!steps || steps.length === 0) return [{ localKey: generateId(), title: '' }, { localKey: generateId(), title: '' }]
  return steps.map((s) => ({ localKey: s.id ?? generateId(), id: s.id, title: s.title }))
}

export function ProjectForm({ defaultValues, submitLabel = 'Create Project', onSubmit, onCancel }: ProjectFormProps) {
  const [rows, setRows] = useState<StepRow[]>(() => toRows(defaultValues?.steps))
  const [stepsError, setStepsError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { title: defaultValues?.title ?? '', description: defaultValues?.description ?? null },
  })

  const updateRow = (localKey: string, title: string) => {
    setRows((prev) => prev.map((r) => (r.localKey === localKey ? { ...r, title } : r)))
  }

  const removeRow = (localKey: string) => {
    setRows((prev) => prev.filter((r) => r.localKey !== localKey))
  }

  const submit = handleSubmit(async (details) => {
    const result = projectEditSchema.safeParse({
      ...details,
      steps: rows.map((r) => ({ id: r.id, title: r.title })),
    })
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'steps')
      setStepsError(issue?.message ?? 'Check your steps')
      return
    }
    setStepsError(null)
    setSubmitting(true)
    try {
      await onSubmit(result.data)
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-title">Title</Label>
        <Input
          id="project-title"
          placeholder="What are you working towards?"
          autoFocus
          aria-invalid={!!errors.title}
          {...register('title')}
        />
        {errors.title && (
          <p role="alert" className="text-xs text-destructive">
            {errors.title.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-description">Description</Label>
        <Textarea id="project-description" placeholder="Optional" {...register('description')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Steps</Label>
        <div className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <div key={row.localKey} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">{index + 1}.</span>
              <Input
                placeholder={`Step ${index + 1}`}
                value={row.title}
                onChange={(e) => updateRow(row.localKey, e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label={`Remove step ${index + 1}`}
                onClick={() => removeRow(row.localKey)}
                disabled={rows.length <= 1}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        {stepsError && (
          <p role="alert" className="text-xs text-destructive">
            {stepsError}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 w-fit gap-1.5"
          onClick={() => setRows((prev) => [...prev, { localKey: generateId(), title: '' }])}
        >
          <Plus className="size-4" />
          Add step
        </Button>
      </div>

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
