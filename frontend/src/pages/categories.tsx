import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useCategories, categoriesQueryKey } from '@/features/categories/hooks/use-categories'
import { useTasks, tasksQueryKey } from '@/features/tasks/hooks/use-tasks'
import { categoryRepository } from '@/features/categories/services/category-repository'
import { CategoryForm } from '@/features/categories/components/category-form'
import { CATEGORY_COLOR_CLASSES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Category, CategoryFormValues } from '@/features/categories/schemas/category.schema'

type DialogState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; category: Category }

export default function CategoriesPage() {
  const categories = useCategories()
  const tasks = useTasks()
  const queryClient = useQueryClient()
  const [dialogState, setDialogState] = useState<DialogState>({ mode: 'closed' })
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const taskCountFor = (categoryId: string) =>
    tasks?.filter((t) => t.categoryId === categoryId && t.status !== 'ARCHIVED').length ?? 0

  const handleCreate = async (values: CategoryFormValues) => {
    try {
      await categoryRepository.createCategory(values)
      await queryClient.invalidateQueries({ queryKey: categoriesQueryKey })
      toast.success('Category created')
      setDialogState({ mode: 'closed' })
    } catch {
      toast.error('Unable to save category. Please try again.')
    }
  }

  const handleUpdate = async (id: string, values: CategoryFormValues) => {
    try {
      await categoryRepository.updateCategory(id, values)
      await queryClient.invalidateQueries({ queryKey: categoriesQueryKey })
      toast.success('Category updated')
      setDialogState({ mode: 'closed' })
    } catch {
      toast.error('Unable to save category. Please try again.')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await categoryRepository.deleteCategory(deleteTarget.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: categoriesQueryKey }),
        queryClient.invalidateQueries({ queryKey: tasksQueryKey }),
      ])
      toast.success('Category deleted. Its tasks are now uncategorized.')
    } catch {
      toast.error('Unable to delete category. Please try again.')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Categories"
        action={
          <Button className="gap-2" onClick={() => setDialogState({ mode: 'create' })}>
            <Plus className="size-4" />
            Add Category
          </Button>
        }
      />

      {categories === undefined ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState title="No categories yet" description="Create one to start organizing tasks." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="group flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
            >
              <span
                className={cn('size-3 shrink-0 rounded-full', CATEGORY_COLOR_CLASSES[category.color])}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{category.name}</p>
                <p className="text-xs text-muted-foreground">
                  {taskCountFor(category.id)} active task{taskCountFor(category.id) === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Edit ${category.name}`}
                  onClick={() => setDialogState({ mode: 'edit', category })}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Delete ${category.name}`}
                  onClick={() => setDeleteTarget(category)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={dialogState.mode !== 'closed'}
        onOpenChange={(open) => !open && setDialogState({ mode: 'closed' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogState.mode === 'edit' ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          {dialogState.mode === 'create' && (
            <CategoryForm onCancel={() => setDialogState({ mode: 'closed' })} onSubmit={handleCreate} />
          )}
          {dialogState.mode === 'edit' && (
            <CategoryForm
              defaultValues={dialogState.category}
              submitLabel="Save Changes"
              onCancel={() => setDialogState({ mode: 'closed' })}
              onSubmit={(values) => handleUpdate(dialogState.category.id, values)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="Tasks in this category will become uncategorized. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </>
  )
}
