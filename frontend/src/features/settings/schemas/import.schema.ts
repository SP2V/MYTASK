import { z } from 'zod'
import { taskSchema } from '@/features/tasks/schemas/task.schema'
import { categorySchema } from '@/features/categories/schemas/category.schema'
import { settingsSchema } from '@/features/settings/schemas/settings.schema'
import { projectSchema } from '@/features/projects/schemas/project.schema'
import { postitSchema } from '@/features/postits/schemas/postit.schema'

/**
 * v1: tasks, categories, settings.
 * v2: adds projects (with their steps) and post-its.
 * Both can be imported; exports are always written as the current version.
 */
export const CURRENT_EXPORT_VERSION = 2
export const SUPPORTED_IMPORT_VERSIONS = [1, 2] as const

export const exportDataV1Schema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  tasks: z.array(taskSchema),
  categories: z.array(categorySchema),
  settings: settingsSchema,
})
export type ExportDataV1 = z.infer<typeof exportDataV1Schema>

export const exportDataSchema = z.object({
  version: z.literal(CURRENT_EXPORT_VERSION),
  exportedAt: z.string().datetime(),
  tasks: z.array(taskSchema),
  categories: z.array(categorySchema),
  projects: z.array(projectSchema),
  postits: z.array(postitSchema),
  settings: settingsSchema,
})
export type ExportData = z.infer<typeof exportDataSchema>

export const importDataSchema = z.discriminatedUnion('version', [exportDataV1Schema, exportDataSchema])
export type ImportData = z.infer<typeof importDataSchema>

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
  /** null when the backup predates projects (v1) and existing ones were kept. */
  projectsImported: number | null
  postitsImported: number | null
  settingsImported: boolean
  /** References to categories/projects missing from the backup, cleared on import. */
  danglingReferencesCleared: number
  skipped: { tasks: number; categories: number }
}
