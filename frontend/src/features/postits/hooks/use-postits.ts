import { useQuery } from '@tanstack/react-query'
import { postitRepository } from '@/features/postits/services/postit-repository'
import type { Postit } from '@/features/postits/schemas/postit.schema'

export const postitsQueryKey = ['postits'] as const

export function usePostits(): Postit[] | undefined {
  const { data } = useQuery({
    queryKey: postitsQueryKey,
    queryFn: () => postitRepository.getPostits(),
  })
  return data
}
