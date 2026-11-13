import { localize } from '../i18n/Localize'
import { useLanguage } from '../i18n/language'
import { useRef, useState } from 'react'
import type { ClipboardEvent } from 'react'
import { Alert, Button, Upload } from 'antd'
import { SnippetsOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import * as api from '../sdk'

type Props = {
  value?: string[]; onChange?: (urls: string[]) => void
  onBusyChange?: (blocked: boolean) => void; purpose?: 'product' | 'evidence' | 'chat'
  uploadImage?: (file: Blob) => Promise<{ url: string }>
}

// Upload status is not a URL. Failed or pending files block submission until retried/removed.
export function ImageQueue({ value = [], onChange, onBusyChange, purpose = 'product', uploadImage }: Props) {
  useLanguage()
  const queue = useRef<HTMLDivElement>(null)
  const [files, setFiles] = useState<UploadFile[] | null>(null)
  const [error, setError] = useState('')
  const [expected, setExpected] = useState<string[]>(value)
  const current = files !== null && JSON.stringify(value) === JSON.stringify(expected)
    ? files : value.map((url, index): UploadFile => ({ uid: `saved-${index}`, name: '图片', status: 'done', url }))
  const update = (next: UploadFile[]) => {
    const urls = next.filter((file) => file.status === 'done').map((file) => file.url || (file.response as { url: string }).url)
    setExpected(urls); setFiles(next); onChange?.(urls)
    onBusyChange?.(next.some((file) => file.status !== 'done'))
  }
  const upload: UploadProps['customRequest'] = ({ file, onSuccess, onError, onProgress }) => {
    if (typeof file === 'string') { onError?.(new Error('无效图片')); return }
    onProgress?.({ percent: 10 })
    void (uploadImage ? uploadImage(file) : api.data(api.uploadImage({ body: { file }, query: { purpose } }))).then((result) => {
      onProgress?.({ percent: 100 }); onSuccess?.(result)
    }).catch((failure: Error) => { setError(failure.message); onError?.(failure) })
  }
  const paste = (event: ClipboardEvent<HTMLDivElement>) => {
    const images = Array.from(event.clipboardData.items).map(item => item.getAsFile()).filter((file): file is File => Boolean(file?.type.startsWith('image/')))
    if (!images.length) return
    event.preventDefault()
    const input = queue.current?.querySelector<HTMLInputElement>('input[type="file"]')
    if (!input) return
    const transfer = new DataTransfer()
    images.forEach(file => transfer.items.add(file))
    input.files = transfer.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }
  return localize(<div ref={queue} className="image-queue">
    {error && <Alert type="error" title={error} description="移除失败图片后重新上传；其余已上传图片不会丢失。" closable onClose={() => setError('')} />}
    <Upload listType="picture-card" accept="image/png,image/jpeg" fileList={current} customRequest={upload} maxCount={5}
      beforeUpload={(file) => {
        if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) {
          setError('只接受不超过 5MiB 的 JPG / PNG 图片。'); return Upload.LIST_IGNORE
        }
        setError(''); return true
      }}
      onChange={({ fileList }) => update(fileList)}>
      {current.length < 5 && (
        <Button
          type="text"
          htmlType="button"
          style={{ width: '100%', height: '100%' }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.stopPropagation()
          }}
        >
          <span>上传图片<br />JPG / PNG ≤5MiB</span>
        </Button>
      )}
    </Upload>
    <div className="image-queue-paste" role="group" aria-label="粘贴截图" tabIndex={0} onPaste={paste}><SnippetsOutlined aria-hidden="true" /><span>粘贴截图</span></div>
    {current.some((file) => file.status === 'error') && <Button onClick={() => update(current.filter((file) => file.status !== 'error'))}>移除失败图片并重新上传</Button>}
  </div>)
}
