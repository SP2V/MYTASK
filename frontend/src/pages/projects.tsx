import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjects, projectsQueryKey } from '@/features/projects/hooks/use-projects'
import { projectRepository } from '@/features/projects/services/project-repository'
import { ProjectForm } from '@/features/projects/components/project-form'
import { ProjectCard } from '@/features/projects/components/project-card'
import type { ProjectFormValues } from '@/features/projects/schemas/project.schema'

export default function ProjectsPage() {
  const projects = useProjects()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleCreate = async (values: ProjectFormValues) => {
    try {
      await projectRepository.createProject(values)
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey })
      toast.success('Project created')
      setDialogOpen(false)
    } catch {
      toast.error('Unable to create project. Please try again.')
    }
  }

  return (
    <>
      <PageHeader
        title="Projects"
        description="Break work into steps and check them off one at a time."
        action={
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            New Project
          </Button>
        }
      />

      {projects === undefined ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon="🧭"
          title="No projects yet"
          description="Create one and break it into steps to work through."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <ProjectForm onCancel={() => setDialogOpen(false)} onSubmit={handleCreate} />
        </DialogContent>
      </Dialog>
    </>
  )
}
