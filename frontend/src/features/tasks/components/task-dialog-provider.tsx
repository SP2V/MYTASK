import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TaskForm } from '@/features/tasks/components/task-form'
import { taskRepository } from '@/features/tasks/services/task-repository'
import { tasksQueryKey } from '@/features/tasks/hooks/use-tasks'
import type { Task, TaskFormValues } from '@/features/tasks/schemas/task.schema'
import { useSettings } from '@/features/settings/hooks/use-settings'

interface OpenCreateOptions {
  dueDate?: string | null
  categoryId?: string | null
}

interface TaskDialogContextValue {
  openCreate: (options?: OpenCreateOptions) => void
  openEdit: (task: Task) => void
}

const TaskDialogContext = createContext<TaskDialogContextValue | null>(null)

export function useTaskDialog(): TaskDialogContextValue {
  const ctx = useContext(TaskDialogContext)
  if (!ctx) throw new Error('useTaskDialog must be used within TaskDialogProvider')
  return ctx
}

type DialogState =
  | { mode: 'closed' }
  | { mode: 'create'; defaults: OpenCreateOptions }
  | { mode: 'edit'; task: Task }

export function TaskDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({ mode: 'closed' })
  const settings = useSettings()
  const queryClient = useQueryClient()

  const ctx = useMemo<TaskDialogContextValue>(
    () => ({
      openCreate: (options) => setState({ mode: 'create', defaults: options ?? {} }),
      openEdit: async (task) => {
        try {
          const fullTask = await taskRepository.getTaskById(task.id)
          setState({ mode: 'edit', task: fullTask ?? task })
        } catch {
          toast.error('Unable to open task. Please try again.')
        }
      },
    }),
    [],
  )

  const close = () => setState({ mode: 'closed' })

  const handleCreate = async (values: TaskFormValues, descriptionImage: string | null) => {
    try {
      await taskRepository.createTask(values, descriptionImage)
      await queryClient.invalidateQueries({ queryKey: tasksQueryKey })
      toast.success('Task created')
      close()
    } catch {
      toast.error('Unable to save task. Please try again.')
    }
  }

  const handleUpdate = async (id: string, values: TaskFormValues, descriptionImage: string | null) => {
    try {
      await taskRepository.updateTask(id, values, descriptionImage)
      await queryClient.invalidateQueries({ queryKey: tasksQueryKey })
      toast.success('Task updated')
      close()
    } catch {
      toast.error('Unable to save task. Please try again.')
    }
  }

  return (
    <TaskDialogContext.Provider value={ctx}>
      {children}
      <Dialog open={state.mode !== 'closed'} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{state.mode === 'edit' ? 'Edit Task' : 'Add Task'}</DialogTitle>
          </DialogHeader>
          {state.mode === 'create' && (
            <TaskForm
              key="create"
              submitLabel="Add Task"
              onCancel={close}
              onSubmit={handleCreate}
              defaultCategoryId={state.defaults.categoryId ?? settings.defaultCategoryId}
              defaultPriority={settings.defaultPriority}
              defaultValues={{ dueDate: state.defaults.dueDate ?? null }}
              defaultAdvancedOpen={!!state.defaults.dueDate}
            />
          )}
          {state.mode === 'edit' && (
            <TaskForm
              key={state.task.id}
              submitLabel="Save Changes"
              onCancel={close}
              defaultAdvancedOpen
              defaultValues={{
                title: state.task.title,
                description: state.task.description,
                priority: state.task.priority,
                calendarColorId: state.task.calendarColorId ?? null,
                categoryId: state.task.categoryId,
                dueDate: state.task.dueDate,
                dueTime: state.task.dueTime,
                recurrence: state.task.recurrence,
                notes: state.task.notes,
              }}
              defaultDescriptionImage={state.task.descriptionImage}
              onSubmit={(values, descriptionImage) => handleUpdate(state.task.id, values, descriptionImage)}
            />
          )}
        </DialogContent>
      </Dialog>
    </TaskDialogContext.Provider>
  )
}
