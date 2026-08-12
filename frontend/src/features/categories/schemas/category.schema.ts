import { z } from 'zod'

export const CATEGORY_COLORS = [
  'slate',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'teal',
  'cyan',
  'blue',
  'indigo',
  'violet',
  'purple',
  'pink',
] as const
export const categoryColorSchema = z.enum(CATEGORY_COLORS)
export type CategoryColor = z.infer<typeof categoryColorSchema>

export const categorySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1, 'Name is required').max(50),
    icon: z.string().max(50).nullable().default(null),
    color: categoryColorSchema.default('slate'),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()
export type Category = z.infer<typeof categorySchema>

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50),
  icon: z.string().max(50).nullable(),
  color: categoryColorSchema,
})
export type CategoryFormValues = z.infer<typeof categoryFormSchema>
