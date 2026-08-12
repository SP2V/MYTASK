import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  categoryFormSchema,
  CATEGORY_COLORS,
  type CategoryFormValues,
} from '@/features/categories/schemas/category.schema'
import { CATEGORY_COLOR_CLASSES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CategoryFormProps {
  defaultValues?: Partial<CategoryFormValues>
  onSubmit: (values: CategoryFormValues) => Promise<void> | void
  onCancel: () => void
  submitLabel?: string
}

export function CategoryForm({ defaultValues, onSubmit, onCancel, submitLabel = 'Save' }: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '', icon: null, color: 'slate', ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category-name">Name</Label>
        <Input
          id="category-name"
          autoFocus
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'category-name-error' : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p id="category-name-error" role="alert" className="text-xs text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Color</Label>
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Category color">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={field.value === color}
                  aria-label={color}
                  onClick={() => field.onChange(color)}
                  className={cn(
                    'size-7 rounded-full ring-offset-2 ring-offset-background transition-shadow',
                    CATEGORY_COLOR_CLASSES[color],
                    field.value === color && 'ring-2 ring-foreground',
                  )}
                />
              ))}
            </div>
          )}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
