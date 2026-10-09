import { useState } from 'react'
import { Alert, Button, Upload } from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import * as api from '../sdk'

type Props = {
  value?: string[]; onChange?: (urls: string[]) => void
  onBusyChange?: (blocked: boolean) => void; purpose?: 'product' | 'evidence' | 'chat'
}

// Upload status is not a URL. Failed or pending files block submission until retried/removed.
export function ImageQueue({ value = [], onChange, onBusyChange, purpose = 'product' }: Props) {
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
    void api.data(api.uploadImage({ body: { file }, query: { purpose } })).then((result) => {
      onProgress?.({ percent: 100 }); onSuccess?.(result)
    }).catch((failure: Error) => { setError(failure.message); onError?.(failure) })
  }
  return <>
    {error && <Alert type="error" title={error} description="移除失败图片后重新上传；其余已上传图片不会丢失。" closable onClose={() => setError('')} />}
    <Upload listType="picture-card" accept="image/png,image/jpeg" fileList={current} customRequest={upload} maxCount={5}
      beforeUpload={(file) => {
        if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) {
          setError('只接受不超过 5MiB 的 JPG / PNG 图片。'); return Upload.LIST_IGNORE
        }
        setError(''); return true
      }}
      onChange={({ fileList }) => update(fileList)}>
      {current.length < 5 && <span>上传图片<br />JPG / PNG ≤5MiB</span>}
    </Upload>
    {current.some((file) => file.status === 'error') && <Button onClick={() => update(current.filter((file) => file.status !== 'error'))}>移除失败图片并重新上传</Button>}
  </>
}
