import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MoreHorizontal, Repeat, Clock, Pencil, Copy, Archive, Trash2, RotateCcw } from 'lucide-react'
import type { Task, TaskPriority } from '@/features/tasks/schemas/task.schema'
import { taskRepository } from '@/features/tasks/services/task-repository'
import { tasksQueryKey } from '@/features/tasks/hooks/use-tasks'
import { useTaskDialog } from '@/features/tasks/components/task-dialog-provider'
import { useCategories } from '@/features/categories/hooks/use-categories'
import { useSettings } from '@/features/settings/hooks/use-settings'
import { isOverdue, formatDateShort, formatTimeForDisplay } from '@/lib/date'
import { PRIORITY_META, CATEGORY_COLOR_CLASSES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/common/confirm-dialog'

interface TaskItemProps {
  task: Task
}

const PRIORITY_BORDER_CLASSES: Record<TaskPriority, string> = {
  URGENT: 'border-l-rose-500',
  HIGH: 'border-l-amber-500',
  MEDIUM: 'border-l-blue-500',
  LOW: 'border-l-slate-400 dark:border-l-slate-600',
}

export function TaskItem({ task }: TaskItemProps) {
  const { openEdit } = useTaskDialog()
  const categories = useCategories()
  const settings = useSettings()
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const category = categories?.find((c) => c.id === task.categoryId)
  const overdue = isOverdue(task)
  const isCompleted = task.status === 'COMPLETED'
  const isArchived = task.status === 'ARCHIVED'

  const invalidateTasks = () => queryClient.invalidateQueries({ queryKey: tasksQueryKey })

  const handleToggleComplete = async () => {
    try {
      if (isCompleted) {
        await taskRepository.reopenTask(task.id)
      } else {
        const { nextOccurrence } = await taskRepository.completeTask(task.id)
        toast.success(nextOccurrence ? 'Task completed — next occurrence scheduled' : 'Task completed')
      }
      invalidateTasks()
    } catch {
      toast.error('Unable to update task. Please try again.')
    }
  }

  const handleDuplicate = async () => {
    try {
      await taskRepository.duplicateTask(task.id)
      invalidateTasks()
      toast.success('Task duplicated')
    } catch {
      toast.error('Unable to duplicate task. Please try again.')
    }
  }

  const handleArchive = async () => {
    try {
      await taskRepository.archiveTask(task.id)
      invalidateTasks()
      toast.success('Task archived')
    } catch {
      toast.error('Unable to archive task. Please try again.')
    }
  }

  const handleDelete = async () => {
    try {
      await taskRepository.deleteTask(task.id)
      invalidateTasks()
      toast.success('Task deleted')
    } catch {
      toast.error('Unable to delete task. Please try again.')
    } finally {
      setDeleteOpen(false)
    }
  }

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3.5 rounded-xl border border-l-4 border-border/70 bg-card/75 px-4 py-3.5 shadow-2xs backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.2 hover:border-border hover:bg-card hover:shadow-xs',
        PRIORITY_BORDER_CLASSES[task.priority],
        isCompleted && 'opacity-60 bg-muted/25 border-l-muted-foreground/40',
      )}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={handleToggleComplete}
        aria-label={isCompleted ? `Reopen ${task.title}` : `Complete ${task.title}`}
        className="mt-0.5 size-4.5 rounded-md border-border transition-transform active:scale-90"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => openEdit(task)}
            className={cn(
              'text-left text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-primary',
              isCompleted && 'line-through text-muted-foreground font-normal',
            )}
          >
            {task.title}
          </button>

          {/* Quick Actions & Menu */}
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={`Edit ${task.title}`}
              onClick={() => openEdit(task)}
            >
              <Pencil className="size-3.5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={`More actions for ${task.title}`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-lg">
                <DropdownMenuItem onClick={() => openEdit(task)}>
                  <Pencil className="size-3.5" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="size-3.5" /> Duplicate
                </DropdownMenuItem>
                {isCompleted && (
                  <DropdownMenuItem onClick={handleToggleComplete}>
                    <RotateCcw className="size-3.5" /> Reopen
                  </DropdownMenuItem>
                )}
                {!isArchived && (
                  <DropdownMenuItem onClick={handleArchive}>
                    <Archive className="size-3.5" /> Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="size-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {task.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{task.description}</p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className="gap-1.5 rounded-md border-border/80 bg-background/50 px-2 py-0.5 text-[11px] font-medium shadow-xs"
            style={{ borderColor: PRIORITY_META[task.priority].colorVar }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: PRIORITY_META[task.priority].colorVar }}
              aria-hidden="true"
            />
            {PRIORITY_META[task.priority].label}
          </Badge>

          {category && (
            <Badge variant="outline" className="gap-1.5 rounded-md border-border/80 bg-background/50 px-2 py-0.5 text-[11px] font-medium shadow-xs">
              <span
                className={cn('size-1.5 rounded-full', CATEGORY_COLOR_CLASSES[category.color])}
                aria-hidden="true"
              />
              {category.name}
            </Badge>
          )}

          {task.dueDate && (
            <Badge
              variant={overdue ? 'destructive' : 'secondary'}
              className="gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium shadow-xs"
            >
              <Clock className="size-3" />
              {formatDateShort(task.dueDate)}
              {task.dueTime && ` · ${formatTimeForDisplay(task.dueTime, settings.timeFormat)}`}
            </Badge>
          )}

          {task.recurrence?.enabled && (
            <Badge variant="outline" className="gap-1.5 rounded-md border-border/80 bg-background/50 px-2 py-0.5 text-[11px] font-medium shadow-xs">
              <Repeat className="size-3 text-muted-foreground" />
              Repeats
            </Badge>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this task?"
        description={`"${task.title}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}
