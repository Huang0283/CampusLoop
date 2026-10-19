import type { Notification } from '../sdk'

export const NOTIFICATIONS_CHANGED_EVENT = 'campusloop:notifications-changed'

/** Keep the view stable if an upstream retry ever returns the same notification twice. */
export function uniqueNotifications(items: Notification[]): Notification[] {
  const seen = new Set<number>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export function notifyNotificationsChanged() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT))
}
