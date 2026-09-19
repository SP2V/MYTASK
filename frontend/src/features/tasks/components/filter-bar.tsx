import { ListFilter, ArrowUpDown, X } from 'lucide-react'
import type { TaskPriority } from '@/features/tasks/schemas/task.schema'
import type { SortDirection, TaskSortField } from '@/features/tasks/lib/task-query'
import { useCategories } from '@/features/categories/hooks/use-categories'
import { PRIORITY_META, CATEGORY_COLOR_CLASSES } from '@/lib/constants'
import { cn } from '@/lib/utils'
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
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-1.5 rounded-lg border-border/70 bg-card/60 backdrop-blur-xs transition-colors hover:bg-accent',
              activeFilterCount > 0 && 'border-primary/50 text-foreground bg-primary/5',
            )}
          >
            <ListFilter className="size-3.5" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 rounded-xl border-border/80 bg-popover/95 p-4 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Priority
              </p>
              <div className="flex flex-col gap-2">
                {(Object.keys(PRIORITY_META) as TaskPriority[]).map((priority) => (
                  <label
                    key={priority}
                    className="flex cursor-pointer items-center justify-between rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-accent/60"
                  >
                    <span className="flex items-center gap-2">
                      <Checkbox
                        checked={priorities.includes(priority)}
                        onCheckedChange={() => togglePriority(priority)}
                      />
                      <span className="flex items-center gap-1.5 font-medium">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: PRIORITY_META[priority].colorVar }}
                          aria-hidden="true"
                        />
                        {PRIORITY_META[priority].label}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {categories && categories.length > 0 && (
              <div className="border-t border-border/60 pt-3">
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Category
                </p>
                <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto pr-1">
                  {categories.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center justify-between rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-accent/60"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Checkbox checked={categoryIds.includes(c.id)} onCheckedChange={() => toggleCategory(c.id)} />
                        <span className="flex items-center gap-1.5 truncate">
                          <span
                            className={cn('size-2 rounded-full shrink-0', CATEGORY_COLOR_CLASSES[c.color])}
                            aria-hidden="true"
                          />
                          <span className="truncate">{c.name}</span>
                        </span>
                      </span>
                    </label>
                  ))}
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-accent/60">
                    <Checkbox
                      checked={categoryIds.includes('uncategorized')}
                      onCheckedChange={() => toggleCategory('uncategorized')}
                    />
                    <span>Uncategorized</span>
                  </label>
                </div>
              </div>
            )}

            {activeFilterCount > 0 && (
              <div className="border-t border-border/60 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    onPrioritiesChange([])
                    onCategoryIdsChange([])
                  }}
                >
                  <X className="size-3.5" /> Clear filters
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Select value={sortField} onValueChange={(v) => onSortFieldChange(v as TaskSortField)}>
        <SelectTrigger size="sm" className="w-auto gap-1.5 rounded-lg border-border/70 bg-card/60 backdrop-blur-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
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
        className="size-8 rounded-lg border-border/70 bg-card/60 backdrop-blur-xs"
        aria-label={sortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'}
        onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
      >
        <ArrowUpDown className="size-3.5" />
      </Button>
    </div>
  )
}
