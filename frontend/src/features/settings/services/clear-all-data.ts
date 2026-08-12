import { taskRepository } from '@/features/tasks/services/task-repository'
import { categoryRepository } from '@/features/categories/services/category-repository'
import { settingsRepository } from '@/features/settings/services/settings-repository'
import type { CategoryFormValues } from '@/features/categories/schemas/category.schema'

const DEFAULT_CATEGORIES: CategoryFormValues[] = [
  { name: 'Work', color: 'blue', icon: 'Briefcase' },
  { name: 'Personal', color: 'violet', icon: 'User' },
  { name: 'Study', color: 'green', icon: 'BookOpen' },
  { name: 'Other', color: 'slate', icon: 'Tag' },
]

/** Wipes all Supabase data and reseeds default categories/settings from scratch. */
export async function clearAllData(): Promise<void> {
  await taskRepository.clear()
  await categoryRepository.clear()
  for (const category of DEFAULT_CATEGORIES) {
    await categoryRepository.createCategory(category)
  }
  await settingsRepository.resetToDefaults()
}
