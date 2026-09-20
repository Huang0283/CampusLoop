import {
  Alert,
  Button,
  Col,
  Descriptions,
  Progress,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  LineChartOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '../../components'

const { Paragraph, Text, Title } = Typography

const factors = [
  { label: '品牌与型号', value: 88, note: '同型号近期有稳定样本' },
  { label: '成色与使用时间', value: 76, note: '轻微使用痕迹，配件齐全' },
  { label: '校园市场供需', value: 69, note: '同类商品供给适中' },
]

export default function PriceAdvicePage() {
  const navigate = useNavigate()

  return (
    <PageContainer
      title="价格建议"
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/publish')}>
          返回发布
        </Button>
      }
    >
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <Alert
          showIcon
          icon={<InfoCircleOutlined />}
          type="info"
          message="价格建议仅供参考"
          description="平台不会自动定价。最终售价由卖家决定，建议结合商品实际情况和线下验货结果调整。"
          style={{ marginBottom: 24 }}
        />

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={14}>
            <section
              style={{
                background: '#ffffff',
                border: '1px solid #e8e8e8',
                borderRadius: 8,
                padding: 28,
                height: '100%',
              }}
            >
              <Space align="start" size={16}>
                <LineChartOutlined style={{ color: '#1677ff', fontSize: 30 }} />
                <div>
                  <Text type="secondary">建议发布区间</Text>
                  <Title level={2} style={{ margin: '4px 0 8px' }}>
                    ¥780 - ¥960
                  </Title>
                  <Tag color="blue">推荐标价 ¥899</Tag>
                </div>
              </Space>

              <Descriptions
                column={1}
                size="small"
                style={{ marginTop: 28 }}
                items={[
                  { key: 'category', label: '品类', children: '数码电子 / 显示器' },
                  { key: 'condition', label: '成色', children: '轻微使用痕迹' },
                  { key: 'sample', label: '参考样本', children: '近 30 天同类商品 18 条' },
                  { key: 'updated', label: '更新时间', children: '2026-09-19 22:00' },
                ]}
              />
            </section>
          </Col>

          <Col xs={24} lg={10}>
            <section
              style={{
                background: '#ffffff',
                border: '1px solid #e8e8e8',
                borderRadius: 8,
                padding: 28,
                height: '100%',
              }}
            >
              <Title level={4} style={{ marginTop: 0 }}>影响因素</Title>
              <Space direction="vertical" size={18} style={{ width: '100%' }}>
                {factors.map((factor) => (
                  <div key={factor.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      <Text strong>{factor.label}</Text>
                      <Text type="secondary">{factor.value}/100</Text>
                    </div>
                    <Progress percent={factor.value} showInfo={false} size="small" />
                    <Text type="secondary" style={{ fontSize: 12 }}>{factor.note}</Text>
                  </div>
                ))}
              </Space>
            </section>
          </Col>
        </Row>

        <section style={{ marginTop: 24 }}>
          <Title level={4}>使用建议</Title>
          <Paragraph><CheckCircleOutlined style={{ color: '#389e0d' }} /> 在建议区间内根据实际成色调整标价。</Paragraph>
          <Paragraph><CheckCircleOutlined style={{ color: '#389e0d' }} /> 在商品描述中说明瑕疵、使用时间和配件情况。</Paragraph>
          <Paragraph><CheckCircleOutlined style={{ color: '#389e0d' }} /> 成交前线下验货，价格由买卖双方自行协商。</Paragraph>
        </section>
      </div>
    </PageContainer>
  )
}
