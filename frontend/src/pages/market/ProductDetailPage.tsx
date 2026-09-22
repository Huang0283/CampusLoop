import React, { useState } from 'react';
import {
  Layout,
  Input,
  Avatar,
  Breadcrumb,
  Button,
  Row,
  Col,
  Tooltip,
  Divider,
} from 'antd';
import {
  SearchOutlined,
  LeftOutlined,
  RightOutlined,
  HeartOutlined,
  HeartFilled,
  MessageFilled,
  FileTextOutlined,
  EnvironmentOutlined,
  LaptopOutlined,
  DesktopOutlined,
  ThunderboltOutlined,
  BgColorsOutlined,
  HddOutlined,
  FileProtectOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  FlagOutlined,
} from '@ant-design/icons';
import { AppSidebar, NotificationBell, UserMenu } from '../../components';
import { ReportModal } from '../../components/transaction';
import { useMockDbStore } from '../../stores/mockDb';
import { useRequireAuthAction } from '../../hooks/useRequireAuthAction';
import { useNavigate } from 'react-router-dom';
import type { ReportTargetType } from '../../types/transaction';

const { Header, Sider, Content } = Layout;

const PRIMARY = '#2f6bff';
const GREEN = '#23a26d';
const TEXT_PRIMARY = '#1f2329';
const TEXT_SECONDARY = '#646a73';

/** ---------------- mock 数据 ---------------- */
const mockImages = [
  'https://picsum.photos/seed/campus-macbook-1/900/620',
  'https://picsum.photos/seed/campus-macbook-2/900/620',
  'https://picsum.photos/seed/campus-macbook-3/900/620',
  'https://picsum.photos/seed/campus-macbook-4/900/620',
];

const product = {
  id: 101,
  title: 'MacBook Air M1 笔记本电脑',
  price: 3200,
  condition: '九成新',
  originalPrice: 7999,
  seller: {
    id: 2,
    name: '李同学',
    avatar: 'https://picsum.photos/seed/campus-seller/96/96',
    school: '清华大学',
    verified: true,
    reply: '回复较快',
  },
  description: [
    '个人自用 MacBook Air M1，平时主要用于学习，保养良好，功能一切正常。',
    '几乎无明显划痕，电池健康度 92%。',
    '原装充电器、数据线齐全，支持当面验机。',
    '因毕业换电脑，现低价转让，欢迎同学联系！',
  ],
  location: {
    image: 'https://picsum.photos/seed/campus-tsinghua/200/140',
    school: '清华大学',
    address: '北京市海淀区清华大学',
    note: '可在校内当面交易，支持验机',
  },
};

interface SpecItem {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const specs: SpecItem[] = [
  { icon: <LaptopOutlined />, label: '品牌', value: 'Apple' },
  { icon: <DesktopOutlined />, label: '屏幕尺寸', value: '13.3 英寸' },
  { icon: <ThunderboltOutlined />, label: '芯片', value: 'Apple M1' },
  { icon: <BgColorsOutlined />, label: '颜色', value: '深空灰' },
  { icon: <HddOutlined />, label: '存储', value: '8GB + 256GB' },
  { icon: <FileProtectOutlined />, label: '成色', value: '九成新' },
];


const breadcrumbItems = [
  {
    title: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: TEXT_SECONDARY }}>
        <LeftOutlined style={{ fontSize: 12 }} />
        返回市场
      </span>
    ),
  },
  { title: <span style={{ color: TEXT_SECONDARY }}>电脑数码</span> },
  { title: <span style={{ color: TEXT_PRIMARY }}>笔记本电脑</span> },
];

/** 参数项图标底色块 */
const specIconStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  background: '#f2f4f8',
  color: '#8a9099',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  flexShrink: 0,
};

/** 白色圆角卡片通用样式 */
const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: '20px 24px',
};

const ProductDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const requireAuth = useRequireAuthAction();
  const [currentImg, setCurrentImg] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: ReportTargetType;
    id: number;
    label: string;
  } | null>(null);

  const prevImage = () => {
    setCurrentImg((prev) => (prev - 1 + mockImages.length) % mockImages.length);
  };
  const nextImage = () => {
    setCurrentImg((prev) => (prev + 1) % mockImages.length);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f6f8' }}>
      {/* 顶部导航栏 */}
      <Header
        style={{
          position: 'fixed',
          top: 0,
          left: 220,
          right: 0,
          zIndex: 100,
          height: 64,
          padding: '0 32px',
          background: '#fff',
          borderBottom: '1px solid #eef0f3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          lineHeight: 'normal',
        }}
      >
        {/* Logo 已统一到左侧栏 AppSidebar，这里仅保留占位以维持顶栏布局 */}
        <div style={{ width: 220 }} />

        <Input
          prefix={<SearchOutlined style={{ color: '#9aa0a8' }} />}
          placeholder="搜索校园好物"
          style={{
            width: 460,
            height: 40,
            borderRadius: 20,
            background: '#f5f6f8',
            border: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <NotificationBell />
          <UserMenu />
        </div>
      </Header>

      {/* 左侧侧边栏 */}
      <Sider
        width={220}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 120,
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          overflow: 'auto',
        }}
      >
        <AppSidebar />
      </Sider>

      {/* 主内容区 */}
      <Layout style={{ marginLeft: 220, marginTop: 64, background: '#f5f6f8' }}>
        <Content style={{ padding: '20px 32px 48px' }}>
          {/* 面包屑 */}
          <Breadcrumb
            items={breadcrumbItems}
            separator={<span style={{ color: '#c3c8cf' }}>/</span>}
            style={{ marginBottom: 16, fontSize: 14 }}
          />

          <Row gutter={24} align="top">
            {/* 左栏 */}
            <Col xs={24} lg={14} xl={15}>
              {/* 大图展示 */}
              <div
                style={{
                  position: 'relative',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#fff',
                }}
              >
                <img
                  src={mockImages[currentImg]}
                  alt={product.title}
                  style={{
                    display: 'block',
                    width: '100%',
                    height: 460,
                    objectFit: 'cover',
                  }}
                />
                {/* 左箭头 */}
                <Button
                  type="text"
                  shape="circle"
                  icon={<LeftOutlined style={{ color: '#fff', fontSize: 15 }} />}
                  onClick={prevImage}
                  style={{
                    position: 'absolute',
                    left: 20,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 40,
                    height: 40,
                    background: 'rgba(0,0,0,0.35)',
                  }}
                />
                {/* 右箭头 */}
                <Button
                  type="text"
                  shape="circle"
                  icon={<RightOutlined style={{ color: '#fff', fontSize: 15 }} />}
                  onClick={nextImage}
                  style={{
                    position: 'absolute',
                    right: 20,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 40,
                    height: 40,
                    background: 'rgba(0,0,0,0.35)',
                  }}
                />
                {/* 图片计数 */}
                <span
                  style={{
                    position: 'absolute',
                    right: 16,
                    bottom: 14,
                    background: 'rgba(0,0,0,0.45)',
                    color: '#fff',
                    fontSize: 13,
                    borderRadius: 12,
                    padding: '2px 12px',
                  }}
                >
                  {`${currentImg + 1} / ${mockImages.length}`}
                </span>
              </div>

              {/* 缩略图列表 */}
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  marginTop: 14,
                  overflowX: 'auto',
                  paddingBottom: 4,
                }}
              >
                {mockImages.map((img, index) => {
                  const active = index === currentImg;
                  return (
                    <img
                      key={img}
                      src={img}
                      alt={`缩略图 ${index + 1}`}
                      onClick={() => setCurrentImg(index)}
                      style={{
                        width: 128,
                        height: 88,
                        objectFit: 'cover',
                        borderRadius: 8,
                        cursor: 'pointer',
                        flexShrink: 0,
                        border: active
                          ? `2px solid ${PRIMARY}`
                          : '2px solid transparent',
                        boxSizing: 'border-box',
                      }}
                    />
                  );
                })}
              </div>

              {/* 商品描述卡片 */}
              <div style={{ ...cardStyle, marginTop: 20 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  <FileTextOutlined style={{ color: PRIMARY, fontSize: 17 }} />
                  <span style={{ fontSize: 16, fontWeight: 600, color: TEXT_PRIMARY }}>
                    商品描述
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: TEXT_PRIMARY,
                    lineHeight: 2,
                  }}
                >
                  {product.description.map((line) => (
                    <p key={line} style={{ margin: 0 }}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </Col>

            {/* 右栏 */}
            <Col xs={24} lg={10} xl={9}>
              {/* 商品标题 */}
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: TEXT_PRIMARY,
                  margin: '4px 0 12px',
                  lineHeight: 1.4,
                }}
              >
                {product.title}
              </h1>

              {/* 价格区 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ color: PRIMARY, fontWeight: 700, fontSize: 32 }}>
                  ¥ {product.price}
                </span>
                <span
                  style={{
                    background: '#e9f8f0',
                    color: GREEN,
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 6,
                    padding: '3px 10px',
                  }}
                >
                  {product.condition}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: '#9aa0a8',
                  marginTop: 6,
                }}
              >
                原价{' '}
                <span style={{ textDecoration: 'line-through' }}>
                  ¥ {product.originalPrice}
                </span>
              </div>

              <Divider style={{ margin: '20px 0' }} />

              {/* 参数区 */}
              <Row gutter={[24, 22]}>
                {specs.map((spec) => (
                  <Col span={12} key={spec.label}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={specIconStyle}>{spec.icon}</span>
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            color: TEXT_SECONDARY,
                            marginBottom: 2,
                          }}
                        >
                          {spec.label}
                        </div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: TEXT_PRIMARY,
                          }}
                        >
                          {spec.value}
                        </div>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>

              {/* 卖家卡片 */}
              <div style={{ ...cardStyle, marginTop: 24, padding: '18px 20px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                  }}
                >
                  <Avatar size={52} src={product.seller.avatar} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: TEXT_PRIMARY,
                        }}
                      >
                        {product.seller.name}
                      </span>
                      {product.seller.verified && (
                        <Tooltip title="已认证">
                          <CheckCircleFilled
                            style={{ color: PRIMARY, fontSize: 16 }}
                          />
                        </Tooltip>
                      )}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        fontSize: 13,
                        color: TEXT_SECONDARY,
                      }}
                    >
                      <span>
                        {product.seller.school} · 已认证
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <ClockCircleOutlined style={{ fontSize: 13 }} />
                        {product.seller.reply}
                      </span>
                    </div>
                  </div>
                  <RightOutlined style={{ color: '#c3c8cf', fontSize: 13 }} />
                </div>

                <Row gutter={12} style={{ marginTop: 18 }}>
                  <Col span={12}>
                    <Button
                      block
                      size="large"
                      icon={
                        favorite ? (
                          <HeartFilled style={{ color: '#ff4d4f' }} />
                        ) : (
                          <HeartOutlined />
                        )
                      }
                      onClick={() => {
                        if (requireAuth()) setFavorite(!favorite);
                      }}
                      style={{
                        borderRadius: 8,
                        fontSize: 15,
                        height: 46,
                      }}
                    >
                      收藏
                    </Button>
                  </Col>
                  <Col span={12}>
                    <Button
                      block
                      type="primary"
                      size="large"
                      icon={<MessageFilled />}
                      style={{
                        borderRadius: 8,
                        fontSize: 15,
                        height: 46,
                        background: PRIMARY,
                        boxShadow: 'none',
                      }}
                      onClick={() => {
                        if (requireAuth()) {
                          navigate('/chat');
                        }
                      }}
                    >
                      联系卖家
                    </Button>
                  </Col>
                </Row>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 4,
                    marginTop: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<FlagOutlined />}
                    onClick={() => {
                      if (requireAuth()) {
                        setReportTarget({ type: 'PRODUCT', id: product.id, label: product.title });
                      }
                    }}
                  >
                    举报商品
                  </Button>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<FlagOutlined />}
                    onClick={() => {
                      if (requireAuth()) {
                        setReportTarget({
                          type: 'USER',
                          id: product.seller.id,
                          label: product.seller.name,
                        });
                      }
                    }}
                  >
                    举报卖家
                  </Button>
                </div>
              </div>

              {/* 交易地点卡片 */}
              <div style={{ ...cardStyle, marginTop: 20, padding: '18px 20px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  <EnvironmentOutlined style={{ color: PRIMARY, fontSize: 17 }} />
                  <span style={{ fontSize: 16, fontWeight: 600, color: TEXT_PRIMARY }}>
                    交易地点
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 14 }}>
                  <img
                    src={product.location.image}
                    alt={product.location.school}
                    style={{
                      width: 120,
                      height: 84,
                      objectFit: 'cover',
                      borderRadius: 8,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: TEXT_PRIMARY,
                        marginBottom: 6,
                      }}
                    >
                      {product.location.school}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 13,
                        color: TEXT_SECONDARY,
                        marginBottom: 6,
                      }}
                    >
                      <EnvironmentOutlined style={{ fontSize: 12 }} />
                      <span>{product.location.address}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#9aa0a8' }}>
                      {product.location.note}
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Content>
      </Layout>
      <ReportModal
        open={reportTarget !== null}
        targetType={reportTarget?.type ?? 'PRODUCT'}
        targetId={reportTarget?.id ?? product.id}
        targetLabel={reportTarget?.label}
        onClose={() => setReportTarget(null)}
        onSubmit={(values) => {
          if (!reportTarget) return;
          useMockDbStore.getState().submitReport({
            targetType: reportTarget.type,
            targetId: reportTarget.id,
            ...values,
          });
        }}
      />
    </Layout>
  );
};

export default ProductDetailPage;
