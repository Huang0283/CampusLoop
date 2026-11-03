import { useEffect, useState } from 'react'
import { activeLanguage, t, useLanguage, type Language } from './language'

const cache = new Map<string, string>()
const inFlight = new Map<string, Promise<string>>()
const waiting = new Map<string, { text: string; target: Language; resolve: ((value: string) => void)[]; reject: (() => void)[] }>()
let timer: ReturnType<typeof setTimeout> | undefined
const endpoint = (import.meta.env.VITE_CATALOG_TRANSLATION_URL || '/display-translation').replace(/\/$/, '')

function requestTranslation(text: string, target: Language) {
  const key = `${target}:${text}`
  const saved = cache.get(key)
  if (saved !== undefined) return Promise.resolve(saved)
  const active = inFlight.get(key)
  if (active) return active
  const request = new Promise<string>((resolve, reject) => {
    const prior = waiting.get(key)
    if (prior) { prior.resolve.push(resolve); prior.reject.push(() => reject(new Error('Translation unavailable'))) }
    else waiting.set(key, { text, target, resolve: [resolve], reject: [() => reject(new Error('Translation unavailable'))] })
    if (!timer) timer = setTimeout(() => { timer = undefined; void flush() }, 30)
  }).finally(() => { inFlight.delete(key) })
  inFlight.set(key, request)
  return request
}
async function flush() {
  const all = [...waiting.entries()]
  all.forEach(([key]) => waiting.delete(key))
  for (const target of ['zh', 'en'] as const) {
    const entries = all.filter(([, item]) => item.target === target)
    for (let index = 0; index < entries.length; index += 32) {
      const batch = entries.slice(index, index + 32)
      try {
        const response = await fetch(`${endpoint}/translate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target, texts: batch.map(([, item]) => item.text) }), signal: AbortSignal.timeout(90000) })
        if (!response.ok) throw new Error('Translation unavailable')
        const result = await response.json() as { translations: string[] }
        if (!Array.isArray(result.translations) || result.translations.length !== batch.length || result.translations.some((value) => typeof value !== 'string' || !value)) throw new Error('Invalid translation')
        batch.forEach(([key, item], row) => { cache.set(key, result.translations[row]); item.resolve.forEach((resolve) => resolve(result.translations[row])) })
      } catch { batch.forEach(([, item]) => item.reject.forEach((reject) => reject())) }
    }
  }
}

/** Translate display text without replacing stored or user-authored values. */
export function CatalogText({ text }: { text: string }) {
  useLanguage()
  const language = activeLanguage()
  const fixed = t(text)
  const needsTranslation = fixed === text && (language === 'en' ? /[\u3400-\u9fff]/u.test(text) : /[a-zA-Z]{3}/.test(text))
  const key = `${language}:${text}`
  const [result, setResult] = useState({ key: '', text: '', failed: false })
  useEffect(() => {
    if (!needsTranslation) return
    let current = true
    void requestTranslation(text, language).then((value) => { if (current) setResult({ key, text: value, failed: false }) }).catch(() => { if (current) setResult({ key, text, failed: true }) })
    return () => { current = false }
  }, [key, language, needsTranslation, text])
  if (!needsTranslation) return <span data-original-text>{fixed}</span>
  const value = cache.get(key) ?? (result.key === key ? result.text : '')
  const failed = result.key === key && result.failed
  return <span data-original-text aria-busy={!value} title={failed ? language === 'en' ? 'Translation unavailable; original text shown.' : '翻译暂不可用，当前显示原文。' : undefined}>
    {value || <span className="catalog-placeholder" aria-label={language === 'en' ? 'Loading content' : '正在加载内容'} />}
  </span>
}
