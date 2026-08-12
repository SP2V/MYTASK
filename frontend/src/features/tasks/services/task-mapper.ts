import type { Task } from '@/features/tasks/schemas/task.schema'

/** Raw shape of a row from the `tasks` table (snake_case, as returned by PostgREST). */
export interface TaskRow {
  id: string
  title: string
  description: string | null
  status: Task['status']
  priority: Task['priority']
  category_id: string | null
  due_date: string | null
  due_time: string | null
  completed_at: string | null
  recurrence: Task['recurrence']
  reminder: Task['reminder']
  notes: string | null
  series_id: string | null
  created_at: string
  updated_at: string
}

/** Postgres `time` columns come back as "HH:MM:SS" — trim to the "HH:MM" the app uses. */
function normalizeTime(value: string | null): string | null {
  return value ? value.slice(0, 5) : null
}

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    categoryId: row.category_id,
    dueDate: row.due_date,
    dueTime: normalizeTime(row.due_time),
    completedAt: row.completed_at,
    recurrence: row.recurrence,
    reminder: row.reminder,
    notes: row.notes,
    seriesId: row.series_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function taskToRow(task: Task): TaskRow {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    category_id: task.categoryId,
    due_date: task.dueDate,
    due_time: task.dueTime,
    completed_at: task.completedAt,
    recurrence: task.recurrence,
    reminder: task.reminder,
    notes: task.notes,
    series_id: task.seriesId,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  }
}
