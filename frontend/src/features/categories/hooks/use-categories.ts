import { useQuery } from '@tanstack/react-query'
import { categoryRepository } from '@/features/categories/services/category-repository'
import type { Category } from '@/features/categories/schemas/category.schema'

export const categoriesQueryKey = ['categories'] as const

export function useCategories(): Category[] | undefined {
  const { data } = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: () => categoryRepository.getCategories(),
  })
  return data
}
