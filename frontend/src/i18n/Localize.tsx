/* eslint-disable react-refresh/only-export-components -- Display localization helpers are shared with the language control. */
import { Children, cloneElement, isValidElement, type ReactNode } from 'react'
import { Select } from 'antd'
import { activeLanguage, t, useLanguage } from './language'
import './language.css'

// Only display properties are localized. Never touch values, IDs, URLs, payloads,
// form initialValues, dataSource, callbacks or the contents of inputs.
const displayProps = new Set(['title', 'label', 'description', 'placeholder', 'help', 'extra', 'content', 'okText', 'cancelText', 'notFoundContent', 'aria-label', 'alt', 'data-title', 'data-tip', 'action', 'actions', 'footer', 'feedback', 'detail', 'subtitle', 'subTitle', 'sub', 'intro', 'caption', 'centerLabel', 'empty', 'note'])
const displayCollections = new Set(['options', 'columns', 'items', 'menu', 'rules'])
function displayConfig(value: unknown): unknown {
  if (typeof value === 'string') return t(value)
  if (Array.isArray(value)) return value.map(displayConfig)
  if (isValidElement(value)) return localize(value)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    displayProps.has(key) || key === 'message' ? localize(item as ReactNode) : displayCollections.has(key) || key === 'children' ? displayConfig(item) : item,
  ]))
}

/** Localize React display nodes before rendering; this never edits the DOM behind React. */
export function localize(node: ReactNode): ReactNode {
  if (activeLanguage() === 'zh') {
    // Chinese system source strings are authoritative; English backend labels are
    // handled by display.ts. Reverse lookup also restores an already-issued toast.
    if (typeof node === 'string') return t(node)
  }
  if (typeof node === 'string') return t(node)
  if (Array.isArray(node)) return Children.map(node, child => localize(child))
  if (!isValidElement<Record<string, unknown>>(node)) return node
  if (node.type === OriginalText) return node
  if (node.props.translate === 'no' || node.props['data-original-text']) return node
  const props: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node.props)) {
    if (key === 'children' || displayProps.has(key)) props[key] = localize(value as ReactNode)
    else if (displayCollections.has(key)) props[key] = displayConfig(value)
  }
  return cloneElement(node, props)
}

export function OriginalText({ children }: { children: ReactNode }) {
  return <span translate="no" data-original-text>{children}</span>
}

/** Keeps an already-open toast in sync with a later language change. */
export function LocalizedText({ children }: { children: ReactNode }) {
  useLanguage()
  return <>{localize(children)}</>
}

export function LanguageSelect({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage()
  return <Select className={`language-select ${className}`} aria-label={language === 'zh' ? '界面语言' : 'Language'} value={language}
    onChange={setLanguage} popupMatchSelectWidth={false} virtual={false}
    classNames={{ popup: { root: 'language-select-dropdown' } }}
    transitionName={window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '' : undefined}
    options={[{ value: 'zh', label: '简体中文' }, { value: 'en', label: 'English' }]} />
}
