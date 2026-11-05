import { nowISO } from '@/lib/date'
import { readFileAsText } from '@/lib/read-file-as-text'
import { taskRepository } from '@/features/tasks/services/task-repository'
import { taskToRow } from '@/features/tasks/services/task-mapper'
import { categoryRepository } from '@/features/categories/services/category-repository'
import { categoryToRow } from '@/features/categories/services/category-mapper'
import { projectRepository } from '@/features/projects/services/project-repository'
import { projectToRow, stepToRow } from '@/features/projects/services/project-mapper'
import { postitRepository } from '@/features/postits/services/postit-repository'
import { postitToRow } from '@/features/postits/services/postit-mapper'
import { settingsRepository } from '@/features/settings/services/settings-repository'
import { settingsToRow } from '@/features/settings/services/settings-mapper'
import { getCurrentUserId } from '@/features/auth/services/auth-service'
import {
  deleteGoogleCalendarEvents,
  syncTasksToGoogleCalendar,
} from '@/features/settings/services/google-calendar-sync'
import {
  USER_TABLES,
  deleteTables,
  googleEventIdsOf,
  insertTables,
  restoreSnapshot,
  takeSnapshot,
  upsertSettingsRow,
  type Row,
  type TableRows,
  type UserTable,
} from '@/features/settings/services/user-data-store'
import {
  CURRENT_EXPORT_VERSION,
  SUPPORTED_IMPORT_VERSIONS,
  importDataSchema,
  importFileShapeSchema,
  type ExportData,
  type ImportData,
  type ImportSummary,
} from '@/features/settings/schemas/import.schema'
import type { Task } from '@/features/tasks/schemas/task.schema'

export async function buildExportData(): Promise<ExportData> {
  const [tasks, categories, projects, postits, settings] = await Promise.all([
    taskRepository.getTasks(true),
    categoryRepository.getCategories(),
    projectRepository.getProjects(),
    postitRepository.getPostits(),
    settingsRepository.getSettings(),
  ])
  return {
    version: CURRENT_EXPORT_VERSION,
    exportedAt: nowISO(),
    tasks,
    categories,
    projects,
    postits,
    settings,
  }
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

function findDuplicateId(items: { id: string }[]): string | null {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item.id)) return item.id
    seen.add(item.id)
  }
  return null
}

function hasDuplicateIds(data: ImportData): boolean {
  const groups: { id: string }[][] = [data.tasks, data.categories]
  if (data.version === 2) {
    groups.push(data.projects, data.postits, data.projects.flatMap((p) => p.steps))
  }
  return groups.some((group) => findDuplicateId(group) !== null)
}

interface PreparedImport {
  /** Tables wiped and rewritten by this import. */
  tables: UserTable[]
  rows: Partial<TableRows>
  settingsRow: Row
  tasks: Task[]
  danglingReferencesCleared: number
}

/**
 * Turns validated backup data into database rows. References a backup can't
 * satisfy (a task pointing at a category/project that isn't in it) are
 * cleared instead of failing the whole import on a foreign key.
 *
 * v1 backups never contained projects or post-its, so a v1 import keeps the
 * existing ones and checks task→project links against them instead.
 */
function prepareImport(data: ImportData, existingProjectIds: Set<string>, userId: string): PreparedImport {
  const categoryIds = new Set(data.categories.map((c) => c.id))
  const projectIds = data.version === 2 ? new Set(data.projects.map((p) => p.id)) : existingProjectIds
  let danglingReferencesCleared = 0

  const tasks = data.tasks.map((task) => {
    let next = task
    if (next.categoryId && !categoryIds.has(next.categoryId)) {
      next = { ...next, categoryId: null }
      danglingReferencesCleared++
    }
    if (next.projectId && !projectIds.has(next.projectId)) {
      next = { ...next, projectId: null }
      danglingReferencesCleared++
    }
    return next
  })

  let settings = data.settings
  if (settings.defaultCategoryId && !categoryIds.has(settings.defaultCategoryId)) {
    settings = { ...settings, defaultCategoryId: null }
    danglingReferencesCleared++
  }

  const rows: Partial<TableRows> = {
    categories: data.categories.map((c) => categoryToRow(c) as unknown as Row),
    tasks: tasks.map((t) => taskToRow(t) as unknown as Row),
    task_description_images: tasks
      .filter((t) => t.descriptionImage)
      .map((t) => ({ task_id: t.id, image_data: t.descriptionImage })),
  }
  const tables: UserTable[] = ['categories', 'tasks', 'task_description_images']

  if (data.version === 2) {
    rows.projects = data.projects.map((p) => projectToRow(p) as unknown as Row)
    rows.project_steps = data.projects.flatMap((p) =>
      p.steps.map((s) => stepToRow(s, p.id) as unknown as Row),
    )
    rows.postits = data.postits.map((p) => postitToRow(p) as unknown as Row)
    tables.push('projects', 'project_steps', 'postits')
  }

  return {
    tables: USER_TABLES.filter((t) => tables.includes(t)),
    rows,
    settingsRow: { id: userId, ...settingsToRow(settings) },
    tasks,
    danglingReferencesCleared,
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Validates and restores a backup file. Never touches data when the file is
 * invalid. Supabase gives this client-only app no multi-table transaction,
 * so the import snapshots the current data first and writes it back if any
 * step fails part-way — the user ends up with either the backup or exactly
 * what they had before, never a half-applied mix.
 */
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
  if (!(SUPPORTED_IMPORT_VERSIONS as readonly number[]).includes(shapeResult.data.version)) {
    return {
      success: false,
      error: `This backup was created with an unsupported version (${shapeResult.data.version}).`,
    }
  }

  const parsed = importDataSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: 'The imported file contains invalid or corrupted data.' }
  }
  const data = parsed.data
  if (hasDuplicateIds(data)) {
    return { success: false, error: 'The imported file contains duplicate IDs.' }
  }

  let snapshot
  let prepared: PreparedImport
  try {
    snapshot = await takeSnapshot()
    const existingProjectIds = new Set(snapshot.tables.projects.map((row) => String(row.id)))
    prepared = prepareImport(data, existingProjectIds, await getCurrentUserId())
  } catch (error) {
    return { success: false, error: `Unable to read your current data, nothing was changed: ${errorMessage(error)}` }
  }

  try {
    await deleteTables(prepared.tables)
    await insertTables(prepared.rows)
    await upsertSettingsRow(prepared.settingsRow)
  } catch (importError) {
    try {
      await restoreSnapshot(snapshot, prepared.tables)
    } catch (restoreError) {
      return {
        success: false,
        error:
          `Import failed (${errorMessage(importError)}) and your previous data could not be fully ` +
          `restored (${errorMessage(restoreError)}). Export your data before trying again.`,
      }
    }
    return {
      success: false,
      error: `Import failed, your previous data was restored: ${errorMessage(importError)}`,
    }
  }

  // Calendar side effects only after the import has fully committed: drop
  // the replaced tasks' events, then create events for the imported ones.
  void (async () => {
    await deleteGoogleCalendarEvents(googleEventIdsOf(snapshot.tables.tasks))
    await syncTasksToGoogleCalendar(
      prepared.tasks
        .filter((t) => t.dueDate && t.status !== 'COMPLETED' && t.status !== 'ARCHIVED')
        .map((t) => t.id),
    )
  })()

  return {
    success: true,
    summary: {
      tasksImported: data.tasks.length,
      categoriesImported: data.categories.length,
      projectsImported: data.version === 2 ? data.projects.length : null,
      postitsImported: data.version === 2 ? data.postits.length : null,
      settingsImported: true,
      danglingReferencesCleared: prepared.danglingReferencesCleared,
      skipped: { tasks: 0, categories: 0 },
    },
  }
}
