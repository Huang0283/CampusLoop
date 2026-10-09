import { useEffect, useState } from 'react'
import { Image, Spin } from 'antd'
import * as api from '../sdk'
import { Failure } from './common'

export function PrivateImage({ messageId }: { messageId: number }) {
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
  return error ? <Failure error={error} retry={() => { setError(undefined); setAttempt((value) => value + 1) }} /> : url ? <Image src={url} width={160} /> : <Spin />
}
