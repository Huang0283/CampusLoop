import { Avatar, type AvatarProps } from 'antd'
import { useEffect, useState } from 'react'
import * as api from '../sdk'
import { useSession } from './session'

// Avatar references are identifiers; only the authenticated API reads their bytes.
export function UserAvatar({ src, ...props }: Omit<AvatarProps, 'src'> & { src?: string | null }) {
  const viewerId = useSession(state => state.user?.id)
  const key = viewerId && src ? `${viewerId}:${src}` : undefined
  const [image, setImage] = useState<{ key: string; url: string }>()
  useEffect(() => {
    if (!key || !src) return
    const controller = new AbortController()
    let url: string | undefined
    void api.getAvatarImage({ query: { reference: src }, signal: controller.signal, parseAs: 'blob' }).then(blob => {
      if (controller.signal.aborted) return
      url = URL.createObjectURL(blob as unknown as Blob)
      setImage({ key, url })
    }).catch(() => { /* Missing or unavailable avatars retain the existing initials. */ })
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url) }
  }, [key, src])
  return <Avatar {...props} src={key && image?.key === key ? <img key={image.url} src={image.url} alt={props.alt} draggable={props.draggable}
    onLoad={() => URL.revokeObjectURL(image.url)} onError={() => setImage(undefined)} /> : undefined} />
}
