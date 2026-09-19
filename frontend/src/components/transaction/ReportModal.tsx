import { Form, Input, Modal, Select, message } from 'antd'
import { REPORT_REASONS, REPORT_TARGET_LABELS } from '../../constants/report'
import type { ReportReason, ReportTargetType } from '../../types/transaction'

interface ReportModalProps {
  open: boolean
  /** 举报目标类型与 ID：用户 / 商品 / 订单 / 聊天消息 */
  targetType: ReportTargetType
  targetId: number
  targetLabel?: string
  onClose: () => void
  /** 提交回调：原型阶段写入 mockDb，接接口后换成 HTTP 调用 */
  onSubmit?: (values: { reason: ReportReason; description?: string }) => void
}

/**
 * 统一举报入口：用户 / 商品 / 交易 / 聊天 都从这走（任务 #8）。
 * 举报处理结果通过通知中心 REPORT_RESULT 类型回传，前端只读展示。
 */
export default function ReportModal({ open, targetType, targetId, targetLabel, onClose, onSubmit }: ReportModalProps) {
  const [form] = Form.useForm()

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSubmit?.(values)
      message.success('举报已提交，管理员会在 48 小时内处理，结果将在通知中心告知')
      form.resetFields()
      onClose()
    })
  }

  return (
    <Modal
      title={`举报 · ${REPORT_TARGET_LABELS[targetType]}${targetLabel ? `（${targetLabel}）` : ` #${targetId}`}`}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="提交举报"
      cancelText="取消"
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item label="举报原因" name="reason" rules={[{ required: true, message: '请选择举报原因' }]}>
          <Select placeholder="请选择原因" options={REPORT_REASONS.map((r: ReportReason) => ({ value: r, label: REPORT_REASONS_LABEL_MAP[r] }))} />
        </Form.Item>
        <Form.Item
          label="补充说明"
          name="description"
          rules={[{ max: 300, message: '最多 300 字' }]}
        >
          <Input.TextArea rows={3} placeholder="描述具体情况；聊天举报将自动附带相关消息证据（管理员访问会记录审计）" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

const REPORT_REASONS_LABEL_MAP: Record<ReportReason, string> = {
  FAKE_PRODUCT: '虚假商品',
  DESCRIPTION_MISMATCH: '描述不符',
  SPAM: '垃圾信息',
  ABNORMAL_PRICE: '异常价格',
  HARASSMENT: '骚扰',
  VIOLATION: '违规商品',
}
