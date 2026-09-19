import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import { z } from 'zod'
import { projectFormSchema, type ProjectFormValues } from '@/features/projects/schemas/project.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface ProjectFormProps {
  onSubmit: (values: ProjectFormValues) => Promise<void> | void
  onCancel: () => void
}

const detailsSchema = projectFormSchema.pick({ title: true, description: true })
type DetailsValues = z.infer<typeof detailsSchema>

export function ProjectForm({ onSubmit, onCancel }: ProjectFormProps) {
  const [steps, setSteps] = useState<string[]>(['', ''])
  const [stepsError, setStepsError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { title: '', description: null },
  })

  const updateStep = (index: number, value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? value : s)))
  }

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  const submit = handleSubmit(async (details) => {
    const result = projectFormSchema.safeParse({ ...details, stepTitles: steps })
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'stepTitles')
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
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">{index + 1}.</span>
              <Input
                placeholder={`Step ${index + 1}`}
                value={step}
                onChange={(e) => updateStep(index, e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label={`Remove step ${index + 1}`}
                onClick={() => removeStep(index)}
                disabled={steps.length <= 1}
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
          onClick={() => setSteps((prev) => [...prev, ''])}
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
          Create Project
        </Button>
      </div>
    </form>
  )
}
