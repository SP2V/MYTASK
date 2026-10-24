import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProjects, projectsQueryKey } from '@/features/projects/hooks/use-projects'
import { useTasks } from '@/features/tasks/hooks/use-tasks'
import { projectRepository } from '@/features/projects/services/project-repository'
import { ProjectForm } from '@/features/projects/components/project-form'
import { ProjectCard } from '@/features/projects/components/project-card'
import { summarizeProject, summarizeProjects, type ProjectStatus } from '@/features/projects/lib/project-progress'
import type { ProjectEditValues } from '@/features/projects/schemas/project.schema'
import { cn } from '@/lib/utils'

type StatusFilter = 'ALL' | ProjectStatus
type SortKey = 'least' | 'most' | 'newest' | 'name'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'least', label: 'Least complete' },
  { value: 'most', label: 'Most complete' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name' },
]

function StatTile({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 px-4 py-3 shadow-2xs">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-2xl font-bold tabular-nums tracking-tight text-foreground', accent)}>{value}</div>
    </div>
  )
}

export default function ProjectsPage() {
  const projects = useProjects()
  const tasks = useTasks()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('least')

  const entries = useMemo(
    () => (projects ?? []).map((project) => ({ project, summary: summarizeProject(project, tasks ?? []) })),
    [projects, tasks],
  )
  const overview = useMemo(() => summarizeProjects(entries.map((e) => e.summary)), [entries])

  const visible = useMemo(() => {
    const filtered = statusFilter === 'ALL' ? entries : entries.filter((e) => e.summary.status === statusFilter)
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'least':
          return a.summary.percent - b.summary.percent || a.project.title.localeCompare(b.project.title)
        case 'most':
          return b.summary.percent - a.summary.percent || a.project.title.localeCompare(b.project.title)
        case 'newest':
          return b.project.createdAt.localeCompare(a.project.createdAt)
        case 'name':
          return a.project.title.localeCompare(b.project.title)
      }
    })
  }, [entries, statusFilter, sortKey])

  const handleCreate = async (values: ProjectEditValues) => {
    try {
      await projectRepository.createProject({
        title: values.title,
        description: values.description,
        stepTitles: values.steps.map((s) => s.title),
      })
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey })
      toast.success('Project created')
      setDialogOpen(false)
    } catch {
      toast.error('Unable to create project. Please try again.')
    }
  }

  const filterTabs: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'ALL', label: 'All', count: overview.total },
    { value: 'IN_PROGRESS', label: 'In progress', count: overview.inProgress },
    { value: 'NOT_STARTED', label: 'Not started', count: overview.notStarted },
    { value: 'COMPLETED', label: 'Completed', count: overview.completed },
  ]

  return (
    <>
      <PageHeader
        title="Projects"
        description="See how far each project has come — steps and linked tasks both count."
        action={
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            New Project
          </Button>
        }
      />

      {projects === undefined || tasks === undefined ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-19 w-full" />
            ))}
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon="🧭"
          title="No projects yet"
          description="Create one, break it into steps, and link tasks to track its progress."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Overview */}
          <section aria-label="Projects overview" className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Projects" value={overview.total} />
              <StatTile label="In progress" value={overview.inProgress} accent="text-primary" />
              <StatTile
                label="Completed"
                value={overview.completed}
                accent="text-emerald-600 dark:text-emerald-400"
              />
              <StatTile label="Overall progress" value={`${overview.overallPercent}%`} />
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${overview.overallPercent}%` }}
              />
            </div>
          </section>

          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <TabsList className="h-auto flex-wrap">
                {filterTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs">
                    {tab.label}
                    <span className="tabular-nums text-muted-foreground">{tab.count}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger aria-label="Sort projects" className="h-8.5 w-full rounded-lg border-border/70 text-xs sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
              No projects match this filter.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {visible.map(({ project, summary }) => (
                <ProjectCard key={project.id} project={project} summary={summary} />
              ))}
            </div>
          )}
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
