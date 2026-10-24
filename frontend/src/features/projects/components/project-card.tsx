import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Link2,
  ListChecks,
  Pencil,
  Plus,
  SquareCheckBig,
  Trash2,
  X,
} from 'lucide-react'
import { projectRepository } from '@/features/projects/services/project-repository'
import { projectsQueryKey } from '@/features/projects/hooks/use-projects'
import type { Project, ProjectEditValues } from '@/features/projects/schemas/project.schema'
import type { ProjectProgressSummary, ProjectStatus } from '@/features/projects/lib/project-progress'
import { taskRepository } from '@/features/tasks/services/task-repository'
import { tasksQueryKey } from '@/features/tasks/hooks/use-tasks'
import { useTaskDialog } from '@/features/tasks/components/task-dialog-provider'
import type { Task } from '@/features/tasks/schemas/task.schema'
import { useSettings } from '@/features/settings/hooks/use-settings'
import { formatDateShort, formatTimeForDisplay, isOverdue } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { ProjectForm } from '@/features/projects/components/project-form'
import { LinkTasksDialog } from '@/features/projects/components/link-tasks-dialog'
import { cn } from '@/lib/utils'

interface ProjectCardProps {
  project: Project
  summary: ProjectProgressSummary
  defaultExpanded?: boolean
}

const STATUS_META: Record<ProjectStatus, { label: string; className: string }> = {
  NOT_STARTED: { label: 'Not started', className: 'bg-muted text-muted-foreground' },
  IN_PROGRESS: { label: 'In progress', className: 'bg-primary/12 text-primary' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
}

interface ProjectTaskRowProps {
  task: Task
  onToggle: (task: Task) => void
  onUnlink: (task: Task) => void
}

function ProjectTaskRow({ task, onToggle, onUnlink }: ProjectTaskRowProps) {
  const { openEdit } = useTaskDialog()
  const settings = useSettings()
  const isCompleted = task.status === 'COMPLETED'
  const overdue = isOverdue(task)

  return (
    <li className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-accent/40">
      <Checkbox
        checked={isCompleted}
        onCheckedChange={() => onToggle(task)}
        aria-label={isCompleted ? `Reopen ${task.title}` : `Complete ${task.title}`}
        className="size-4 rounded"
      />
      <button
        type="button"
        onClick={() => openEdit(task)}
        className={cn(
          'min-w-0 flex-1 truncate text-left text-xs font-medium transition-colors hover:text-primary',
          isCompleted ? 'text-muted-foreground line-through' : 'text-foreground',
        )}
      >
        {task.title}
      </button>
      {task.dueDate && !isCompleted && (
        <span
          className={cn(
            'flex shrink-0 items-center gap-1 text-[11px] tabular-nums',
            overdue ? 'font-semibold text-destructive' : 'text-muted-foreground',
          )}
        >
          <Clock className="size-3" />
          {formatDateShort(task.dueDate)}
          {task.dueTime && ` · ${formatTimeForDisplay(task.dueTime, settings.timeFormat)}`}
        </span>
      )}
      <button
        type="button"
        onClick={() => onUnlink(task)}
        aria-label={`Remove ${task.title} from project`}
        title="Remove from project (keeps the task)"
        className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
      >
        <X className="size-3" />
      </button>
    </li>
  )
}

export function ProjectCard({ project, summary, defaultExpanded = false }: ProjectCardProps) {
  const queryClient = useQueryClient()
  const { openCreate } = useTaskDialog()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [newStep, setNewStep] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const { percent, status } = summary
  const complete = status === 'COMPLETED'
  const detailsId = `project-details-${project.id}`

  const invalidate = () => queryClient.invalidateQueries({ queryKey: projectsQueryKey })
  const invalidateTasks = () => queryClient.invalidateQueries({ queryKey: tasksQueryKey })

  const handleToggle = async (stepId: string, isDone: boolean) => {
    try {
      await projectRepository.toggleStep(project.id, stepId, isDone)
      invalidate()
    } catch {
      toast.error('Unable to update step. Please try again.')
    }
  }

  const handleToggleTask = async (task: Task) => {
    try {
      if (task.status === 'COMPLETED') {
        await taskRepository.reopenTask(task.id)
      } else {
        await taskRepository.completeTask(task.id)
      }
      invalidateTasks()
    } catch {
      toast.error('Unable to update task. Please try again.')
    }
  }

  const handleUnlinkTask = async (task: Task) => {
    try {
      await taskRepository.setTasksProject([task.id], null)
      invalidateTasks()
      toast.success('Task removed from project')
    } catch {
      toast.error('Unable to remove task. Please try again.')
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
      // Linked tasks are unlinked by the database (on delete set null).
      invalidateTasks()
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

  const nextLabel = summary.nextStep?.title ?? summary.nextTask?.title ?? null

  return (
    <div className="rounded-xl border border-border/70 bg-card/80 shadow-xs backdrop-blur-xs transition-all duration-200 hover:border-border hover:shadow-sm">
      {/* Summary */}
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={detailsId}
            className="group flex min-w-0 flex-1 items-start gap-2 text-left"
          >
            <ChevronDown
              className={cn(
                'mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                !expanded && '-rotate-90',
              )}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-bold tracking-tight text-foreground group-hover:text-primary">
                  {project.title}
                </h3>
                <span
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    STATUS_META[status].className,
                  )}
                >
                  {complete && <CheckCircle2 className="size-3" />}
                  {STATUS_META[status].label}
                </span>
                {summary.overdueCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-destructive/12 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                    <AlertTriangle className="size-3" />
                    {summary.overdueCount} overdue
                  </span>
                )}
              </div>
              {project.description && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{project.description}</p>
              )}
            </div>
          </button>
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={`Duplicate ${project.title}`}
              onClick={handleDuplicate}
            >
              <Copy className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={`Edit ${project.title}`}
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Delete ${project.title}`}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={`${project.title} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div
              className={cn('h-full rounded-full transition-all duration-300', complete ? 'bg-emerald-500' : 'bg-primary')}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span
            className={cn(
              'w-10 text-right text-sm font-bold tabular-nums',
              complete ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground',
            )}
          >
            {percent}%
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ListChecks className="size-3.5" />
            {summary.stepsDone}/{summary.stepsTotal} steps
          </span>
          <span className="flex items-center gap-1.5">
            <SquareCheckBig className="size-3.5" />
            {summary.tasksDone}/{summary.tasksTotal} tasks
          </span>
          {nextLabel && !complete && (
            <span className="flex min-w-0 items-center gap-1.5">
              <ArrowRight className="size-3.5 shrink-0" />
              <span className="shrink-0">Next:</span>
              <span className="truncate font-medium text-foreground">{nextLabel}</span>
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      {expanded && (
        <div id={detailsId} className="grid gap-5 border-t border-border/60 p-4 sm:p-5 md:grid-cols-2">
          <section className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Steps</h4>
            <ul className="flex flex-col gap-1">
              {project.steps.map((step, index) => (
                <li
                  key={step.id}
                  className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-accent/40"
                >
                  <Checkbox
                    id={`step-${step.id}`}
                    checked={step.isDone}
                    onCheckedChange={(checked) => handleToggle(step.id, checked === true)}
                    aria-label={`Mark step ${index + 1} as ${step.isDone ? 'not done' : 'done'}`}
                    className="size-4 rounded"
                  />
                  <label
                    htmlFor={`step-${step.id}`}
                    className={cn(
                      'flex-1 cursor-pointer text-xs font-medium transition-colors',
                      step.isDone ? 'text-muted-foreground line-through' : 'text-foreground',
                    )}
                  >
                    {step.title}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDeleteStep(step.id)}
                    aria-label={`Remove step ${index + 1}`}
                    disabled={project.steps.length <= 1}
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 pt-1">
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
                aria-label={`New step for ${project.title}`}
                className="h-8.5 rounded-lg border-border/70 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8.5 shrink-0 gap-1.5 rounded-lg border-border/70 text-xs"
                onClick={handleAddStep}
              >
                <Plus className="size-3.5" />
                Add
              </Button>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tasks</h4>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 rounded-md px-2 text-xs"
                  onClick={() => setLinkOpen(true)}
                >
                  <Link2 className="size-3.5" />
                  Add existing
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 rounded-md px-2 text-xs"
                  onClick={() => openCreate({ projectId: project.id })}
                >
                  <Plus className="size-3.5" />
                  New task
                </Button>
              </div>
            </div>
            {summary.tasksTotal === 0 ? (
              <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                No tasks linked yet. Add existing tasks or create a new one.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {[...summary.openTasks, ...summary.completedTasks].map((task) => (
                  <ProjectTaskRow key={task.id} task={task} onToggle={handleToggleTask} onUnlink={handleUnlinkTask} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <LinkTasksDialog project={project} open={linkOpen} onOpenChange={setLinkOpen} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${project.title}"?`}
        description="This removes the project and all of its steps. Linked tasks are kept but no longer belong to a project. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteProject}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl">
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
