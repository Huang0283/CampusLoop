import { Button, Card, Space, Tag } from 'antd';
import { CheckCircleFilled, CalendarOutlined } from '@ant-design/icons';

/** 颜色常量（对齐设计图） */
const COLOR = {
  primary: '#2f6bff',
  pageBg: '#f5f6f8',
  cardBg: '#ffffff',
  textPrimary: '#1f2329',
  textSecondary: '#646a73',
  border: '#eef0f3',
  success: '#52c41a',
  priceRed: '#ff4d4f',
  tagOrangeBg: '#fff3e8',
  tagOrangeText: '#fa8c16',
};

interface TimelineItem {
  time: string;
  name: string;
  action: string;
  active?: boolean;
}

const timeline: TimelineItem[] = [
  { time: '2026-09-18 10:20', name: '林同学', action: '创建约定' },
  { time: '2026-09-18 11:05', name: '王同学', action: '修改交易地点' },
  { time: '2026-09-18 11:12', name: '林同学', action: '已确认', active: true },
];

export default function MeetupPage() {

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 64px)',
        background: COLOR.pageBg,
        padding: '28px 32px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 900,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          border: `1px solid ${COLOR.border}`,
        }}
        styles={{ body: { padding: 24 } }}
      >
        {/* ---------- 卡片头部 ---------- */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: COLOR.textPrimary,
            }}
          >
            见面约定
          </span>
          <Space size={6}>
            <CheckCircleFilled style={{ color: COLOR.success, fontSize: 16 }} />
            <span style={{ color: COLOR.success, fontSize: 14 }}>对方已确认</span>
          </Space>
        </div>

        {/* ---------- 商品信息卡片 ---------- */}
        <div
          style={{
            border: `1px solid ${COLOR.border}`,
            borderRadius: 10,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <img
            src="https://picsum.photos/seed/monitor/200/150"
            alt="商品图"
            style={{
              width: 100,
              height: 80,
              objectFit: 'cover',
              borderRadius: 8,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: COLOR.textPrimary,
                marginBottom: 6,
              }}
            >
              戴尔 27 英寸显示器
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLOR.priceRed }}>
              ¥899
            </div>
          </div>
          <Tag
            style={{
              background: COLOR.tagOrangeBg,
              color: COLOR.tagOrangeText,
              border: 'none',
              borderRadius: 6,
              padding: '4px 12px',
              fontSize: 13,
              margin: 0,
            }}
          >
            见面已安排
          </Tag>
        </div>

        {/* ---------- 表单区 ---------- */}
        <div style={{ marginBottom: 28 }}>
          {/* 约定时间 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 100,
                color: COLOR.textPrimary,
                fontSize: 14,
                position: 'relative',
              }}
            >
              <span style={{ color: COLOR.priceRed, marginRight: 4 }}>*</span>
              约定时间
            </div>
            <div
              style={{
                flex: 1,
                maxWidth: 460,
                height: 36,
                border: `1px solid ${COLOR.border}`,
                borderRadius: 8,
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#fff',
              }}
            >
              <span style={{ color: COLOR.textPrimary, fontSize: 14 }}>
                2026-09-20 14:00
              </span>
              <CalendarOutlined style={{ color: COLOR.textSecondary }} />
            </div>
          </div>

          {/* 交易地点 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: 100,
                color: COLOR.textPrimary,
                fontSize: 14,
                paddingTop: 8,
              }}
            >
              <span style={{ color: COLOR.priceRed, marginRight: 4 }}>*</span>
              交易地点
            </div>
            <div style={{ flex: 1, maxWidth: 720 }}>
              <div
                style={{
                  height: 36,
                  border: `1px solid ${COLOR.border}`,
                  borderRadius: 8,
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  background: '#fff',
                }}
              >
                <span style={{ color: COLOR.textPrimary, fontSize: 14 }}>
                  清华大学 紫荆宿舍楼下
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLOR.textSecondary,
                  marginTop: 6,
                }}
              >
                请提前 10 分钟到达
              </div>
            </div>
          </div>
        </div>

        {/* ---------- 修改记录 ---------- */}
        <div
          style={{
            borderTop: `1px solid ${COLOR.border}`,
            paddingTop: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: COLOR.textPrimary,
              marginBottom: 16,
            }}
          >
            修改记录
          </div>
          <div style={{ paddingLeft: 8 }}>
            {timeline.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  position: 'relative',
                  paddingBottom: idx === timeline.length - 1 ? 0 : 24,
                }}
              >
                {/* 圆点 */}
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: item.active ? COLOR.success : '#c9cdd4',
                    flexShrink: 0,
                    zIndex: 1,
                  }}
                />
                {/* 竖线 */}
                {idx !== timeline.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 4,
                      top: 10,
                      bottom: 0,
                      width: 1,
                      background: COLOR.border,
                    }}
                  />
                )}
                <span
                  style={{
                    color: COLOR.textSecondary,
                    fontSize: 13,
                    width: 160,
                  }}
                >
                  {item.time}
                </span>
                <span style={{ color: COLOR.textPrimary, fontSize: 13 }}>
                  {item.name} {item.action}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- 底部操作栏 ---------- */}
        <div
          style={{
            borderTop: `1px solid ${COLOR.border}`,
            paddingTop: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space size={8}>
            <CheckCircleFilled style={{ color: COLOR.success, fontSize: 16 }} />
            <span style={{ color: COLOR.textSecondary, fontSize: 13 }}>
              对方已确认该约定，请按时赴约
            </span>
          </Space>
          <Space>
            <Button
              style={{
                borderColor: COLOR.border,
                color: COLOR.textPrimary,
                borderRadius: 8,
              }}
            >
              修改约定
            </Button>
            <Button
              type="primary"
              style={{
                background: COLOR.primary,
                borderRadius: 8,
                paddingLeft: 24,
                paddingRight: 24,
              }}
            >
              双方确认
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}
