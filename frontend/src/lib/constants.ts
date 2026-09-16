import {
  LayoutDashboard,
  CalendarClock,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FolderKanban,
  StickyNote,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import type { TaskPriority } from '@/features/tasks/schemas/task.schema'
import type { CategoryColor } from '@/features/categories/schemas/category.schema'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/today', label: 'Today', icon: CalendarClock },
  { to: '/upcoming', label: 'Upcoming', icon: CalendarDays },
  { to: '/overdue', label: 'Overdue', icon: AlertTriangle },
  { to: '/completed', label: 'Completed', icon: CheckCircle2 },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/categories', label: 'Categories', icon: FolderKanban },
  { to: '/postit', label: 'Post-it', icon: StickyNote },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/today', label: 'Today', icon: CalendarClock },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/upcoming', label: 'Tasks', icon: CalendarDays },
  { to: '/settings', label: 'More', icon: Settings },
]

export const PRIORITY_META: Record<
  TaskPriority,
  { label: string; colorVar: string; order: number }
> = {
  URGENT: { label: 'Urgent', colorVar: 'var(--priority-urgent)', order: 0 },
  HIGH: { label: 'High', colorVar: 'var(--priority-high)', order: 1 },
  MEDIUM: { label: 'Medium', colorVar: 'var(--priority-medium)', order: 2 },
  LOW: { label: 'Low', colorVar: 'var(--priority-low)', order: 3 },
}

export const CATEGORY_COLOR_CLASSES: Record<CategoryColor, string> = {
  slate: 'bg-slate-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  yellow: 'bg-yellow-500',
  lime: 'bg-lime-500',
  green: 'bg-green-500',
  teal: 'bg-teal-500',
  cyan: 'bg-cyan-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
}

export const REMINDER_OFFSET_LABELS: Record<number, string> = {
  15: '15 minutes before',
  30: '30 minutes before',
  60: '1 hour before',
  1440: '1 day before',
}
