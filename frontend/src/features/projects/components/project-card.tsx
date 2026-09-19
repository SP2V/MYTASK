import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { projectRepository } from '@/features/projects/services/project-repository'
import { projectsQueryKey } from '@/features/projects/hooks/use-projects'
import { projectProgress, type Project, type ProjectEditValues } from '@/features/projects/schemas/project.schema'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { ProjectForm } from '@/features/projects/components/project-form'
import { cn } from '@/lib/utils'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const queryClient = useQueryClient()
  const [newStep, setNewStep] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const { done, total } = projectProgress(project)
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const complete = total > 0 && done === total

  const invalidate = () => queryClient.invalidateQueries({ queryKey: projectsQueryKey })

  const handleToggle = async (stepId: string, isDone: boolean) => {
    try {
      await projectRepository.toggleStep(project.id, stepId, isDone)
      invalidate()
    } catch {
      toast.error('Unable to update step. Please try again.')
    }
  }

  const handleAddStep = async () => {
    const trimmed = newStep.trim()
    if (!trimmed) return
    try {
      await projectRepository.addStep(project.id, trimmed, project.steps.length)
      setNewStep('')
      invalidate()
    } catch {
      toast.error('Unable to add step. Please try again.')
    }
  }

  const handleDeleteStep = async (stepId: string) => {
    if (project.steps.length <= 1) return
    try {
      await projectRepository.deleteStep(project.id, stepId)
      invalidate()
    } catch {
      toast.error('Unable to remove step. Please try again.')
    }
  }

  const handleDeleteProject = async () => {
    try {
      await projectRepository.deleteProject(project.id)
      invalidate()
      toast.success('Project deleted')
    } catch {
      toast.error('Unable to delete project. Please try again.')
    } finally {
      setDeleteOpen(false)
    }
  }

  const handleEdit = async (values: ProjectEditValues) => {
    try {
      await projectRepository.updateProject(project.id, project.steps, values)
      invalidate()
      toast.success('Project updated')
      setEditOpen(false)
    } catch {
      toast.error('Unable to update project. Please try again.')
    }
  }

  const handleDuplicate = async () => {
    try {
      await projectRepository.duplicateProject(project)
      invalidate()
      toast.success('Project duplicated')
    } catch {
      toast.error('Unable to duplicate project. Please try again.')
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{project.title}</h3>
          {project.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label={`Duplicate ${project.title}`}
            onClick={handleDuplicate}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label={`Edit ${project.title}`}
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${project.title}`}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {done} of {total} step{total === 1 ? '' : 's'} done
          </span>
          <span className={cn(complete && 'font-medium text-primary')}>{percent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full bg-primary transition-all', complete && 'bg-green-600')}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {project.steps.map((step, index) => (
          <li key={step.id} className="group flex items-center gap-2.5">
            <Checkbox
              id={`step-${step.id}`}
              checked={step.isDone}
              onCheckedChange={(checked) => handleToggle(step.id, checked === true)}
              aria-label={`Mark step ${index + 1} as ${step.isDone ? 'not done' : 'done'}`}
            />
            <label
              htmlFor={`step-${step.id}`}
              className={cn(
                'flex-1 text-sm',
                step.isDone && 'text-muted-foreground line-through',
              )}
            >
              {step.title}
            </label>
            <button
              type="button"
              onClick={() => handleDeleteStep(step.id)}
              aria-label={`Remove step ${index + 1}`}
              disabled={project.steps.length <= 1}
              className="opacity-0 text-muted-foreground hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-0"
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Input
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAddStep()
            }
          }}
          placeholder="Add a step…"
          className="h-9"
        />
        <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5" onClick={handleAddStep}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${project.title}"?`}
        description="This removes the project and all of its steps. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteProject}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <ProjectForm
            defaultValues={{
              title: project.title,
              description: project.description,
              steps: project.steps.map((s) => ({ id: s.id, title: s.title })),
            }}
            submitLabel="Save Changes"
            onCancel={() => setEditOpen(false)}
            onSubmit={handleEdit}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
