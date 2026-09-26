import { supabase } from '@/lib/supabase-client'
import { generateId } from '@/lib/id'
import { nowISO } from '@/lib/date'
import {
  taskSchema,
  taskCreateSchema,
  taskUpdateSchema,
  type Task,
  type TaskCreateInput,
  type TaskUpdateInput,
} from '@/features/tasks/schemas/task.schema'
import { computeNextOccurrence } from '@/features/tasks/services/recurrence-engine'
import { rowToTask, taskToRow, type TaskRow } from '@/features/tasks/services/task-mapper'
import {
  syncTaskToGoogleCalendar,
  deleteGoogleCalendarEvent,
} from '@/features/settings/services/google-calendar-sync'

const TABLE = 'tasks'
const DESCRIPTION_IMAGES_TABLE = 'task_description_images'

interface TaskDescriptionImageRow {
  task_id: string
  image_data?: string
}

function assertNoError<T>(data: T | null, error: { message: string } | null, notFoundMsg?: string): T {
  if (error) throw new Error(error.message)
  if (data === null) throw new Error(notFoundMsg ?? 'Not found')
  return data
}

export class TaskRepository {
  async getTasks(includeDescriptionImages = false): Promise<Task[]> {
    const { data, error } = await supabase.from(TABLE).select('*').order('created_at')
    if (error) throw new Error(error.message)
    const { data: images, error: imageError } = await supabase
      .from(DESCRIPTION_IMAGES_TABLE)
      .select(includeDescriptionImages ? 'task_id,image_data' : 'task_id')
    if (imageError) throw new Error(imageError.message)
    const imagesByTaskId = new Map(
      (images as unknown as TaskDescriptionImageRow[]).map((image) => [image.task_id, image.image_data]),
    )
    return (data as TaskRow[]).map((row) =>
      taskSchema.parse({
        ...rowToTask(row),
        hasDescriptionImage: imagesByTaskId.has(row.id),
        ...(includeDescriptionImages ? { descriptionImage: imagesByTaskId.get(row.id) ?? null } : {}),
      }),
    )
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return undefined
    const descriptionImage = await this.getDescriptionImage(id)
    return taskSchema.parse({
      ...rowToTask(data as TaskRow),
      descriptionImage,
      hasDescriptionImage: !!descriptionImage,
    })
  }

  async createTask(input: TaskCreateInput, descriptionImage: string | null = null): Promise<Task> {
    const parsedInput = taskCreateSchema.parse(input)
    const timestamp = nowISO()
    const task = taskSchema.parse({
      id: generateId(),
      ...parsedInput,
      status: 'TODO',
      completedAt: null,
      seriesId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    const { data, error } = await supabase.from(TABLE).insert(taskToRow(task)).select().single()
    const row = assertNoError(data, error)
    const result = taskSchema.parse({
      ...rowToTask(row as TaskRow),
      descriptionImage,
      hasDescriptionImage: !!descriptionImage,
    })
    if (descriptionImage) await this.saveDescriptionImage(result.id, descriptionImage)
    syncTaskToGoogleCalendar(result.id)
    return result
  }

  async updateTask(
    id: string,
    input: TaskUpdateInput,
    descriptionImage?: string | null,
  ): Promise<Task> {
    const existing = await this.getTaskById(id)
    if (!existing) throw new Error('Task not found')

    const parsedInput = taskUpdateSchema.parse(input)
    const updated = taskSchema.parse({
      ...existing,
      ...parsedInput,
      updatedAt: nowISO(),
    })
    const { data, error } = await supabase
      .from(TABLE)
      .update(taskToRow(updated))
      .eq('id', id)
      .select()
      .single()
    const row = assertNoError(data, error)
    const nextDescriptionImage = descriptionImage === undefined
      ? existing.descriptionImage ?? null
      : descriptionImage
    await this.saveDescriptionImage(id, nextDescriptionImage)
    const result = taskSchema.parse({
      ...rowToTask(row as TaskRow),
      descriptionImage: nextDescriptionImage,
      hasDescriptionImage: !!nextDescriptionImage,
    })
    syncTaskToGoogleCalendar(result.id)
    return result
  }

  async deleteTask(id: string): Promise<void> {
    const { data, error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id)
      .select('google_event_id')
      .maybeSingle()
    if (error) throw new Error(error.message)
    const googleEventId = (data as { google_event_id: string | null } | null)?.google_event_id
    if (googleEventId) deleteGoogleCalendarEvent(googleEventId)
  }

  async duplicateTask(id: string): Promise<Task> {
    const existing = await this.getTaskById(id)
    if (!existing) throw new Error('Task not found')

    const timestamp = nowISO()
    const duplicate = taskSchema.parse({
      ...existing,
      id: generateId(),
      title: `${existing.title} (copy)`,
      status: 'TODO',
      completedAt: null,
      seriesId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    const { data, error } = await supabase
      .from(TABLE)
      .insert(taskToRow(duplicate))
      .select()
      .single()
    const row = assertNoError(data, error)
    const descriptionImage = existing.descriptionImage ?? null
    if (descriptionImage) await this.saveDescriptionImage(duplicate.id, descriptionImage)
    const result = taskSchema.parse({
      ...rowToTask(row as TaskRow),
      descriptionImage,
      hasDescriptionImage: !!descriptionImage,
    })
    syncTaskToGoogleCalendar(result.id)
    return result
  }

  async archiveTask(id: string): Promise<Task> {
    return this.setStatus(id, 'ARCHIVED')
  }

  async reopenTask(id: string): Promise<Task> {
    const existing = await this.getTaskById(id)
    if (!existing) throw new Error('Task not found')

    const updated = taskSchema.parse({
      ...existing,
      status: 'TODO',
      completedAt: null,
      updatedAt: nowISO(),
    })
    const { data, error } = await supabase
      .from(TABLE)
      .update(taskToRow(updated))
      .eq('id', id)
      .select()
      .single()
    const row = assertNoError(data, error)
    const result = taskSchema.parse({
      ...rowToTask(row as TaskRow),
      descriptionImage: existing.descriptionImage ?? null,
      hasDescriptionImage: !!existing.descriptionImage,
    })
    syncTaskToGoogleCalendar(result.id)
    return result
  }

  /**
   * Completes a task. If it belongs to an enabled recurrence, also inserts
   * the next occurrence as a new task so the series continues rather than
   * ending permanently.
   */
  async completeTask(id: string): Promise<{ completed: Task; nextOccurrence: Task | null }> {
    const existing = await this.getTaskById(id)
    if (!existing) throw new Error('Task not found')

    const timestamp = nowISO()
    const completed = taskSchema.parse({
      ...existing,
      status: 'COMPLETED',
      completedAt: timestamp,
      updatedAt: timestamp,
    })
    const { data: completedRow, error: completeError } = await supabase
      .from(TABLE)
      .update(taskToRow(completed))
      .eq('id', id)
      .select()
      .single()
    const completedResult = taskSchema.parse(
      {
        ...rowToTask(assertNoError(completedRow, completeError) as TaskRow),
        descriptionImage: existing.descriptionImage ?? null,
        hasDescriptionImage: !!existing.descriptionImage,
      },
    )
    syncTaskToGoogleCalendar(completedResult.id)

    let nextOccurrence: Task | null = null
    if (existing.recurrence?.enabled && existing.dueDate) {
      const nextDueDate = computeNextOccurrence(existing.dueDate, existing.recurrence)
      if (nextDueDate) {
        const nextTask = taskSchema.parse({
          ...existing,
          id: generateId(),
          status: 'TODO',
          completedAt: null,
          dueDate: nextDueDate,
          seriesId: existing.seriesId ?? existing.id,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        const { data, error } = await supabase
          .from(TABLE)
          .insert(taskToRow(nextTask))
          .select()
          .single()
        const row = assertNoError(data, error)
        const descriptionImage = existing.descriptionImage ?? null
        if (descriptionImage) await this.saveDescriptionImage(nextTask.id, descriptionImage)
        nextOccurrence = taskSchema.parse({
          ...rowToTask(row as TaskRow),
          descriptionImage,
          hasDescriptionImage: !!descriptionImage,
        })
        syncTaskToGoogleCalendar(nextOccurrence.id)
      }
    }

    return { completed: completedResult, nextOccurrence }
  }

  private async setStatus(id: string, status: Task['status']): Promise<Task> {
    const existing = await this.getTaskById(id)
    if (!existing) throw new Error('Task not found')

    const updated = taskSchema.parse({ ...existing, status, updatedAt: nowISO() })
    const { data, error } = await supabase
      .from(TABLE)
      .update(taskToRow(updated))
      .eq('id', id)
      .select()
      .single()
    const row = assertNoError(data, error)
    const result = taskSchema.parse({
      ...rowToTask(row as TaskRow),
      descriptionImage: existing.descriptionImage ?? null,
      hasDescriptionImage: !!existing.descriptionImage,
    })
    syncTaskToGoogleCalendar(result.id)
    return result
  }

  async reassignCategory(fromCategoryId: string, toCategoryId: string | null): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ category_id: toCategoryId, updated_at: nowISO() })
      .eq('category_id', fromCategoryId)
    if (error) throw new Error(error.message)
  }

  async replaceAll(tasks: Task[]): Promise<void> {
    await this.clear()
    if (tasks.length === 0) return
    const { error } = await supabase.from(TABLE).insert(tasks.map(taskToRow))
    if (error) throw new Error(error.message)
    const images = tasks
      .filter((task) => task.descriptionImage)
      .map((task) => ({ task_id: task.id, image_data: task.descriptionImage! }))
    if (images.length) {
      const { error: imageError } = await supabase
        .from(DESCRIPTION_IMAGES_TABLE)
        .upsert(images, { onConflict: 'task_id' })
      if (imageError) throw new Error(imageError.message)
    }
  }

  private async getDescriptionImage(taskId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from(DESCRIPTION_IMAGES_TABLE)
      .select('image_data')
      .eq('task_id', taskId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as { image_data: string } | null)?.image_data ?? null
  }

  private async saveDescriptionImage(taskId: string, imageData: string | null): Promise<void> {
    if (imageData) {
      const { error } = await supabase
        .from(DESCRIPTION_IMAGES_TABLE)
        .upsert({ task_id: taskId, image_data: imageData }, { onConflict: 'task_id' })
      if (error) throw new Error(error.message)
      return
    }

    const { error } = await supabase.from(DESCRIPTION_IMAGES_TABLE).delete().eq('task_id', taskId)
    if (error) throw new Error(error.message)
  }

  async clear(): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw new Error(error.message)
  }
}

export const taskRepository = new TaskRepository()
