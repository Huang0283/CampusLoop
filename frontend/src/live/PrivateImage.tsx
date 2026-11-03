import { localize } from '../i18n/Localize'
import { useLanguage } from '../i18n/language'
import { useEffect, useState } from 'react'
import { Image, Spin } from 'antd'
import * as api from '../sdk'
import { Failure } from './common'

export function PrivateImage({ messageId }: { messageId: number }) {
  useLanguage()
  const [url, setUrl] = useState<string>()
  const [error, setError] = useState<unknown>()
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let objectUrl: string | undefined
    let disposed = false
    void api.getChatMessageImage({ path: { messageId }, signal: controller.signal, parseAs: 'blob' }).then((result) => {
      if (disposed) return
      objectUrl = URL.createObjectURL(result as unknown as Blob)
      setUrl(objectUrl)
    }).catch((failure) => { if (!disposed) setError(failure) })
    return () => { disposed = true; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [messageId, attempt])
  return error ? localize(<Failure error={error} retry={() => { setError(undefined); setAttempt((value) => value + 1) }} />) : url ? localize(<Image src={url} width={160} />) : localize(<Spin />)
}
