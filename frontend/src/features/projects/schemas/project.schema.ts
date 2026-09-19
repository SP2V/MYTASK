import { z } from 'zod'

export const projectStepSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1, 'Step title is required').max(200),
    order: z.number().int().min(0),
    isDone: z.boolean(),
  })
  .strict()
export type ProjectStep = z.infer<typeof projectStepSchema>

export const projectSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().trim().max(2000).nullable(),
    steps: z.array(projectStepSchema),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()
export type Project = z.infer<typeof projectSchema>

export const projectFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(2000).nullable(),
  stepTitles: z
    .array(z.string().trim().min(1, 'Step title is required').max(200))
    .min(1, 'Add at least one step'),
})
export type ProjectFormValues = z.infer<typeof projectFormSchema>

export function projectProgress(project: Pick<Project, 'steps'>): { done: number; total: number } {
  return { done: project.steps.filter((s) => s.isDone).length, total: project.steps.length }
}
