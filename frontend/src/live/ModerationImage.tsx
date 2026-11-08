import { useEffect, useRef, useState } from 'react'
import { Image, Spin } from 'antd'
import { localize } from '../i18n/Localize'
import { useLanguage } from '../i18n/language'
import { Failure } from './common'

// Callers supply the existing SDK endpoint, so the same private viewer works for both roles.
export function ModerationImage({ load }: { load: (signal: AbortSignal) => Promise<unknown> }) {
  useLanguage()
  const loader = useRef(load)
  useEffect(() => { loader.current = load }, [load])
  const [state, setState] = useState<{ url?: string; error?: unknown }>({})
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let objectUrl: string | undefined
    void loader.current(controller.signal).then(result => {
      if (controller.signal.aborted) return
      objectUrl = URL.createObjectURL(result as Blob)
      setState({ url: objectUrl })
    }).catch(error => { if (!controller.signal.aborted) setState({ error }) })
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [attempt])
  return state.error ? <Failure error={state.error} retry={() => { setState({}); setAttempt(value => value + 1) }} /> : state.url ? localize(<Image width={160} src={state.url} alt="处理或申诉证据" />) : <Spin />
}
