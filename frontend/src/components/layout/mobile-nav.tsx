import { NavLink } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { MOBILE_NAV_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useTaskDialog } from '@/features/tasks/components/task-dialog-provider'

export function MobileNav() {
  const { openCreate } = useTaskDialog()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border/70 bg-card/90 px-2 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 6px)', paddingTop: '6px' }}
      aria-label="Primary"
    >
      {MOBILE_NAV_ITEMS.slice(0, 2).map((item) => (
        <MobileNavLink key={item.to} item={item} />
      ))}

      <button
        type="button"
        onClick={() => openCreate()}
        aria-label="Add Task"
        className="-mt-6 flex size-13 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
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
          'flex flex-1 flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition-colors',
          isActive ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground',
        )
      }
    >
      <item.icon className="size-5" aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  )
}
