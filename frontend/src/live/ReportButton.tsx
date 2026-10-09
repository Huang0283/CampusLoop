import { useState } from 'react'
import { Button, Form, Input, Modal, Select } from 'antd'
import { createReport, data, idempotencyHeaders } from '../sdk'
import type { ReportReason, ReportTargetType } from '../sdk'
import { Failure, useMutation } from './common'
import { ImageQueue } from './ImageQueue'
import { useAttemptKey } from './idempotency'

export function ReportButton({ targetType, targetId }: { targetType: ReportTargetType; targetId: number }) {
  const [open, setOpen] = useState(false)
  const [uploadBlocked, setUploadBlocked] = useState(false)
  const [form] = Form.useForm()
  const mutation = useMutation()
  const attemptKey = useAttemptKey()
  return <><Button onClick={() => setOpen(true)}>举报</Button><Modal title="提交举报" open={open} onCancel={() => setOpen(false)} footer={null}>
    <Failure error={mutation.error} /><Form form={form} layout="vertical" onFinish={(values: { reason: ReportReason; description?: string; evidence?: string[] }) => void mutation.run(async () => {
      const body = { targetType, targetId, ...values }
      await data(createReport({ body, headers: idempotencyHeaders(attemptKey(body)) })); form.resetFields(); setUploadBlocked(false); setOpen(false)
    })}>
      <Form.Item name="reason" label="举报原因" rules={[{ required: true }]}><Select options={[{ value: 'FAKE_PRODUCT', label: '虚假商品' }, { value: 'DESCRIPTION_MISMATCH', label: '描述不符' }, { value: 'SPAM', label: '垃圾信息' }, { value: 'ABNORMAL_PRICE', label: '异常价格' }, { value: 'HARASSMENT', label: '骚扰' }, { value: 'VIOLATION', label: '其他违规' }]} /></Form.Item>
      <Form.Item name="description" label="说明"><Input.TextArea maxLength={2000} /></Form.Item>
      <Form.Item name="evidence" label="证据图片（可选，私有存储）"><ImageQueue purpose="evidence" onBusyChange={setUploadBlocked} /></Form.Item>
      <Button type="primary" htmlType="submit" loading={mutation.busy} disabled={uploadBlocked}>提交举报</Button>
    </Form>
  </Modal></>
}
