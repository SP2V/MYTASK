import { useEffect, useRef } from 'react'
import { useTasks } from '@/features/tasks/hooks/use-tasks'
import { useSettings } from '@/features/settings/hooks/use-settings'
import { getTaskDueMoment } from '@/lib/date'
import { getNotificationPermission, showReminderNotification } from '@/features/notifications/services/notification-service'

const CHECK_INTERVAL_MS = 30_000

/**
 * Best-effort in-session reminder checker. Only fires while the app tab is
 * open — there is no service worker / background scheduling, since browser
 * notifications cannot be relied on to fire reliably while fully offline or
 * closed. Notified task ids are tracked in-memory only, so a reminder may
 * repeat if the app is reloaded within its trigger window.
 */
export function useReminderScheduler(enabled: boolean): void {
  const tasks = useTasks()
  const settings = useSettings()
  const notifiedIds = useRef(new Set<string>())

  useEffect(() => {
    if (!enabled || !settings.notificationsEnabled) return

    const check = () => {
      if (getNotificationPermission() !== 'granted') return
      const now = Date.now()

      for (const task of tasks ?? []) {
        if (task.status === 'COMPLETED' || task.status === 'ARCHIVED') continue
        if (!task.reminder?.enabled || !task.dueDate) continue
        if (notifiedIds.current.has(task.id)) continue

        const dueMoment = getTaskDueMoment(task)
        if (!dueMoment) continue

        const triggerAt = dueMoment.getTime() - task.reminder.offsetMinutes * 60_000
        if (now >= triggerAt && now < dueMoment.getTime()) {
          showReminderNotification(
            task.title,
            task.dueTime ? `Due at ${task.dueTime}` : 'Due today',
            task.id,
          )
          notifiedIds.current.add(task.id)
        }
      }
    }

    check()
    const interval = setInterval(check, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [enabled, tasks, settings.notificationsEnabled])
}
