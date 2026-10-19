// Meeting slots are campus time (UTC+8), including when a browser uses another timezone.
export function campusToday() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function validateMeetupStart(day?: string, start?: string) {
  if (!day || !start) return
  const scheduled = new Date(`${day}T${start}+08:00`).getTime()
  if (!Number.isFinite(scheduled) || scheduled <= Date.now()) {
    throw new Error('见面开始时间必须晚于当前时间（北京时间），请重新选择。')
  }
}

export function validateMeetupEnd(start?: string, end?: string) {
  if (!start || !end) return
  if (start >= end) throw new Error('结束时间必须晚于开始时间。')
}
