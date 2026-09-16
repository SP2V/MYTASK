import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { useTasks, tasksQueryKey } from '@/features/tasks/hooks/use-tasks'
import { taskRepository } from '@/features/tasks/services/task-repository'
import { useTaskDialog } from '@/features/tasks/components/task-dialog-provider'
import { queryTasks } from '@/features/tasks/lib/task-query'
import { PRIORITY_META } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/common/empty-state'

const NOTE_COLORS = [
  'bg-yellow-200/90 dark:bg-yellow-300/20',
  'bg-pink-200/90 dark:bg-pink-300/20',
  'bg-sky-200/90 dark:bg-sky-300/20',
  'bg-lime-200/90 dark:bg-lime-300/20',
  'bg-orange-200/90 dark:bg-orange-300/20',
  'bg-violet-200/90 dark:bg-violet-300/20',
]

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function PostitBoard() {
  const tasks = useTasks()
  const { openEdit } = useTaskDialog()
  const queryClient = useQueryClient()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [trashActive, setTrashActive] = useState(false)

  const notes = tasks ? queryTasks(tasks, { view: 'ALL', sortField: 'createdAt', sortDirection: 'desc' }) : []

  const invalidateTasks = () => queryClient.invalidateQueries({ queryKey: tasksQueryKey })

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setTrashActive(false)
    const id = e.dataTransfer.getData('text/plain')
    setDraggingId(null)
    if (!id) return
    const task = notes.find((t) => t.id === id)
    try {
      await taskRepository.deleteTask(id)
      invalidateTasks()
      toast.success(task ? `"${task.title}" deleted` : 'Task deleted')
    } catch {
      toast.error('Unable to delete task. Please try again.')
    }
  }

  if (tasks && notes.length === 0) {
    return <EmptyState icon="🗒️" title="No sticky notes" description="Add a task to see it here." />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex min-h-[420px] flex-wrap content-start gap-5 rounded-lg border border-dashed p-5">
        {notes.map((task, index) => {
          const hash = hashString(task.id)
          const rotation = (hash % 9) - 4
          const color = NOTE_COLORS[hash % NOTE_COLORS.length]
          const isCompleted = task.status === 'COMPLETED'

          return (
            <div
              key={task.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', task.id)
                e.dataTransfer.effectAllowed = 'move'
                setDraggingId(task.id)
              }}
              onDragEnd={() => setDraggingId(null)}
              onClick={() => openEdit(task)}
              style={{ transform: `rotate(${rotation}deg)`, animationDelay: `${index * 20}ms` }}
              className={cn(
                'flex h-40 w-40 cursor-grab flex-col justify-between rounded-sm p-3 shadow-md transition-opacity select-none active:cursor-grabbing',
                color,
                draggingId === task.id && 'opacity-30',
                isCompleted && 'opacity-60',
              )}
            >
              <p
                className={cn(
                  'line-clamp-4 text-sm font-medium text-neutral-800 dark:text-neutral-100',
                  isCompleted && 'line-through',
                )}
              >
                {task.title}
              </p>
              <span
                className="self-start rounded-full px-2 py-0.5 text-[10px] font-semibold text-neutral-700 dark:text-neutral-200"
                style={{ backgroundColor: PRIORITY_META[task.priority].colorVar }}
              >
                {PRIORITY_META[task.priority].label}
              </span>
            </div>
          )
        })}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setTrashActive(true)
        }}
        onDragLeave={() => setTrashActive(false)}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 transition-colors',
          trashActive ? 'border-destructive bg-destructive/10' : 'border-muted-foreground/30',
        )}
      >
        <Trash2
          className={cn('size-8 transition-colors', trashActive ? 'text-destructive' : 'text-muted-foreground')}
        />
        <p className={cn('text-sm', trashActive ? 'text-destructive' : 'text-muted-foreground')}>
          Drag a note here to delete it
        </p>
      </div>
    </div>
  )
}
