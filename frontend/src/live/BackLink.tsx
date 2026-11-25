import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { localize } from '../i18n/Localize'
import { ArrowLeftOutlined } from '@ant-design/icons'

type ReturnState = { returnTo: string; returnState?: ReturnState }

function appPath(value: unknown): string | undefined {
  if (typeof value !== 'string'
    || !/^\/(?:market|product|wanted|notifications|chat|transactions|report|profile|my-products|favorites|publish|account|admin)(?:[/?#]|$)/.test(value)
    || value.includes('\\') || Array.from(value).some(char => char.charCodeAt(0) < 32)) return
  // In-page anchors must not change the return label or reopen a scrolled detail.
  return value.split('#', 1)[0]
}

function returnChain(state: unknown, seen: Set<string>, remaining = 8): ReturnState | undefined {
  if (!remaining || !state || typeof state !== 'object') return
  const value = state as { returnTo?: unknown; from?: unknown; returnState?: unknown }
  const path = appPath(value.returnTo ?? value.from)
  if (!path) return
  if (seen.has(path)) return returnChain(value.returnState, seen, remaining - 1)
  seen.add(path)
  return { returnTo: path, returnState: returnChain(value.returnState, seen, remaining - 1) }
}

// Shared route state and its return control must use the same convention.
// eslint-disable-next-line react-refresh/only-export-components
export function useReturnState() {
  const location = useLocation()
  const path = location.pathname + location.search
  return { returnTo: path, returnState: returnChain(location.state, new Set([path])) }
}

export function BackLink({ fallback, children }: { fallback: string; children: ReactNode }) {
  const location = useLocation()
  const chain = returnChain(location.state, new Set([location.pathname + location.search]))
  const destination = chain?.returnTo ?? fallback
  return localize(<Link className="page-back-link" to={destination} state={chain?.returnState} replace><ArrowLeftOutlined aria-hidden /> {destination === fallback ? children : '返回上一页'}</Link>)
}
