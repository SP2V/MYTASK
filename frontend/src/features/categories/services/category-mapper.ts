import type { Category } from '@/features/categories/schemas/category.schema'

export interface CategoryRow {
  id: string
  name: string
  icon: string | null
  color: Category['color']
  created_at: string
  updated_at: string
}

export function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function categoryToRow(category: Category): CategoryRow {
  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    color: category.color,
    created_at: category.createdAt,
    updated_at: category.updatedAt,
  }
}
