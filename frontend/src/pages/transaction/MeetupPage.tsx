import {
  Alert,
  Button,
  Card,
  Collapse,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
} from 'antd'
import { useState } from 'react'
import dayjs from 'dayjs'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState, PageContainer, useCan } from '../../components'
import { useMockDbStore } from '../../stores/mockDb'

const { Text } = Typography
const { Option } = Select

/** 校园公共地点候选（演示数据，接入后由后端/常量提供） */
const CAMPUS_LOCATIONS = [
  '东区图书馆正门',
  '南区食堂门口',
  '南门快递驿站旁',
  '教学楼 A 栋大厅',
  '学生活动中心一层',
]

interface MeetupFormValues {
  campusLocation: string
  /** DatePicker 产出 Dayjs；回填自 mock 时是 string */
  scheduledDate: string | dayjs.Dayjs
  /** TimeSlotSelect 产出 'HH:mm-HH:mm'；回填自 mock 时是二元组 */
  timeSlot: [string, string] | string
  note?: string
}

/**
 * 见面约定页：填写/修改时间地点 + 双方确认进度 + 历史版本。
 * 核心规则：修改 = version+1，双方旧确认失效，订单回到「待确认」。
 */
export default function MeetupPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  /** 订单来自可变 mockDb：保存/确认动作真实改变约定版本与订单状态 */
  const order = useMockDbStore((s) => s.orders.find((o) => o.id === Number(id)))
  const can = useCan()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  if (!order) return <EmptyState description="订单不存在" />
  const meetup = order.meetup
  /** 参与关系与确认权限均由 access 层求值，页面不写权限 if */
  const myRole = can.orderRole(order)
  const confirmDecision = can.meetupConfirm(order)

  /** 真实写库：版本 +1、旧确认失效、订单回待确认，均为 mockDb 状态机动作 */
  const handleSave = (values: MeetupFormValues) => {
    setSubmitting(true)
    const date =
      typeof values.scheduledDate === 'string'
        ? values.scheduledDate
        : values.scheduledDate.format('YYYY-MM-DD')
    const slot = Array.isArray(values.timeSlot) ? values.timeSlot : values.timeSlot.split('-')
    setTimeout(() => {
      useMockDbStore.getState().saveMeetup(order.id, {
        campusLocation: values.campusLocation,
        scheduledDate: date,
        timeSlotStart: slot[0],
        timeSlotEnd: slot[1],
        note: values.note,
      })
      setSubmitting(false)
      message.success(
        `见面约定已保存为第 ${(order.meetup?.version ?? 0) + 1} 版：双方旧确认已失效，需重新确认`
      )
      navigate(`/transactions/${order.id}`)
    }, 600)
  }

  const handleConfirm = () => {
    useMockDbStore.getState().confirmMeetup(order.id)
  }

  return (
    <PageContainer
      title="见面约定"
      extra={<Button onClick={() => navigate(`/transactions/${order.id}`)}>返回订单</Button>}
    >
      {(meetup?.version ?? 1) > 1 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`当前为第 ${meetup!.version} 版约定（此前约定被修改，旧确认已失效）`}
        />
      )}

      <Card title="当前约定" style={{ marginBottom: 16 }}>
        {meetup ? (
          <>
            <Descriptions
              column={2}
              items={[
                { key: 'loc', label: '地点', children: meetup.campusLocation },
                {
                  key: 'time',
                  label: '时间',
                  children: `${meetup.scheduledDate} ${meetup.timeSlotStart}-${meetup.timeSlotEnd}`,
                },
                { key: 'note', label: '备注', children: meetup.note ?? '-' },
                {
                  key: 'conf',
                  label: '确认进度',
                  children: `买家 ${meetup.buyerConfirmed ? '✅' : '⬜'} / 卖家 ${meetup.sellerConfirmed ? '✅' : '⬜'}`,
                },
              ]}
            />
            {/* 确认按钮按"我的视角"求值：
                原实现只看 buyerConfirmed，卖家视角也会看到买家的确认按钮（已修复） */}
            {confirmDecision.visibility === 'enabled' ? (
              <Button type="primary" style={{ marginTop: 16 }} onClick={handleConfirm}>
                我已确认此约定
              </Button>
            ) : (
              confirmDecision.reason && (
                <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
                  {confirmDecision.reason}
                </Text>
              )
            )}
          </>
        ) : (
          <Text type="secondary">尚未约定时间地点，请在下方填写并发起确认</Text>
        )}
      </Card>

      {/* 修改约定的表单仅订单参与方可见（非参与方只读） */}
      {myRole !== 'other' && (
      <Card title="填写 / 修改约定" style={{ marginBottom: 16 }}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="修改约定后版本号 +1，双方需要重新确认；频繁修改会被记入交易事件"
        />
        <Form
          form={form}
          layout="vertical"
          initialValues={
            meetup
              ? {
                  campusLocation: meetup.campusLocation,
                  // DatePicker 只接受 dayjs 对象，mock 里的字符串日期需先转换
                  scheduledDate: dayjs(meetup.scheduledDate),
                  timeSlot: [meetup.timeSlotStart, meetup.timeSlotEnd],
                  note: meetup.note,
                }
              : undefined
          }
          onFinish={handleSave}
        >
          <Space wrap size={16}>
            <Form.Item label="校园地点" name="campusLocation" rules={[{ required: true, message: '请选择地点' }]}>
              <Select style={{ width: 220 }} placeholder="选择校内公共地点">
                {CAMPUS_LOCATIONS.map((l) => (
                  <Option key={l} value={l}>{l}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="日期" name="scheduledDate" rules={[{ required: true, message: '请选择日期' }]}>
              <DatePicker style={{ width: 160 }} />
            </Form.Item>
            <Form.Item label="时间段" name="timeSlot" rules={[{ required: true, message: '请选择时间段' }]}>
              <TimeSlotSelect />
            </Form.Item>
          </Space>
          <Form.Item label="备注" name="note">
            <Input.TextArea rows={2} placeholder="如：带好充电器，现场验机" maxLength={100} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            保存并发起确认
          </Button>
        </Form>
      </Card>
      )}

      {meetup && (
        <Card title="历史版本（只读）">
          <Collapse
            items={[
              {
                key: 'v1',
                label: `第 1 版（已被修改替代）`,
                children: (
                  <Text type="secondary">
                    西门广场 · 2026-09-20 14:00-15:00 · 该版本双方确认已因修改失效
                  </Text>
                ),
              },
            ]}
          />
        </Card>
      )}
    </PageContainer>
  )
}

/** 时间段选择（原型简化为固定时段，接入后用 TimePicker.RangePicker） */
function TimeSlotSelect() {
  const slots = ['08:00-10:00', '10:00-12:00', '14:00-16:00', '16:00-18:00', '18:00-20:00']
  return (
    <Select style={{ width: 180 }} placeholder="选择时间段">
      {slots.map((s) => (
        <Option key={s} value={s}>{s}</Option>
      ))}
    </Select>
  )
}
