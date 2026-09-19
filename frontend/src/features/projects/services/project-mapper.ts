import type { Project, ProjectStep } from '@/features/projects/schemas/project.schema'

export interface ProjectRow {
  id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface ProjectStepRow {
  id: string
  project_id: string
  title: string
  order_index: number
  is_done: boolean
}

export function rowToProject(row: ProjectRow, stepRows: ProjectStepRow[]): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    steps: stepRows
      .filter((s) => s.project_id === row.id)
      .sort((a, b) => a.order_index - b.order_index)
      .map(rowToStep),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function projectToRow(project: Project): ProjectRow {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  }
}

export function rowToStep(row: ProjectStepRow): ProjectStep {
  return {
    id: row.id,
    title: row.title,
    order: row.order_index,
    isDone: row.is_done,
  }
}

export function stepToRow(step: ProjectStep, projectId: string): ProjectStepRow {
  return {
    id: step.id,
    project_id: projectId,
    title: step.title,
    order_index: step.order,
    is_done: step.isDone,
  }
}
