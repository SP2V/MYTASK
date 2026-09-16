import { z } from 'zod'

export const POSTIT_COLORS = ['yellow', 'pink', 'sky', 'lime', 'orange', 'violet'] as const
export const postitColorSchema = z.enum(POSTIT_COLORS)
export type PostitColor = z.infer<typeof postitColorSchema>

export const postitSchema = z
  .object({
    id: z.string().min(1),
    content: z.string().trim().min(1, 'Note cannot be empty').max(500),
    color: postitColorSchema,
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()
export type Postit = z.infer<typeof postitSchema>

export const postitFormSchema = z.object({
  content: z.string().trim().min(1, 'Note cannot be empty').max(500),
  color: postitColorSchema,
})
export type PostitFormValues = z.infer<typeof postitFormSchema>
