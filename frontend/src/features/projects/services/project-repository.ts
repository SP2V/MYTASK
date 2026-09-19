import { supabase } from '@/lib/supabase-client'
import { generateId } from '@/lib/id'
import { nowISO } from '@/lib/date'
import {
  projectSchema,
  projectFormSchema,
  type Project,
  type ProjectStep,
} from '@/features/projects/schemas/project.schema'
import {
  rowToProject,
  projectToRow,
  stepToRow,
  type ProjectRow,
  type ProjectStepRow,
} from '@/features/projects/services/project-mapper'

const PROJECTS_TABLE = 'projects'
const STEPS_TABLE = 'project_steps'

export class ProjectRepository {
  async getProjects(): Promise<Project[]> {
    const [{ data: projectRows, error: projectsError }, { data: stepRows, error: stepsError }] =
      await Promise.all([
        supabase.from(PROJECTS_TABLE).select('*').order('created_at', { ascending: false }),
        supabase.from(STEPS_TABLE).select('*').order('order_index'),
      ])
    if (projectsError) throw new Error(projectsError.message)
    if (stepsError) throw new Error(stepsError.message)
    return (projectRows as ProjectRow[])
      .map((row) => rowToProject(row, stepRows as ProjectStepRow[]))
      .map((p) => projectSchema.parse(p))
  }

  async createProject(input: {
    title: string
    description: string | null
    stepTitles: string[]
  }): Promise<Project> {
    const parsedInput = projectFormSchema.parse(input)
    const timestamp = nowISO()
    const steps: ProjectStep[] = parsedInput.stepTitles.map((title, index) => ({
      id: generateId(),
      title,
      order: index,
      isDone: false,
    }))
    const project = projectSchema.parse({
      id: generateId(),
      title: parsedInput.title,
      description: parsedInput.description,
      steps,
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    const { error: projectError } = await supabase.from(PROJECTS_TABLE).insert(projectToRow(project))
    if (projectError) throw new Error(projectError.message)

    if (steps.length > 0) {
      const { error: stepsError } = await supabase
        .from(STEPS_TABLE)
        .insert(steps.map((s) => stepToRow(s, project.id)))
      if (stepsError) throw new Error(stepsError.message)
    }

    return project
  }

  async updateProject(
    id: string,
    existingSteps: ProjectStep[],
    values: { title: string; description: string | null; steps: { id?: string; title: string }[] },
  ): Promise<void> {
    const { error } = await supabase
      .from(PROJECTS_TABLE)
      .update({ title: values.title, description: values.description, updated_at: nowISO() })
      .eq('id', id)
    if (error) throw new Error(error.message)

    const existingById = new Map(existingSteps.map((s) => [s.id, s]))
    const keptIds = new Set(values.steps.filter((s) => s.id).map((s) => s.id as string))
    const toDelete = existingSteps.filter((s) => !keptIds.has(s.id)).map((s) => s.id)
    const toUpsert = values.steps.map((s, index) => {
      const existing = s.id ? existingById.get(s.id) : undefined
      return {
        id: existing ? existing.id : generateId(),
        project_id: id,
        title: s.title.trim(),
        order_index: index,
        is_done: existing?.isDone ?? false,
      }
    })

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase.from(STEPS_TABLE).delete().in('id', toDelete)
      if (deleteError) throw new Error(deleteError.message)
    }
    if (toUpsert.length > 0) {
      const { error: upsertError } = await supabase.from(STEPS_TABLE).upsert(toUpsert)
      if (upsertError) throw new Error(upsertError.message)
    }
  }

  async duplicateProject(project: Project): Promise<Project> {
    return this.createProject({
      title: `${project.title} (Copy)`,
      description: project.description,
      stepTitles: project.steps.map((s) => s.title),
    })
  }

  async deleteProject(id: string): Promise<void> {
    const { error } = await supabase.from(PROJECTS_TABLE).delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async addStep(projectId: string, title: string, order: number): Promise<void> {
    const trimmed = title.trim()
    if (!trimmed) throw new Error('Step title is required')
    const { error } = await supabase.from(STEPS_TABLE).insert({
      id: generateId(),
      project_id: projectId,
      title: trimmed,
      order_index: order,
      is_done: false,
    })
    if (error) throw new Error(error.message)
    await this.touchProject(projectId)
  }

  async toggleStep(projectId: string, stepId: string, isDone: boolean): Promise<void> {
    const { error } = await supabase.from(STEPS_TABLE).update({ is_done: isDone }).eq('id', stepId)
    if (error) throw new Error(error.message)
    await this.touchProject(projectId)
  }

  async deleteStep(projectId: string, stepId: string): Promise<void> {
    const { error } = await supabase.from(STEPS_TABLE).delete().eq('id', stepId)
    if (error) throw new Error(error.message)
    await this.touchProject(projectId)
  }

  private async touchProject(id: string): Promise<void> {
    await supabase.from(PROJECTS_TABLE).update({ updated_at: nowISO() }).eq('id', id)
  }
}

export const projectRepository = new ProjectRepository()
