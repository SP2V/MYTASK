import { ListFilter, ArrowUpDown } from 'lucide-react'
import type { TaskPriority } from '@/features/tasks/schemas/task.schema'
import type { SortDirection, TaskSortField } from '@/features/tasks/lib/task-query'
import { useCategories } from '@/features/categories/hooks/use-categories'
import { PRIORITY_META } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const SORT_OPTIONS: { value: TaskSortField; label: string }[] = [
  { value: 'dueDate', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'createdAt', label: 'Created date' },
  { value: 'updatedAt', label: 'Updated date' },
  { value: 'title', label: 'Title' },
]

interface FilterBarProps {
  priorities: TaskPriority[]
  onPrioritiesChange: (priorities: TaskPriority[]) => void
  categoryIds: string[]
  onCategoryIdsChange: (categoryIds: string[]) => void
  sortField: TaskSortField
  onSortFieldChange: (field: TaskSortField) => void
  sortDirection: SortDirection
  onSortDirectionChange: (direction: SortDirection) => void
}

export function FilterBar({
  priorities,
  onPrioritiesChange,
  categoryIds,
  onCategoryIdsChange,
  sortField,
  onSortFieldChange,
  sortDirection,
  onSortDirectionChange,
}: FilterBarProps) {
  const categories = useCategories()
  const activeFilterCount = priorities.length + categoryIds.length

  const togglePriority = (priority: TaskPriority) => {
    onPrioritiesChange(
      priorities.includes(priority) ? priorities.filter((p) => p !== priority) : [...priorities, priority],
    )
  }

  const toggleCategory = (id: string) => {
    onCategoryIdsChange(categoryIds.includes(id) ? categoryIds.filter((c) => c !== id) : [...categoryIds, id])
  }

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <ListFilter className="size-3.5" />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64">
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Priority</p>
              <div className="flex flex-col gap-2">
                {(Object.keys(PRIORITY_META) as TaskPriority[]).map((priority) => (
                  <label key={priority} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={priorities.includes(priority)}
                      onCheckedChange={() => togglePriority(priority)}
                    />
                    {PRIORITY_META[priority].label}
                  </label>
                ))}
              </div>
            </div>

            {categories && categories.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Category</p>
                <div className="flex flex-col gap-2">
                  {categories.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={categoryIds.includes(c.id)} onCheckedChange={() => toggleCategory(c.id)} />
                      {c.name}
                    </label>
                  ))}
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={categoryIds.includes('uncategorized')}
                      onCheckedChange={() => toggleCategory('uncategorized')}
                    />
                    Uncategorized
                  </label>
                </div>
              </div>
            )}

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onPrioritiesChange([])
                  onCategoryIdsChange([])
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Select value={sortField} onValueChange={(v) => onSortFieldChange(v as TaskSortField)}>
        <SelectTrigger size="sm" className="w-auto gap-1.5">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        className="size-8"
        aria-label={sortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'}
        onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
      >
        <ArrowUpDown className="size-3.5" />
      </Button>
    </div>
  )
}
