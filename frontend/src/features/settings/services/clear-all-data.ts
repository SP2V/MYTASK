import { categoryRepository } from '@/features/categories/services/category-repository'
import { settingsRepository } from '@/features/settings/services/settings-repository'
import { deleteGoogleCalendarEvents } from '@/features/settings/services/google-calendar-sync'
import { supabase } from '@/lib/supabase-client'
import {
  USER_TABLES,
  deleteTables,
  googleEventIdsOf,
  type Row,
} from '@/features/settings/services/user-data-store'
import type { CategoryFormValues } from '@/features/categories/schemas/category.schema'

const DEFAULT_CATEGORIES: CategoryFormValues[] = [
  { name: 'Work', color: 'blue', icon: 'Briefcase' },
  { name: 'Personal', color: 'violet', icon: 'User' },
  { name: 'Study', color: 'green', icon: 'BookOpen' },
  { name: 'Other', color: 'slate', icon: 'Tag' },
]

/**
 * Wipes every task, category, project, post-it and screenshot, reseeds the
 * default categories/settings, and removes the deleted tasks' events from
 * Google Calendar. The Google Calendar connection itself is kept.
 */
export async function clearAllData(): Promise<void> {
  const { data: taskRows, error } = await supabase.from('tasks').select('google_event_id')
  if (error) throw new Error(error.message)
  await deleteTables(USER_TABLES)
  for (const category of DEFAULT_CATEGORIES) {
    await categoryRepository.createCategory(category)
  }
  await settingsRepository.resetToDefaults()
  void deleteGoogleCalendarEvents(googleEventIdsOf((taskRows as Row[]) ?? []))
}
