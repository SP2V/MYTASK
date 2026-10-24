import type { Project, ProjectStep } from '@/features/projects/schemas/project.schema'
import type { Task } from '@/features/tasks/schemas/task.schema'
import { isOverdue } from '@/lib/date'

export type ProjectStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'

export interface ProjectProgressSummary {
  stepsDone: number
  stepsTotal: number
  tasksDone: number
  tasksTotal: number
  done: number
  total: number
  percent: number
  status: ProjectStatus
  /** Open (not completed, not archived) tasks linked to the project, soonest due first. */
  openTasks: Task[]
  /** Completed tasks linked to the project, most recently completed first. */
  completedTasks: Task[]
  overdueCount: number
  nextStep: ProjectStep | null
  nextTask: Task | null
}

function compareByDue(a: Task, b: Task): number {
  if (a.dueDate !== b.dueDate) {
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate < b.dueDate ? -1 : 1
  }
  return (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99') || a.createdAt.localeCompare(b.createdAt)
}

/** Progress counts every step plus every non-archived task linked to the project. */
export function summarizeProject(project: Project, tasks: Task[], now: Date = new Date()): ProjectProgressSummary {
  const linked = tasks.filter((t) => t.projectId === project.id && t.status !== 'ARCHIVED')
  const openTasks = linked.filter((t) => t.status !== 'COMPLETED').sort(compareByDue)
  const completedTasks = linked
    .filter((t) => t.status === 'COMPLETED')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))

  const stepsTotal = project.steps.length
  const stepsDone = project.steps.filter((s) => s.isDone).length
  const tasksTotal = linked.length
  const tasksDone = completedTasks.length
  const total = stepsTotal + tasksTotal
  const done = stepsDone + tasksDone
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const status: ProjectStatus = total > 0 && done === total ? 'COMPLETED' : done === 0 ? 'NOT_STARTED' : 'IN_PROGRESS'

  return {
    stepsDone,
    stepsTotal,
    tasksDone,
    tasksTotal,
    done,
    total,
    percent,
    status,
    openTasks,
    completedTasks,
    overdueCount: openTasks.filter((t) => isOverdue(t, now)).length,
    nextStep: [...project.steps].sort((a, b) => a.order - b.order).find((s) => !s.isDone) ?? null,
    nextTask: openTasks[0] ?? null,
  }
}

export interface ProjectsOverview {
  total: number
  inProgress: number
  notStarted: number
  completed: number
  /** Share of all steps and tasks across every project that are done. */
  overallPercent: number
}

export function summarizeProjects(summaries: ProjectProgressSummary[]): ProjectsOverview {
  const done = summaries.reduce((sum, s) => sum + s.done, 0)
  const total = summaries.reduce((sum, s) => sum + s.total, 0)
  return {
    total: summaries.length,
    inProgress: summaries.filter((s) => s.status === 'IN_PROGRESS').length,
    notStarted: summaries.filter((s) => s.status === 'NOT_STARTED').length,
    completed: summaries.filter((s) => s.status === 'COMPLETED').length,
    overallPercent: total === 0 ? 0 : Math.round((done / total) * 100),
  }
}
