import { supabase } from '@/lib/supabase-client'
import { getCurrentUserId } from '@/features/auth/services/auth-service'

/**
 * Raw, table-level access to everything a user owns, used by Import and
 * Clear All Data. Rows are kept in their database shape (snake_case, incl.
 * `user_id` and `google_event_id`) so a snapshot can be written back exactly.
 *
 * Every query here is still scoped to the signed-in user by RLS.
 */

export type Row = Record<string, unknown>

/** Parents before children, so foreign keys are satisfied on insert. */
export const USER_TABLES = [
  'categories',
  'projects',
  'project_steps',
  'tasks',
  'task_description_images',
  'postits',
] as const
export type UserTable = (typeof USER_TABLES)[number]

const PRIMARY_KEY: Record<UserTable, string> = {
  categories: 'id',
  projects: 'id',
  project_steps: 'id',
  tasks: 'id',
  task_description_images: 'task_id',
  postits: 'id',
}

/** Screenshots are up to ~3MB each — insert those one per request. */
const INSERT_BATCH_SIZE: Record<UserTable, number> = {
  categories: 500,
  projects: 500,
  project_steps: 500,
  tasks: 500,
  task_description_images: 1,
  postits: 500,
}

export type TableRows = Record<UserTable, Row[]>

export interface UserDataSnapshot {
  tables: TableRows
  settings: Row | null
}

export function emptyTableRows(): TableRows {
  return {
    categories: [],
    projects: [],
    project_steps: [],
    tasks: [],
    task_description_images: [],
    postits: [],
  }
}

export async function takeSnapshot(): Promise<UserDataSnapshot> {
  const tables = emptyTableRows()
  for (const table of USER_TABLES) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) throw new Error(error.message)
    tables[table] = (data as Row[]) ?? []
  }
  const userId = await getCurrentUserId()
  const { data: settings, error } = await supabase.from('settings').select('*').eq('id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  return { tables, settings: (settings as Row | null) ?? null }
}

/** Deletes every row of the given tables, children first. */
export async function deleteTables(tables: readonly UserTable[]): Promise<void> {
  const ordered = [...USER_TABLES].reverse().filter((table) => tables.includes(table))
  for (const table of ordered) {
    const { error } = await supabase.from(table).delete().not(PRIMARY_KEY[table], 'is', null)
    if (error) throw new Error(error.message)
  }
}

/** Inserts rows for the given tables, parents first. */
export async function insertTables(rows: Partial<TableRows>): Promise<void> {
  for (const table of USER_TABLES) {
    const tableRows = rows[table] ?? []
    const batchSize = INSERT_BATCH_SIZE[table]
    for (let i = 0; i < tableRows.length; i += batchSize) {
      const { error } = await supabase.from(table).insert(tableRows.slice(i, i + batchSize))
      if (error) throw new Error(error.message)
    }
  }
}

export async function upsertSettingsRow(row: Row): Promise<void> {
  const { error } = await supabase.from('settings').upsert(row, { onConflict: 'id' })
  if (error) throw new Error(error.message)
}

/** Puts the given tables (and settings) back exactly as they were in `snapshot`. */
export async function restoreSnapshot(
  snapshot: UserDataSnapshot,
  tables: readonly UserTable[] = USER_TABLES,
): Promise<void> {
  await deleteTables(tables)
  const rows: Partial<TableRows> = {}
  for (const table of tables) rows[table] = snapshot.tables[table]
  await insertTables(rows)
  if (snapshot.settings) await upsertSettingsRow(snapshot.settings)
}

export function googleEventIdsOf(taskRows: Row[]): string[] {
  return taskRows
    .map((row) => row.google_event_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
}
