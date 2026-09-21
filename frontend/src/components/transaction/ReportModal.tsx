import { Form, Input, Modal, Select, Upload, message } from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
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
  onSubmit?: (values: { reason: ReportReason; description?: string; evidence: string[] }) => void
}

/** 证据图片上限（与 /report 旧页面、上传提示保持一致） */
const MAX_EVIDENCE = 6

/**
 * 统一举报入口：用户 / 商品 / 交易 / 聊天 都从这走（任务 #8）。
 * 举报处理结果通过通知中心 REPORT_RESULT 类型回传，前端只读展示。
 *
 * 证据上传：原型阶段只校验格式与数量并记录文件名（不真实上传），
 * 接接口后把 beforeUpload 的 return false 换成真实上传并记录返回的 URL。
 */
export default function ReportModal({ open, targetType, targetId, targetLabel, onClose, onSubmit }: ReportModalProps) {
  const [form] = Form.useForm()

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    accept: '.jpg,.jpeg,.png',
    beforeUpload: (file) => {
      const isImage = file.type === 'image/jpeg' || file.type === 'image/png'
      if (!isImage) {
        message.error('只支持 JPG、PNG 格式的图片')
      }
      return false // 原型：阻止真实上传
    },
  }

  const handleOk = () => {
    form
      .validateFields()
      .then((values: { reason: ReportReason; description?: string; evidence?: UploadFile[] }) => {
        const evidence = (values.evidence ?? []).map((file) => file.name)
        onSubmit?.({ reason: values.reason, description: values.description, evidence })
        message.success('举报已提交，管理员会在 48 小时内处理，结果将在通知中心告知')
        form.resetFields()
        onClose()
      })
      .catch(() => {
        /* 校验失败：antd 已在表单项上给出提示 */
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
      width={560}
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
        <Form.Item
          label="证据上传"
          name="evidence"
          valuePropName="fileList"
          getValueFromEvent={(e: unknown) => (Array.isArray(e) ? e : (e as { fileList?: UploadFile[] })?.fileList)}
          rules={[{ required: true, message: '请上传证据图片' }]}
          extra="最多上传 6 张图片，支持 JPG、PNG"
          style={{ marginBottom: 8 }}
        >
          <Upload.Dragger {...uploadProps} maxCount={MAX_EVIDENCE} listType="picture">
            <p style={{ margin: '8px 0 0' }}>
              <PlusOutlined style={{ fontSize: 32, color: '#646a73' }} />
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 15, color: '#1f2329' }}>点击或拖拽上传图片</p>
          </Upload.Dragger>
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
