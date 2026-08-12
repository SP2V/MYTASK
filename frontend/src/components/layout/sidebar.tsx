import { NavLink } from 'react-router-dom'
import { Plus, ListTodo } from 'lucide-react'
import { NAV_ITEMS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTaskDialog } from '@/features/tasks/components/task-dialog-provider'

export function Sidebar() {
  const { openCreate } = useTaskDialog()

  return (
    <aside className="hidden w-60 shrink-0 flex-col overflow-hidden border-r border-white/40 bg-card/50 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 md:flex">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/40 px-5 dark:border-white/10">
        <ListTodo className="size-5 text-primary" aria-hidden="true" />
        <span className="text-sm font-semibold">Task Manager</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-accent text-accent-foreground',
              )
            }
          >
            <item.icon className="size-4" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/40 p-3 dark:border-white/10">
        <Button className="w-full gap-2" onClick={() => openCreate()}>
          <Plus className="size-4" />
          Add Task
        </Button>
      </div>
    </aside>
  )
}
