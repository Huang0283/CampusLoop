import { dateLocale, t } from '../i18n/language'

export const fmt = (value: number) => value.toLocaleString(dateLocale())

/** Change against a comparison count. A zero base has no meaningful percentage, so it reports the raw difference. */
export function change(current: number, previous: number) {
  const diff = current - previous
  if (previous === 0) return { up: diff >= 0, text: diff === 0 ? '持平' : `${diff > 0 ? '+' : ''}${diff}` }
  const pct = (diff / previous) * 100
  return { up: diff >= 0, text: diff === 0 ? '持平' : `${diff > 0 ? '↑' : '↓'} ${Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}%` }
}

export function ratio(value: { numerator: number; denominator: number }) {
  return value.denominator > 0 ? value.numerator / value.denominator : null
}

export function waited(createdAt: string, now: number) {
  const minutes = Math.max(0, Math.round((now - Date.parse(createdAt)) / 60000))
  if (minutes < 60) return { text: t(`${minutes} 分钟`), late: false }
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return { text: t(`${hours} 小时`), late: hours >= 24 }
  return { text: t(`${Math.floor(hours / 24)} 天`), late: true }
}

// The console speaks campus time (the dashboard's day boundaries), whatever the browser's zone.
const campusDay = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric', day: 'numeric' })
const campusTime = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false })

export function clock(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  return campusDay.format(date) === campusDay.format(new Date()) ? campusTime.format(date) : new Intl.DateTimeFormat(dateLocale(), { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}

/** CSV with a BOM so Excel opens Chinese text correctly. Cells are quoted; formula prefixes are neutralised. */
export function downloadCsv(name: string, rows: (string | number)[][]) {
  const cell = (value: string | number) => {
    let text = String(value)
    if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`
    return `"${text.replace(/"/g, '""')}"`
  }
  const blob = new Blob(['﻿' + rows.map((row) => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
