import { useEffect, useState } from 'react'
import { Image, type ImageProps } from 'antd'

// Revoke each rendered URL after decoding; previews get their own fresh URL.
export function PrivateMediaImage({ blob, url, ...props }: Omit<ImageProps, 'src' | 'preview'> & { blob: Blob; url: string }) {
  const [preview, setPreview] = useState<{ url: string; open: boolean }>()
  const previewUrl = preview?.url
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])
  return <span onLoadCapture={event => {
    if (event.target instanceof HTMLImageElement && event.target.src.startsWith('blob:')) URL.revokeObjectURL(event.target.src)
  }}>
    <Image {...props} src={url} preview={{
      open: preview?.open ?? false, src: preview?.url ?? url,
      // Nested evidence dialogs otherwise leave this preview stuck in its exit animation.
      motionName: '',
      onOpenChange: open => {
        if (open) setPreview({ url: URL.createObjectURL(blob), open: true })
        else if (preview) { URL.revokeObjectURL(preview.url); setPreview({ ...preview, open: false }) }
      },
    }} />
  </span>
}
