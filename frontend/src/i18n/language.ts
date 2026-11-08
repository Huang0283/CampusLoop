import { create } from 'zustand'
import messages from './messages.json'

export type Language = 'zh' | 'en'
const KEY = 'campusloop-language'
const initial: Language = localStorage.getItem(KEY) === 'en' ? 'en' : 'zh'
export const useLanguage = create<{ language: Language; setLanguage: (language: Language) => void }>((set) => ({
  language: initial,
  setLanguage: (language) => { localStorage.setItem(KEY, language); set({ language }) },
}))

// A preference changed in another tab also updates any open dialogs here.
const syncLanguage = (event: StorageEvent) => {
  if (event.key === KEY && (event.newValue === 'zh' || event.newValue === 'en')) {
    useLanguage.setState({ language: event.newValue })
  }
}
window.addEventListener('storage', syncLanguage)
if (import.meta.hot) import.meta.hot.dispose(() => window.removeEventListener('storage', syncLanguage))

export function activeLanguage(): Language {
  return useLanguage.getState().language
}
export const dateLocale = () => activeLanguage() === 'en' ? 'en-GB' : 'zh-CN'

const dictionary: Record<string, string> = messages
const reverse = new Map(Object.entries(dictionary).map(([zh, en]) => [en, zh]))
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const patterns = Object.entries(dictionary).filter(([key]) => /\{\d+\}/.test(key)).map(([zh, en]) => {
  const compile = (value: string) => new RegExp('^' + value.split(/(\{\d+\})/g).map((part) => /^\{\d+\}$/.test(part) ? '([\\s\\S]*?)' : escape(part)).join('') + '$')
  return { zh, en, zhPattern: compile(zh), enPattern: compile(en) }
})

/** Translate system-owned display text; input values, names and stored data stay intact. */
export function t(text: string): string {
  const language = activeLanguage()
  const key = text.trim()
  if (!key) return text
  // Chinese source text is already in the requested language. In particular,
  // never reverse-match arbitrary prose against the broad weekday templates.
  if (language === 'zh' && /[\u3400-\u9fff]/u.test(key)) return text
  if (language === 'zh' && dictionary[key] !== undefined) return text
  const exact = language === 'en' ? dictionary[key] : reverse.get(key)
  if (exact !== undefined) return text.replace(key, exact)
  for (const item of patterns) {
    const match = key.match(language === 'en' ? item.zhPattern : item.enPattern)
    if (match) {
      const target = language === 'en' ? item.en : item.zh
      return text.replace(key, target.replace(/\{(\d+)\}/g, (_, index: string) => {
        const value = match[Number(index) + 1] ?? ''
        if (!value) return value
        // Dynamic names stay exact; nested system labels need their own locale.
        return /账号菜单|你好|进入市场|进入管理后台|插入/.test(item.zh) ? value : (language === 'en' ? dictionary[value] : reverse.get(value)) ?? value
      }))
    }
  }
  return text
}
