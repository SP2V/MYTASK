import { z } from 'zod'
import { taskPrioritySchema } from '@/features/tasks/schemas/task.schema'

export const THEMES = ['SYSTEM', 'LIGHT', 'DARK'] as const
export const themeSchema = z.enum(THEMES)
export type Theme = z.infer<typeof themeSchema>

export const DATE_FORMATS = ['MDY', 'DMY', 'YMD'] as const
export const dateFormatSchema = z.enum(DATE_FORMATS)
export type DateFormatOption = z.infer<typeof dateFormatSchema>

export const TIME_FORMATS = ['H12', 'H24'] as const
export const timeFormatSchema = z.enum(TIME_FORMATS)
export type TimeFormatOption = z.infer<typeof timeFormatSchema>

export const settingsSchema = z
  .object({
    theme: themeSchema.default('SYSTEM'),
    defaultPriority: taskPrioritySchema.default('MEDIUM'),
    defaultCategoryId: z.string().nullable().default(null),
    weekStartsOn: z.number().int().min(0).max(6).default(0),
    dateFormat: dateFormatSchema.default('MDY'),
    timeFormat: timeFormatSchema.default('H12'),
  })
  .strict()
export type Settings = z.infer<typeof settingsSchema>

export const settingsUpdateSchema = settingsSchema.partial()
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>
