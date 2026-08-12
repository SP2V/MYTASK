import { NavLink } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { MOBILE_NAV_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useTaskDialog } from '@/features/tasks/components/task-dialog-provider'

export function MobileNav() {
  const { openCreate } = useTaskDialog()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/40 bg-card/60 backdrop-blur-xl dark:border-white/10 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      {MOBILE_NAV_ITEMS.slice(0, 2).map((item) => (
        <MobileNavLink key={item.to} item={item} />
      ))}

      <button
        type="button"
        onClick={() => openCreate()}
        aria-label="Add Task"
        className="-mt-5 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
      >
        <Plus className="size-6" />
      </button>

      {MOBILE_NAV_ITEMS.slice(2).map((item) => (
        <MobileNavLink key={item.to} item={item} />
      ))}
    </nav>
  )
}

function MobileNavLink({ item }: { item: (typeof MOBILE_NAV_ITEMS)[number] }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground',
          isActive && 'text-primary',
        )
      }
    >
      <item.icon className="size-5" aria-hidden="true" />
      {item.label}
    </NavLink>
  )
}
