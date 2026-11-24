import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { localize } from '../i18n/Localize'
import { ArrowLeftOutlined } from '@ant-design/icons'

// Shared route state and its return control must use the same convention.
// eslint-disable-next-line react-refresh/only-export-components
export function useReturnState() {
  const location = useLocation()
  return { returnTo: location.pathname + location.search + location.hash, returnState: location.state }
}

export function BackLink({ fallback, children }: { fallback: string; children: ReactNode }) {
  const location = useLocation()
  const source: unknown = location.state?.returnTo ?? location.state?.from
  // Only application paths can be return destinations; never leave the site.
  const valid = typeof source === 'string'
    && /^\/(?:market|product|wanted|notifications|chat|transactions|report|profile|my-products|favorites|publish|account|admin)(?:[/?#]|$)/.test(source)
    && !source.includes('\\') && !Array.from(source).some(char => char.charCodeAt(0) < 32)
  const destination = valid && source !== location.pathname + location.search + location.hash ? source : fallback
  return localize(<Link className="page-back-link" to={destination} state={valid ? location.state?.returnState : undefined} replace><ArrowLeftOutlined aria-hidden /> {destination === fallback ? children : '返回上一页'}</Link>)
}
