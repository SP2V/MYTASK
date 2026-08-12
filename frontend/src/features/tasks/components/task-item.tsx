import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MoreHorizontal, Repeat, Clock, Pencil, Copy, Archive, Trash2, RotateCcw } from 'lucide-react'
import type { Task } from '@/features/tasks/schemas/task.schema'
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
        'group flex items-start gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:border-foreground/20',
        isCompleted && 'opacity-60',
      )}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={handleToggleComplete}
        aria-label={isCompleted ? `Reopen ${task.title}` : `Complete ${task.title}`}
        className="mt-0.5"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => openEdit(task)}
            className={cn(
              'text-left text-sm font-medium hover:underline',
              isCompleted && 'line-through',
            )}
          >
            {task.title}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                aria-label={`More actions for ${task.title}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(task)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy /> Duplicate
              </DropdownMenuItem>
              {isCompleted && (
                <DropdownMenuItem onClick={handleToggleComplete}>
                  <RotateCcw /> Reopen
                </DropdownMenuItem>
              )}
              {!isArchived && (
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive /> Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {task.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{task.description}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className="gap-1"
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
            <Badge variant="outline" className="gap-1">
              <span
                className={cn('size-1.5 rounded-full', CATEGORY_COLOR_CLASSES[category.color])}
                aria-hidden="true"
              />
              {category.name}
            </Badge>
          )}

          {task.dueDate && (
            <Badge variant={overdue ? 'destructive' : 'secondary'} className="gap-1">
              <Clock className="size-3" />
              {formatDateShort(task.dueDate)}
              {task.dueTime && ` · ${formatTimeForDisplay(task.dueTime, settings.timeFormat)}`}
            </Badge>
          )}

          {task.recurrence?.enabled && (
            <Badge variant="outline" className="gap-1">
              <Repeat className="size-3" />
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
