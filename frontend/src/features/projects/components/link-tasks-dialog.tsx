import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import type { Project } from '@/features/projects/schemas/project.schema'
import { useProjects } from '@/features/projects/hooks/use-projects'
import { useTasks, tasksQueryKey } from '@/features/tasks/hooks/use-tasks'
import { taskRepository } from '@/features/tasks/services/task-repository'
import { formatDateShort } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface LinkTasksDialogProps {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LinkTasksDialog({ project, open, onOpenChange }: LinkTasksDialogProps) {
  const tasks = useTasks()
  const projects = useProjects()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const candidates = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (tasks ?? [])
      .filter((t) => t.status !== 'ARCHIVED' && t.projectId !== project.id)
      .filter((t) => !needle || t.title.toLowerCase().includes(needle))
      // Open tasks first, then completed ones.
      .sort((a, b) => Number(a.status === 'COMPLETED') - Number(b.status === 'COMPLETED') || a.title.localeCompare(b.title))
  }, [tasks, project.id, query])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery('')
      setSelected(new Set())
    }
    onOpenChange(nextOpen)
  }

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleLink = async () => {
    setSaving(true)
    try {
      await taskRepository.setTasksProject([...selected], project.id)
      await queryClient.invalidateQueries({ queryKey: tasksQueryKey })
      toast.success(selected.size === 1 ? 'Task added to project' : `${selected.size} tasks added to project`)
      handleOpenChange(false)
    } catch {
      toast.error('Unable to add tasks. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add existing tasks</DialogTitle>
          <DialogDescription>Choose tasks to count toward “{project.title}”.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks…"
            aria-label="Search tasks"
            className="h-9 rounded-lg border-border/70 pl-8 text-xs"
          />
        </div>

        <div className="max-h-80 overflow-y-auto rounded-lg border border-border/60">
          {candidates.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              {query.trim() ? 'No tasks match your search.' : 'Every task is already in this project.'}
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {candidates.map((task) => {
                const otherProject = task.projectId ? projects?.find((p) => p.id === task.projectId) : undefined
                const isCompleted = task.status === 'COMPLETED'
                return (
                  <li key={task.id}>
                    <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors hover:bg-accent/40">
                      <Checkbox
                        checked={selected.has(task.id)}
                        onCheckedChange={() => toggle(task.id)}
                        aria-label={`Select ${task.title}`}
                        className="size-4 rounded"
                      />
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate text-xs font-medium',
                          isCompleted ? 'text-muted-foreground line-through' : 'text-foreground',
                        )}
                      >
                        {task.title}
                      </span>
                      {otherProject && (
                        <span className="shrink-0 truncate text-[11px] text-muted-foreground" title="Will move from this project">
                          in {otherProject.title}
                        </span>
                      )}
                      {task.dueDate && !isCompleted && (
                        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                          {formatDateShort(task.dueDate)}
                        </span>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleLink} disabled={selected.size === 0 || saving}>
            {selected.size > 1 ? `Add ${selected.size} tasks` : 'Add task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
