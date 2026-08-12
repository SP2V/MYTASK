import { useQuery } from '@tanstack/react-query'
import { taskRepository } from '@/features/tasks/services/task-repository'
import type { Task } from '@/features/tasks/schemas/task.schema'

export const tasksQueryKey = ['tasks'] as const

export function useTasks(): Task[] | undefined {
  const { data } = useQuery({
    queryKey: tasksQueryKey,
    queryFn: () => taskRepository.getTasks(),
  })
  return data
}

export function useTask(id: string | undefined): Task | undefined {
  const { data } = useQuery({
    queryKey: [...tasksQueryKey, id],
    queryFn: () => (id ? taskRepository.getTaskById(id) : undefined),
    enabled: !!id,
  })
  return data
}
