import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import type { EventClickArg, EventDropArg } from '@fullcalendar/core'
import { useTasks, tasksQueryKey } from '@/features/tasks/hooks/use-tasks'
import { useCategories } from '@/features/categories/hooks/use-categories'
import { useTaskDialog } from '@/features/tasks/components/task-dialog-provider'
import { taskRepository } from '@/features/tasks/services/task-repository'
import { dateToDateOnlyString } from '@/lib/date'
import type { Task } from '@/features/tasks/schemas/task.schema'

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  URGENT: '#ef4444',
  HIGH: '#f59e0b',
  MEDIUM: '#3b82f6',
  LOW: '#94a3b8',
}

export function TaskCalendar() {
  const tasks = useTasks()
  const categories = useCategories()
  const { openCreate, openEdit } = useTaskDialog()
  const queryClient = useQueryClient()

  const withDueDate = useMemo(
    () => (tasks ?? []).filter((t) => t.dueDate && t.status !== 'ARCHIVED'),
    [tasks],
  )
  const taskMap = useMemo(() => new Map(withDueDate.map((t) => [t.id, t])), [withDueDate])

  const events = useMemo(() => {
    return withDueDate.map((task) => {
      const category = categories?.find((c) => c.id === task.categoryId)
      return {
        id: task.id,
        title: task.title,
        start: task.dueTime ? `${task.dueDate}T${task.dueTime}` : task.dueDate!,
        allDay: !task.dueTime,
        backgroundColor: PRIORITY_COLORS[task.priority],
        borderColor: PRIORITY_COLORS[task.priority],
        classNames: task.status === 'COMPLETED' ? ['opacity-50', 'line-through'] : [],
        extendedProps: { categoryName: category?.name },
      }
    })
  }, [withDueDate, categories])

  const handleDateClick = (arg: DateClickArg) => {
    openCreate({ dueDate: arg.dateStr.slice(0, 10) })
  }

  const handleEventClick = (arg: EventClickArg) => {
    const task = taskMap.get(arg.event.id)
    if (task) openEdit(task)
  }

  const handleEventDrop = async (arg: EventDropArg) => {
    const task = taskMap.get(arg.event.id)
    if (!task || !arg.event.start) return
    try {
      await taskRepository.updateTask(task.id, { dueDate: dateToDateOnlyString(arg.event.start) })
      await queryClient.invalidateQueries({ queryKey: tasksQueryKey })
      toast.success('Task rescheduled')
    } catch {
      toast.error('Unable to reschedule task. Please try again.')
      arg.revert()
    }
  }

  return (
    <div className="relative isolate h-full overflow-hidden rounded-2xl">
      <div
        className="pointer-events-none absolute -left-16 -top-24 -z-10 size-64 rounded-full bg-primary/30 blur-3xl dark:bg-primary/20"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-10 -z-10 size-72 rounded-full bg-priority-medium/30 blur-3xl dark:bg-priority-medium/20"
        aria-hidden="true"
      />
      <div className="calendar-wrapper h-full rounded-2xl border border-white/40 bg-white/50 p-2 shadow-xl shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-black/20 md:p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek',
          }}
          height="100%"
          editable
          selectable
          dayMaxEvents={3}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
        />
      </div>
    </div>
  )
}
