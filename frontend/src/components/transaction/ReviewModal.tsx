import { Form, Input, Modal, Rate, message } from 'antd'

export interface ReviewFormValues {
  overall: number
  descriptionAccuracy: number
  communication: number
  punctuality: number
  comment?: string
}

interface ReviewModalProps {
  open: boolean
  orderId: number
  peerNickname: string
  onClose: () => void
  /** 提交回调：原型阶段写入 mockDb，接接口后换成 HTTP 调用 */
  onSubmit?: (values: ReviewFormValues) => void
}

/**
 * 交易完成后评价弹层：总体 / 描述准确 / 沟通 / 守时 + 评论。
 * 约束：仅已完成订单的参与者可评价；重复提交由幂等键 + 后端校验拦截。
 */
export default function ReviewModal({ open, orderId, peerNickname, onClose, onSubmit }: ReviewModalProps) {
  const [form] = Form.useForm()

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSubmit?.(values)
      message.success(`已提交对 ${peerNickname} 的评价（订单 #${orderId}）`)
      form.resetFields()
      onClose()
    })
  }

  return (
    <Modal
      title={`评价交易 · 订单 #${orderId}`}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="提交评价"
      cancelText="取消"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" initialValues={{ overall: 5 }}>
        <Form.Item label="总体评分" name="overall" rules={[{ required: true, message: '请给出总体评分' }]}>
          <Rate />
        </Form.Item>
        <Form.Item label="描述准确" name="descriptionAccuracy" rules={[{ required: true, message: '请评分' }]}>
          <Rate />
        </Form.Item>
        <Form.Item label="沟通体验" name="communication" rules={[{ required: true, message: '请评分' }]}>
          <Rate />
        </Form.Item>
        <Form.Item label="守时程度" name="punctuality" rules={[{ required: true, message: '请评分' }]}>
          <Rate />
        </Form.Item>
        <Form.Item
          label="评论"
          name="comment"
          rules={[{ max: 200, message: '最多 200 字' }]}
        >
          <Input.TextArea rows={3} placeholder="与对方交易的真实感受（纯文本，平台会转义防 XSS）" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
