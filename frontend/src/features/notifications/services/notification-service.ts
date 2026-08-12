export type NotificationPermissionState = 'unsupported' | 'granted' | 'denied' | 'default'

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return 'unsupported'
  try {
    const result = await Notification.requestPermission()
    return result
  } catch {
    return 'denied'
  }
}

export function showReminderNotification(title: string, body: string, tag: string): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, tag })
  } catch {
    // Some browsers (notably mobile Safari) throw on direct `new Notification`
    // even when permission is granted — silently skip rather than crash the app.
  }
}
