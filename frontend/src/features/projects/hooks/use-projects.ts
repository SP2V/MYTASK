import { useQuery } from '@tanstack/react-query'
import { projectRepository } from '@/features/projects/services/project-repository'
import type { Project } from '@/features/projects/schemas/project.schema'

export const projectsQueryKey = ['projects'] as const

export function useProjects(): Project[] | undefined {
  const { data } = useQuery({
    queryKey: projectsQueryKey,
    queryFn: () => projectRepository.getProjects(),
  })
  return data
}
