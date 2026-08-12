import type { ReactNode } from 'react'
import type { Task } from '@/features/tasks/schemas/task.schema'
import { TaskItem } from '@/features/tasks/components/task-item'
import { Skeleton } from '@/components/ui/skeleton'

interface TaskListProps {
  tasks: Task[] | undefined
  emptyState: ReactNode
}

export function TaskList({ tasks, emptyState }: TaskListProps) {
  if (tasks === undefined) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] w-full" />
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return <>{emptyState}</>
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  )
}
