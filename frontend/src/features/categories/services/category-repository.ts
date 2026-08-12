import { supabase } from '@/lib/supabase-client'
import { generateId } from '@/lib/id'
import { nowISO } from '@/lib/date'
import {
  categorySchema,
  categoryFormSchema,
  type Category,
  type CategoryFormValues,
} from '@/features/categories/schemas/category.schema'
import { taskRepository } from '@/features/tasks/services/task-repository'
import { rowToCategory, categoryToRow, type CategoryRow } from '@/features/categories/services/category-mapper'

const TABLE = 'categories'

export class CategoryRepository {
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase.from(TABLE).select('*').order('created_at')
    if (error) throw new Error(error.message)
    return (data as CategoryRow[]).map(rowToCategory).map((c) => categorySchema.parse(c))
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? categorySchema.parse(rowToCategory(data as CategoryRow)) : undefined
  }

  async createCategory(input: CategoryFormValues): Promise<Category> {
    const parsedInput = categoryFormSchema.parse(input)
    const timestamp = nowISO()
    const category = categorySchema.parse({
      id: generateId(),
      ...parsedInput,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    const { data, error } = await supabase
      .from(TABLE)
      .insert(categoryToRow(category))
      .select()
      .single()
    if (error) throw new Error(error.message)
    return categorySchema.parse(rowToCategory(data as CategoryRow))
  }

  async updateCategory(id: string, input: Partial<CategoryFormValues>): Promise<Category> {
    const existing = await this.getCategoryById(id)
    if (!existing) throw new Error('Category not found')

    const parsedInput = categoryFormSchema.partial().parse(input)
    const updated = categorySchema.parse({
      ...existing,
      ...parsedInput,
      updatedAt: nowISO(),
    })
    const { data, error } = await supabase
      .from(TABLE)
      .update(categoryToRow(updated))
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return categorySchema.parse(rowToCategory(data as CategoryRow))
  }

  /**
   * Deletes a category without deleting its tasks — affected tasks become
   * uncategorized. Not atomic with the category delete (no server-side
   * transaction in this no-backend setup) — acceptable tradeoff for a
   * single-user app; worst case a delete failing after reassignment leaves
   * tasks uncategorized but the (now-orphaned) category still present.
   */
  async deleteCategory(id: string): Promise<void> {
    await taskRepository.reassignCategory(id, null)
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async replaceAll(categories: Category[]): Promise<void> {
    await this.clear()
    if (categories.length === 0) return
    const { error } = await supabase.from(TABLE).insert(categories.map(categoryToRow))
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

export const categoryRepository = new CategoryRepository()
