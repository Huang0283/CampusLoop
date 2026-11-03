import { localize } from '../i18n/Localize'
import { useLanguage } from '../i18n/language'
import { useEffect, useRef, useState } from 'react'
import { Alert, Avatar, Button, Space, Upload } from 'antd'
import type { UploadProps } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import * as api from '../sdk'
import { errorText } from './common'

export function AvatarUpload({ value, onChange, onBusyChange, disabled }: {
  value?: string | null
  onChange?: (url: string | null) => void
  onBusyChange: (busy: boolean) => void
  disabled?: boolean
}) {
  useLanguage()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => { request.current?.abort() }, [])
  const upload: UploadProps['customRequest'] = ({ file, onSuccess, onError }) => {
    if (typeof file === 'string') { onError?.(new Error('无效图片。')); return }
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setBusy(true); onBusyChange(true); setError('')
    void api.data(api.uploadImage({ body: { file }, query: { purpose: 'avatar' }, signal: controller.signal })).then((result) => {
      if (controller.signal.aborted) return
      onChange?.(result.url); onSuccess?.(result)
    }).catch((failure: unknown) => {
      if (controller.signal.aborted) return
      const detail = errorText(failure)
      setError(`头像上传失败：${detail} 请重新选择图片上传。`)
      onError?.(new Error(detail))
    }).finally(() => {
      if (request.current !== controller || controller.signal.aborted) return
      request.current = null; setBusy(false); onBusyChange(false)
    })
    return { abort: () => controller.abort() }
  }
  return localize(<div className="profile-avatar-upload">
    <Space wrap align="center">
      <Avatar size={64} src={value} alt="待保存头像预览">头像</Avatar>
      <Upload accept="image/jpeg,image/png" showUploadList={false} maxCount={1} disabled={busy || disabled} customRequest={upload}
        beforeUpload={(file) => {
          if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            setError('请选择不超过 5MiB 的 JPG 或 PNG 图片。'); return Upload.LIST_IGNORE
          }
          setError(''); return true
        }}>
        <Button htmlType="button" aria-label={busy ? '正在上传头像' : value ? '更换头像' : '上传头像'} icon={<UploadOutlined aria-hidden />} loading={busy} disabled={disabled}>{busy ? '正在上传头像' : value ? '更换头像' : '上传头像'}</Button>
      </Upload>
      {value && <Button htmlType="button" type="text" disabled={busy || disabled} onClick={() => { setError(''); onChange?.(null) }}>恢复默认头像</Button>}
    </Space>
    <p className="muted">支持 JPG、PNG，最大 5MiB；图片会居中裁剪为方形。上传后点击“保存资料”生效。</p>
    {error && <Alert type="error" showIcon title={error} />}
  </div>)
}
