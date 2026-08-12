import { z } from 'zod'
import { taskSchema } from '@/features/tasks/schemas/task.schema'
import { categorySchema } from '@/features/categories/schemas/category.schema'
import { settingsSchema } from '@/features/settings/schemas/settings.schema'

export const CURRENT_EXPORT_VERSION = 1

export const exportDataSchema = z.object({
  version: z.literal(CURRENT_EXPORT_VERSION),
  exportedAt: z.string().datetime(),
  tasks: z.array(taskSchema),
  categories: z.array(categorySchema),
  settings: settingsSchema,
})
export type ExportData = z.infer<typeof exportDataSchema>

/**
 * Looser pre-validation shape used to distinguish "not our file at all"
 * from "our file but a field is invalid" before running strict parsing.
 */
export const importFileShapeSchema = z.object({
  version: z.number(),
  exportedAt: z.string(),
  tasks: z.array(z.unknown()),
  categories: z.array(z.unknown()),
  settings: z.unknown(),
})

export interface ImportSummary {
  tasksImported: number
  categoriesImported: number
  settingsImported: boolean
  skipped: { tasks: number; categories: number }
}
