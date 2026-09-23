import React, { useEffect, useState } from 'react';
import {
  Alert,
  ConfigProvider,
  Empty,
  Layout,
  Input,
  Avatar,
  Breadcrumb,
  Button,
  Rate,
  Spin,
} from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  PayCircleOutlined,
  GoldOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  CheckCircleFilled,
  StarOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { AppSidebar, NotificationBell, UserMenu } from '../../components';
import { useNavigate, useParams } from 'react-router-dom';
import { getWanted } from '../../sdk/generated/sdk.gen';
import type { Wanted } from '../../sdk/generated/types.gen';

const { Header, Sider, Content } = Layout;

const PRIMARY = '#2f6bff';
const PAGE_BG = '#f5f6f8';
const CARD_BG = '#ffffff';
const TEXT_MAIN = '#1f2329';
const TEXT_SECONDARY = '#646a73';
const PRICE_RED = '#ff4d4f';
const BORDER = '#eef0f3';

/** 蓝色学士帽 Logo（自定义 SVG，antd 无此图标） */

/** 匹配商品属于独立接口，暂时保留原有展示内容。 */
const matchedProducts = [
  {
    id: 1,
    title: '戴尔 27 英寸显示器',
    price: 899,
    condition: '9成新',
    matchRate: 96,
    image: 'https://picsum.photos/seed/monitor-dell/400/300',
  },
  {
    id: 2,
    title: '明基 24 英寸显示器',
    price: 850,
    condition: '9成新',
    matchRate: 94,
    image: 'https://picsum.photos/seed/monitor-benq/400/300',
  },
  {
    id: 3,
    title: 'AOC 办公显示器',
    price: 800,
    condition: '9成新',
    matchRate: 92,
    image: 'https://picsum.photos/seed/monitor-aoc/400/300',
  },
  {
    id: 4,
    title: '便携显示器',
    price: 1000,
    condition: '9成新',
    matchRate: 88,
    image: 'https://picsum.photos/seed/monitor-portable/400/300',
  },
];

const cardStyle: React.CSSProperties = {
  backgroundColor: CARD_BG,
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(31, 35, 41, 0.04)',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: TEXT_MAIN,
  margin: 0,
};

const statusDisplay: Record<Wanted['status'], { text: string; bg: string; color: string }> = {
  OPEN: { text: '求购中', bg: '#f0fbf4', color: '#00a870' },
  MATCHED: { text: '已匹配', bg: '#eaf2ff', color: PRIMARY },
  CLOSED: { text: '已关闭', bg: '#f5f5f5', color: TEXT_SECONDARY },
  EXPIRED: { text: '已过期', bg: '#fff1f0', color: '#ff4d4f' },
};

// 将接口中的 ISO 时间转换为页面展示所需的日期格式。
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('zh-CN');
};

const WantedDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: wantedId } = useParams<{ id: string }>();
  const parsedWantedId = Number(wantedId);
  const hasValidWantedId =
    Boolean(wantedId) && Number.isInteger(parsedWantedId) && parsedWantedId > 0;
  const [wanted, setWanted] = useState<Wanted | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // 路由参数无效时不发起请求，并交由页面展示空状态。
    if (!hasValidWantedId) return;

    // 根据路由中的求购 ID 获取真实详情数据。
    const fetchWanted = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getWanted({
          path: { wantedId: parsedWantedId },
          throwOnError: true,
        });

        if (!cancelled) setWanted(response.data);
      } catch (requestError) {
        if (!cancelled) {
          setWanted(null);
          // 接口明确返回资源不存在时展示空状态，其余异常展示错误状态。
          const isNotFound =
            typeof requestError === 'object' &&
            requestError !== null &&
            'code' in requestError &&
            requestError.code === 'NOT_FOUND';
          setError(isNotFound ? null : '求购详情加载失败，请稍后重试');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchWanted();

    // 组件卸载或路由切换后忽略旧请求结果。
    return () => {
      cancelled = true;
    };
  }, [hasValidWantedId, parsedWantedId]);

  const wantedInfo = wanted
    ? {
        title: wanted.title,
        tags: [statusDisplay[wanted.status]],
        publishTime: formatDate(wanted.createdAt),
        expireTime: formatDate(wanted.expireAt),
        description: wanted.description || '暂无需求描述',
        conditions: [
          {
            icon: <PayCircleOutlined />,
            label: '预算范围',
            value: `¥ ${wanted.budgetMin} - ¥ ${wanted.budgetMax}`,
          },
          { icon: <GoldOutlined />, label: '最低成色', value: wanted.condition },
          { icon: <EnvironmentOutlined />, label: '地点', value: wanted.location },
          { icon: <AppstoreOutlined />, label: '状态', value: statusDisplay[wanted.status].text },
        ],
      }
    : null;

  const publisher = wanted
    ? {
        name: wanted.owner.nickname,
        avatar: wanted.owner.avatar,
        credit: wanted.owner.rating === undefined ? '暂无评分' : '信誉良好',
        tradeCount: wanted.owner.transactionCount ?? 0,
        rating: wanted.owner.rating ?? 0,
      }
    : null;

  const handleFavorite = () => console.log('收藏');
  const handleContact = () => console.log('联系发布者');
  const handleReport = () => console.log('举报');
  const handleViewAllMatches = () => {
    if (wantedId) navigate(`/wanted/${wantedId}/matches`);
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: PRIMARY,
          colorText: TEXT_MAIN,
          colorTextSecondary: TEXT_SECONDARY,
          colorBorder: BORDER,
          colorBorderSecondary: BORDER,
          borderRadius: 6,
          fontSize: 14,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        },
        components: {
          Layout: {
            headerBg: CARD_BG,
            siderBg: CARD_BG,
            bodyBg: PAGE_BG,
            headerHeight: 64,
            headerPadding: '0 24px',
          },
          Menu: {
            itemBg: 'transparent',
            itemSelectedBg: '#eaf2ff',
            itemSelectedColor: PRIMARY,
            itemColor: TEXT_MAIN,
            itemHoverColor: PRIMARY,
            itemBorderRadius: 8,
          },
          Button: {
            borderRadius: 6,
          },
          Rate: {
            starSize: 16,
          },
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', marginLeft: 220 }}>
        {/* 顶部导航栏 */}
        <Header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${BORDER}`,
            padding: '0 32px',
          }}
        >
          {/* Logo 已统一到左侧栏 AppSidebar，这里仅保留占位以维持顶栏布局 */}
          <div style={{ width: 220 }} />

          {/* 中间搜索框 */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Input
              prefix={<SearchOutlined style={{ color: TEXT_SECONDARY, fontSize: 16 }} />}
              placeholder="搜索校园好物"
              style={{
                maxWidth: 720,
                height: 44,
                borderRadius: 8,
                backgroundColor: '#f5f6f8',
                border: '1px solid transparent',
              }}
            />
          </div>

          {/* 右侧用户区 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
            <NotificationBell />
            <UserMenu />
          </div>
        </Header>

        <Layout>
          {/* 左侧侧边栏 */}
          <Sider
            width={220}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              background: '#ffffff',
              borderRight: '1px solid #f0f0f0',
              overflow: 'auto',
              zIndex: 120,
            }}
          >
            <AppSidebar />
          </Sider>

          {/* 主内容区 */}
          <Content style={{ backgroundColor: PAGE_BG, padding: '20px 32px 96px' }}>
            <div style={{ maxWidth: 1280, margin: '0 auto' }}>
              {/* 面包屑 */}
              <Breadcrumb
                style={{ marginBottom: 16, fontSize: 14 }}
                items={[{ title: '首页' }, { title: '求购市场' }, { title: '求购详情' }]}
              />

              {!hasValidWantedId ? (
                <div style={{ ...cardStyle, padding: 48 }}>
                  <Empty description="未找到该求购信息" />
                </div>
              ) : loading ? (
                <div style={{ ...cardStyle, padding: 48, textAlign: 'center' }}>
                  <Spin tip="正在加载求购详情..." />
                </div>
              ) : error ? (
                <Alert type="error" showIcon message={error} />
              ) : !wantedInfo || !publisher ? (
                <div style={{ ...cardStyle, padding: 48 }}>
                  <Empty description="未找到该求购信息" />
                </div>
              ) : (
                <>
                  {/* 左右两栏 */}
              <div
                style={{
                  display: 'flex',
                  gap: 20,
                  alignItems: 'stretch',
                  marginBottom: 20,
                }}
              >
                {/* 左栏：求购信息卡片 */}
                <div style={{ ...cardStyle, flex: 1, padding: '28px 32px' }}>
                  {/* 标题行 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <h1
                      style={{
                        margin: 0,
                        fontSize: 22,
                        fontWeight: 700,
                        color: TEXT_MAIN,
                      }}
                    >
                      {wantedInfo.title}
                    </h1>
                    {wantedInfo.tags.map((tag) => (
                      <span
                        key={tag.text}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: 22,
                          padding: '0 10px',
                          borderRadius: 4,
                          fontSize: 13,
                          backgroundColor: tag.bg,
                          color: tag.color,
                        }}
                      >
                        {tag.text}
                      </span>
                    ))}
                  </div>

                  {/* 副信息行 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 28,
                      marginTop: 12,
                      color: TEXT_SECONDARY,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <ClockCircleOutlined />
                      发布于 {wantedInfo.publishTime}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <CalendarOutlined />
                      有效期至 {wantedInfo.expireTime}
                    </span>
                  </div>

                  {/* 需求描述 */}
                  <h3 style={{ ...sectionTitleStyle, marginTop: 24, marginBottom: 12 }}>需求描述</h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.9,
                      color: TEXT_SECONDARY,
                    }}
                  >
                    {wantedInfo.description}
                  </p>

                  {/* 需求条件 */}
                  <h3 style={{ ...sectionTitleStyle, marginTop: 28, marginBottom: 14 }}>需求条件</h3>
                  <div style={{ display: 'flex', gap: 14 }}>
                    {wantedInfo.conditions.map((item) => (
                      <div
                        key={item.label}
                        style={{
                          flex: 1,
                          backgroundColor: '#f7f8fa',
                          borderRadius: 8,
                          padding: '14px 16px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            color: TEXT_SECONDARY,
                            fontSize: 13,
                            marginBottom: 8,
                          }}
                        >
                          <span style={{ fontSize: 16, color: TEXT_MAIN }}>{item.icon}</span>
                          {item.label}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_MAIN }}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 右栏：发布者卡片 */}
                <div
                  style={{
                    ...cardStyle,
                    width: 300,
                    flexShrink: 0,
                    padding: '28px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Avatar
                      size={72}
                      src={publisher.avatar}
                      icon={<UserOutlined />}
                      style={{ backgroundColor: '#dbe7ff', color: PRIMARY }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: TEXT_MAIN,
                          marginBottom: 8,
                        }}
                      >
                        {publisher.name}
                      </div>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          height: 24,
                          padding: '0 10px',
                          borderRadius: 12,
                          fontSize: 13,
                          backgroundColor: '#f0fbf4',
                          color: '#00a870',
                        }}
                      >
                        <CheckCircleFilled />
                        {publisher.credit}
                      </span>
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${BORDER}`, margin: '20px 0' }} />

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: TEXT_SECONDARY, marginBottom: 6 }}>交易次数</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: TEXT_MAIN }}>
                      {publisher.tradeCount} 次
                    </div>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, color: TEXT_SECONDARY, marginBottom: 8 }}>评分</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Rate
                        value={publisher.rating}
                        disabled
                        character={<StarOutlined />}
                        style={{ color: '#fadb14', fontSize: 16 }}
                      />
                      <span style={{ fontSize: 16, fontWeight: 600, color: TEXT_MAIN }}>
                        {publisher.rating}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    icon={<MessageOutlined />}
                    style={{ marginTop: 'auto', width: '100%' }}
                    onClick={handleContact}
                  >
                    联系发布者
                  </Button>
                </div>
              </div>

              {/* AI 智能匹配商品区 */}
              <div style={{ ...cardStyle, padding: '24px 32px 32px' }}>
                {/* 标题行 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        backgroundColor: '#eaf2ff',
                        color: PRIMARY,
                        fontSize: 17,
                      }}
                    >
                      <RobotOutlined />
                    </span>
                    <span style={{ fontSize: 17, fontWeight: 700, color: TEXT_MAIN }}>
                      AI 智能匹配商品
                    </span>
                    <span style={{ fontSize: 13, color: TEXT_SECONDARY }}>
                      根据您的需求，智能推荐以下相似商品
                    </span>
                  </div>
                  <Button
                    type="link"
                    style={{ fontSize: 14, padding: 0 }}
                    onClick={handleViewAllMatches}
                  >
                    查看全部匹配结果 →
                  </Button>
                </div>

                {/* 商品卡片 */}
                <div style={{ display: 'flex', gap: 16 }}>
                  {matchedProducts.map((product) => (
                    <div
                      key={product.id}
                      style={{
                        flex: 1,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 10,
                        overflow: 'hidden',
                        backgroundColor: CARD_BG,
                        cursor: 'pointer',
                      }}
                    >
                      <img
                        src={product.image}
                        alt={product.title}
                        style={{
                          width: '100%',
                          aspectRatio: '4 / 3',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                      <div style={{ padding: '12px 14px 0' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: TEXT_MAIN,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {product.title}
                          </span>
                          <span
                            style={{
                              flexShrink: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              height: 20,
                              padding: '0 8px',
                              borderRadius: 4,
                              fontSize: 12,
                              backgroundColor: '#f0fbf4',
                              color: '#00a870',
                            }}
                          >
                            {product.condition}
                          </span>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: PRICE_RED, marginBottom: 10 }}>
                          ¥{product.price}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          margin: '0 14px 12px',
                          padding: '6px 10px',
                          borderRadius: 6,
                          backgroundColor: '#eaf2ff',
                          color: PRIMARY,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        <ThunderboltOutlined />
                        匹配度 {product.matchRate}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
                </>
              )}
            </div>
          </Content>
        </Layout>

        {/* 底部操作栏 */}
        {hasValidWantedId && !loading && !error && wanted && <div
          style={{
            position: 'fixed',
            left: 220,
            right: 0,
            bottom: 0,
            zIndex: 90,
            backgroundColor: CARD_BG,
            borderTop: `1px solid ${BORDER}`,
            boxShadow: '0 -2px 8px rgba(31, 35, 41, 0.04)',
          }}
        >
          <div
            style={{
              maxWidth: 1280,
              margin: '0 auto',
              padding: '14px 32px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 16,
            }}
          >
            <Button size="large" icon={<StarOutlined />} onClick={handleFavorite}>
              收藏
            </Button>
            <Button type="primary" size="large" icon={<MessageOutlined />} onClick={handleContact}>
              联系发布者
            </Button>
            <Button size="large" icon={<ExclamationCircleOutlined />} onClick={handleReport}>
              举报
            </Button>
          </div>
        </div>}
      </Layout>
    </ConfigProvider>
  );
};

export default WantedDetailPage;
