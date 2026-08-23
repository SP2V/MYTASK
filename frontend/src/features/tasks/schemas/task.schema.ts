import { z } from 'zod'

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'] as const
export const taskStatusSchema = z.enum(TASK_STATUSES)
export type TaskStatus = z.infer<typeof taskStatusSchema>

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
export const taskPrioritySchema = z.enum(TASK_PRIORITIES)
export type TaskPriority = z.infer<typeof taskPrioritySchema>

export const RECURRENCE_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM'] as const
export const recurrenceFrequencySchema = z.enum(RECURRENCE_FREQUENCIES)
export type RecurrenceFrequency = z.infer<typeof recurrenceFrequencySchema>

const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/
const timeOnlyRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const dateOnlySchema = z.string().regex(dateOnlyRegex, 'Invalid date format')
export const timeOnlySchema = z.string().regex(timeOnlyRegex, 'Invalid time format')

/**
 * No `.default()` on any field in this file: every caller (TaskForm's
 * defaultValues, the repositories) always supplies a fully-populated object
 * already, and omitting defaults keeps each schema's input/output shape
 * identical — required for `zodResolver` to type `useForm` correctly.
 */
export const recurrenceSchema = z
  .object({
    frequency: recurrenceFrequencySchema,
    interval: z.number().int().min(1).max(365),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).nullable(),
    dayOfMonth: z.number().int().min(1).max(31).nullable(),
    endDate: dateOnlySchema.nullable(),
    enabled: z.boolean(),
  })
  .strict()
export type Recurrence = z.infer<typeof recurrenceSchema>

function requireDueDateForDueTime(task: { dueDate: string | null; dueTime: string | null }) {
  return task.dueTime === null || task.dueDate !== null
}

export const taskSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().max(5000).nullable(),
    status: taskStatusSchema,
    priority: taskPrioritySchema,
    categoryId: z.string().nullable(),
    dueDate: dateOnlySchema.nullable(),
    dueTime: timeOnlySchema.nullable(),
    completedAt: z.string().datetime({ offset: true }).nullable(),
    recurrence: recurrenceSchema.nullable(),
    notes: z.string().max(5000).nullable(),
    seriesId: z.string().nullable(),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .refine(requireDueDateForDueTime, {
    message: 'Due time requires a due date',
    path: ['dueTime'],
  })
export type Task = z.infer<typeof taskSchema>

export const taskFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().max(5000).nullable(),
    priority: taskPrioritySchema,
    categoryId: z.string().nullable(),
    dueDate: dateOnlySchema.nullable(),
    dueTime: timeOnlySchema.nullable(),
    recurrence: recurrenceSchema.nullable(),
    notes: z.string().max(5000).nullable(),
  })
  .refine(requireDueDateForDueTime, {
    message: 'Due time requires a due date',
    path: ['dueTime'],
  })
export type TaskFormValues = z.infer<typeof taskFormSchema>

export const taskCreateSchema = taskFormSchema
export type TaskCreateInput = TaskFormValues

export const taskUpdateSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200).optional(),
    description: z.string().max(5000).nullable().optional(),
    priority: taskPrioritySchema.optional(),
    categoryId: z.string().nullable().optional(),
    dueDate: dateOnlySchema.nullable().optional(),
    dueTime: timeOnlySchema.nullable().optional(),
    recurrence: recurrenceSchema.nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
    status: taskStatusSchema.optional(),
  })
  .refine((task) => task.dueTime == null || !!task.dueDate, {
    message: 'Due time requires a due date',
    path: ['dueTime'],
  })
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>
