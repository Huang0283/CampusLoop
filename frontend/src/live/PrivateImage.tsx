import { localize } from '../i18n/Localize'
import { useLanguage } from '../i18n/language'
import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import * as api from '../sdk'
import { Failure } from './common'
import { PrivateMediaImage } from './PrivateMediaImage'

export function PrivateImage({ messageId }: { messageId: number }) {
  useLanguage()
  const [image, setImage] = useState<{ blob: Blob; url: string }>()
  const [error, setError] = useState<unknown>()
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let objectUrl: string | undefined
    let disposed = false
    void api.getChatMessageImage({ path: { messageId }, signal: controller.signal, parseAs: 'blob' }).then((result) => {
      if (disposed) return
      objectUrl = URL.createObjectURL(result as unknown as Blob)
      setImage({ blob: result as unknown as Blob, url: objectUrl })
    }).catch((failure) => { if (!disposed) setError(failure) })
    return () => { disposed = true; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [messageId, attempt])
  return error ? localize(<Failure error={error} retry={() => { setError(undefined); setAttempt((value) => value + 1) }} />) : image ? localize(<PrivateMediaImage key={image.url} {...image} width={160} alt="聊天图片" />) : localize(<Spin />)
}
