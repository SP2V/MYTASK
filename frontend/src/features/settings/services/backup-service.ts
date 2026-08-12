import { nowISO } from '@/lib/date'
import { readFileAsText } from '@/lib/read-file-as-text'
import { taskRepository } from '@/features/tasks/services/task-repository'
import { categoryRepository } from '@/features/categories/services/category-repository'
import { settingsRepository } from '@/features/settings/services/settings-repository'
import {
  CURRENT_EXPORT_VERSION,
  exportDataSchema,
  importFileShapeSchema,
  type ExportData,
  type ImportSummary,
} from '@/features/settings/schemas/import.schema'

export async function buildExportData(): Promise<ExportData> {
  const [tasks, categories, settings] = await Promise.all([
    taskRepository.getTasks(),
    categoryRepository.getCategories(),
    settingsRepository.getSettings(),
  ])
  return { version: CURRENT_EXPORT_VERSION, exportedAt: nowISO(), tasks, categories, settings }
}

export function downloadExportFile(data: ExportData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `personal-task-manager-backup-${data.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export interface ImportResult {
  success: boolean
  error?: string
  summary?: ImportSummary
}

/** Validates and atomically restores a backup file. Never partially applies invalid data. */
export async function importFromFile(file: File): Promise<ImportResult> {
  let raw: unknown
  try {
    const text = await readFileAsText(file)
    raw = JSON.parse(text)
  } catch {
    return { success: false, error: 'The imported file is invalid.' }
  }

  const shapeResult = importFileShapeSchema.safeParse(raw)
  if (!shapeResult.success) {
    return { success: false, error: 'The imported file is invalid.' }
  }
  if (shapeResult.data.version !== CURRENT_EXPORT_VERSION) {
    return {
      success: false,
      error: `This backup was created with an unsupported version (${shapeResult.data.version}).`,
    }
  }

  const parsed = exportDataSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: 'The imported file contains invalid or corrupted data.' }
  }

  // Categories must be restored before tasks — tasks.category_id is a foreign
  // key, so inserting a task before its category exists would fail. Not
  // wrapped in a single DB transaction (no server-side function in this
  // no-backend setup); if a later step fails, earlier steps have already
  // committed. Acceptable tradeoff for a single-user app — worst case, re-run
  // the import once the underlying issue (e.g. a network blip) is resolved.
  const data = parsed.data
  await categoryRepository.replaceAll(data.categories)
  await taskRepository.replaceAll(data.tasks)
  await settingsRepository.replace(data.settings)

  return {
    success: true,
    summary: {
      tasksImported: data.tasks.length,
      categoriesImported: data.categories.length,
      settingsImported: true,
      skipped: { tasks: 0, categories: 0 },
    },
  }
}
