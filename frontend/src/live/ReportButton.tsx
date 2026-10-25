import { useState } from 'react'
import { Alert, Button, Form, Input, message, Modal, Select } from 'antd'
import { Link } from 'react-router-dom'
import { createReport, data, idempotencyHeaders } from '../sdk'
import type { ReportReason, ReportTargetType } from '../sdk'
import { Failure, useMutation } from './common'
import { ImageQueue } from './ImageQueue'
import { useAttemptKey } from './idempotency'
import { reportReasons } from './reportReasons'

export function ReportButton({ targetType, targetId, orderRole, label = '举报' }: { targetType: ReportTargetType; targetId: number; orderRole?: 'buyer' | 'seller'; label?: string }) {
  const [open, setOpen] = useState(false)
  const [uploadBlocked, setUploadBlocked] = useState(false)
  const [form] = Form.useForm()
  const mutation = useMutation()
  const attemptKey = useAttemptKey()
  const [messageApi, contextHolder] = message.useMessage()
  const options = reportReasons(targetType, orderRole)
  return <>{contextHolder}<Button onClick={() => setOpen(true)}>{label}</Button><Modal title="提交举报" open={open} onCancel={() => setOpen(false)} footer={null}>
    {targetType === 'ORDER' && <Alert type="info" style={{ marginBottom: 16 }} title={orderRole === 'seller' ? '举报本订单中的买家行为' : '举报本订单中的交易问题'} description="请选择与事实相符的原因；恶意下单、爽约等请在交易违规的说明中描述。" />}
    <Failure error={mutation.error} /><Form form={form} layout="vertical" onFinish={(values: { reason: ReportReason; description?: string; evidence?: string[] }) => void mutation.run(async () => {
      const body = { targetType, targetId, ...values }
      await data(createReport({ body, headers: idempotencyHeaders(attemptKey(body)) })); form.resetFields(); setUploadBlocked(false); setOpen(false)
      void messageApi.success({ content: <span>举报已提交，<Link to="/report">查看我的举报</Link></span>, duration: 6 })
    })}>
      <Form.Item name="reason" label="举报原因" rules={[{ required: true }, { validator: (_, value) => !value || options.some((option) => option.value === value) ? Promise.resolve() : Promise.reject(new Error('请重新选择符合当前举报对象的原因。')) }]}><Select options={options} /></Form.Item>
      <Form.Item name="description" label="说明"><Input.TextArea maxLength={1000} showCount /></Form.Item>
      <Form.Item name="evidence" label="证据图片（可选，私有存储）"><ImageQueue purpose="evidence" onBusyChange={setUploadBlocked} /></Form.Item>
      <Button type="primary" htmlType="submit" loading={mutation.busy} disabled={uploadBlocked}>提交举报</Button>
    </Form>
  </Modal></>
}
