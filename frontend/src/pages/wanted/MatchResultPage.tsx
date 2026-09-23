import React, { useEffect, useState } from 'react';
import {
  Alert,
  Empty,
  Layout,
  Input,
  Avatar,
  Space,
  Button,
  Select,
  Tag,
  Progress,
  Pagination,
  Spin,
} from 'antd';
import {
  AimOutlined,
  SearchOutlined,
  RobotOutlined,
  BarChartOutlined,
  EditOutlined,
  MoneyCollectOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CheckCircleFilled,
  LineChartOutlined,
} from '@ant-design/icons';
import { AppSidebar, NotificationBell, UserMenu } from '../../components';
import { getWanted, listWantedMatches } from '../../sdk/generated/sdk.gen';
import type { Wanted } from '../../sdk/generated/types.gen';
import { useParams } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

interface MatchItem {
  id: number;
  title: string;
  image: string;
  tags: string[];
  seller: { name: string; avatar: string };
  school: string;
  publishTime: string;
  matchScore: number;
  price: number;
  originalPrice: string;
  reasons: string[];
}

// -------------------- 样式 --------------------
const PRIMARY = '#1677ff';
const BG = '#f5f5f5';
const CARD_BG = '#ffffff';
const TEXT_MAIN = '#222222';
const TEXT_SUB = '#666666';
const BORDER = '#e5e5e5';

const styles: Record<string, React.CSSProperties> = {
  layout: { minHeight: '100vh', background: BG, marginLeft: 220 },
  header: {
    background: CARD_BG,
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `1px solid ${BORDER}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
    height: 64,
    lineHeight: '64px',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 20, fontWeight: 700, color: TEXT_MAIN },
  headerSearch: { width: 420, maxWidth: '40vw' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 20 },
  sider: {
    background: CARD_BG,
    borderRight: `1px solid ${BORDER}`,
    paddingTop: 16,
  },
  content: { padding: '24px 32px 48px', background: BG },
  aiCard: {
    background: CARD_BG,
    borderRadius: 12,
    border: `1px solid ${BORDER}`,
    padding: '20px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  aiLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  aiRight: { display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' },
  conditionBar: {
    background: '#fafafa',
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  itemCard: {
    background: CARD_BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    gap: 20,
    marginBottom: 16,
  },
  itemImage: { width: 140, height: 120, objectFit: 'cover', borderRadius: 8, flexShrink: 0 },
  infoArea: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 },
  itemTitle: { fontSize: 18, fontWeight: 600, color: TEXT_MAIN, margin: 0 },
  sellerRow: { display: 'flex', alignItems: 'center', gap: 8, color: TEXT_SUB, fontSize: 13, flexWrap: 'wrap' },
  matchArea: {
    width: 240,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    borderLeft: `1px dashed ${BORDER}`,
    borderRight: `1px dashed ${BORDER}`,
    padding: '0 20px',
  },
  priceArea: { width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 },
  actionArea: { width: 120, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' },
};

// 将接口时间转换为页面展示所需的中文日期格式。
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('zh-CN');
};

// -------------------- 页面组件 --------------------
const MatchResultPage: React.FC = () => {
  const { wantedId } = useParams<{ wantedId: string }>();
  const parsedWantedId = Number(wantedId);
  const hasValidWantedId =
    Boolean(wantedId) && Number.isInteger(parsedWantedId) && parsedWantedId > 0;
  const [wanted, setWanted] = useState<Wanted | null>(null);
  const [matchList, setMatchList] = useState<MatchItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // 路由参数无效时不调用接口，并由列表区域展示空状态。
    if (!hasValidWantedId) return;

    // 根据 wantedId 获取真实匹配结果，同时读取求购条件用于顶部信息栏。
    const fetchMatches = async () => {
      setLoading(true);
      setError(null);

      try {
        const [matchesResponse, wantedResponse] = await Promise.all([
          listWantedMatches({
            path: { wantedId: parsedWantedId },
            auth: () => localStorage.getItem('token') ?? undefined,
            throwOnError: true,
          }),
          getWanted({
            path: { wantedId: parsedWantedId },
            throwOnError: true,
          }),
        ]);

        if (cancelled) return;

        setWanted(wantedResponse.data);
        setMatchList(
          matchesResponse.data.items.map(({ product, relevanceScore, reasons, constraints }) => ({
            id: product.id,
            title: product.title,
            image: product.images[0] ?? '',
            tags: [product.condition, product.category],
            seller: {
              name: product.seller.nickname,
              avatar: product.seller.avatar ?? '',
            },
            school: product.campusLocation ?? '地点未填写',
            publishTime: formatDate(product.createdAt),
            matchScore: Math.round(relevanceScore * 100),
            price: product.price,
            originalPrice:
              product.originalPrice === undefined ? '暂无数据' : `¥${product.originalPrice}`,
            reasons:
              reasons.length > 0
                ? reasons
                : constraints && constraints.length > 0
                  ? constraints
                  : ['暂无匹配原因'],
          })),
        );
        setCurrentPage(1);
      } catch (requestError) {
        if (!cancelled) {
          setWanted(null);
          setMatchList([]);
          const isNotFound =
            typeof requestError === 'object' &&
            requestError !== null &&
            'code' in requestError &&
            requestError.code === 'NOT_FOUND';
          setError(isNotFound ? null : '匹配结果加载失败，请稍后重试');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchMatches();

    // 组件卸载或路由切换后忽略旧请求结果。
    return () => {
      cancelled = true;
    };
  }, [hasValidWantedId, parsedWantedId]);

  const pageSize = 5;
  const visibleMatches = matchList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );


  return (
    <Layout style={styles.layout}>
      {/* 顶部导航栏 */}
      <Header style={styles.header}>
        {/* Logo 已统一到左侧栏 AppSidebar，这里仅保留占位以维持顶栏布局 */}
        <div style={{ width: 220 }} />
        <Input
          prefix={<SearchOutlined style={{ color: '#999' }} />}
          placeholder="搜索校园好物"
          style={styles.headerSearch}
          allowClear
        />
        <div style={styles.headerRight}>
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
        <Content style={styles.content}>
          {/* AI 标题卡片 */}
          <div style={styles.aiCard}>
            <div style={styles.aiLeft}>
              <RobotOutlined style={{ fontSize: 36, color: PRIMARY }} />
              <div>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: TEXT_MAIN }}>AI 匹配结果</h2>
                <div style={{ color: TEXT_SUB, fontSize: 13, marginTop: 4 }}>根据你的求购需求智能推荐</div>
              </div>
            </div>
            <div style={styles.aiRight}>
              <BarChartOutlined style={{ fontSize: 30, color: PRIMARY }} />
              <div>
                <div style={{ fontSize: 14, color: TEXT_MAIN }}>
                  基于 AI 智能匹配，已为你找到 <span style={{ color: PRIMARY, fontWeight: 700 }}>{matchList.length}</span> 个相关商品
                </div>
                <div style={{ fontSize: 12, color: TEXT_SUB, marginTop: 4 }}>
                  综合考虑价格、成色、距离、卖家信誉等多维度因素
                </div>
              </div>
            </div>
          </div>

          {/* 求购条件栏 */}
          <div style={styles.conditionBar}>
            <Space size={48} wrap>
              <Space size={8}>
                <AimOutlined style={{ color: PRIMARY, fontSize: 16 }} />
                <span style={{ color: TEXT_SUB }}>求购：</span>
                <span style={{ color: TEXT_MAIN, fontWeight: 600 }}>{wanted?.title ?? '-'}</span>
              </Space>
              <Space size={8}>
                <MoneyCollectOutlined style={{ color: PRIMARY, fontSize: 16 }} />
                <span style={{ color: TEXT_SUB }}>预算：</span>
                <span style={{ color: TEXT_MAIN, fontWeight: 600 }}>
                  {wanted ? `¥${wanted.budgetMin}-${wanted.budgetMax}` : '-'}
                </span>
              </Space>
              <Space size={8}>
                <EnvironmentOutlined style={{ color: PRIMARY, fontSize: 16 }} />
                <span style={{ color: TEXT_SUB }}>地点：</span>
                <span style={{ color: TEXT_MAIN, fontWeight: 600 }}>{wanted?.location ?? '-'}</span>
              </Space>
            </Space>
            <Button type="link" icon={<EditOutlined />} style={{ padding: 0 }}>
              修改求购条件
            </Button>
          </div>

          {/* 匹配结果列表 */}
          <div style={styles.listHeader}>
            <span style={{ fontSize: 16, color: TEXT_MAIN }}>
              为你找到 <span style={{ color: PRIMARY, fontWeight: 700 }}>{matchList.length}</span> 个匹配商品
            </span>
            <Select
              defaultValue="综合排序"
              style={{ width: 140 }}
              options={[
                { value: '综合排序', label: '综合排序' },
                { value: '价格从低到高', label: '价格从低到高' },
                { value: '价格从高到低', label: '价格从高到低' },
                { value: '匹配度最高', label: '匹配度最高' },
                { value: '距离最近', label: '距离最近' },
              ]}
            />
          </div>

          {!hasValidWantedId ? (
            <Empty description="未找到对应的求购信息" />
          ) : loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Spin tip="正在加载匹配结果..." />
            </div>
          ) : error ? (
            <Alert type="error" showIcon message={error} />
          ) : matchList.length === 0 ? (
            <Empty description="暂无匹配商品" />
          ) : visibleMatches.map((item) => (
            <div key={item.id} style={styles.itemCard}>
              {/* 商品图片 */}
              <img src={item.image} alt={item.title} style={styles.itemImage} />

              {/* 商品信息 */}
              <div style={styles.infoArea}>
                <h3 style={styles.itemTitle}>{item.title}</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {item.tags.map((tag, idx) => (
                    <Tag
                      key={tag}
                      color={idx === 0 ? 'green' : 'default'}
                      style={{ borderRadius: 6, marginInlineEnd: 0 }}
                    >
                      {tag}
                    </Tag>
                  ))}
                </div>
                <div style={styles.sellerRow}>
                  <Avatar src={item.seller.avatar} size={24} />
                  <span>{item.seller.name}</span>
                  <span style={{ color: '#bbb' }}>|</span>
                  <span>{item.school}</span>
                  <span style={{ color: '#bbb' }}>|</span>
                  <ClockCircleOutlined />
                  <span>发布于 {item.publishTime}</span>
                </div>
              </div>

              {/* 匹配度区域 */}
              <div style={styles.matchArea}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ color: TEXT_SUB, fontSize: 13 }}>匹配度</span>
                  <span style={{ fontSize: 24, fontWeight: 700, color: PRIMARY }}>{item.matchScore}</span>
                  <span style={{ color: '#999', fontSize: 13 }}>/100</span>
                </div>
                <Progress
                  percent={item.matchScore}
                  showInfo={false}
                  strokeColor={PRIMARY}
                  trailColor="#f0f0f0"
                  size="small"
                />
                <div style={{ fontSize: 12, color: TEXT_SUB, fontWeight: 600, marginTop: 2 }}>为什么推荐</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {item.reasons.map((reason) => (
                    <span key={reason} style={{ fontSize: 12, color: TEXT_SUB, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircleFilled style={{ color: PRIMARY, fontSize: 12 }} />
                      {reason}
                    </span>
                  ))}
                </div>
              </div>

              {/* 价格区域 */}
              <div style={styles.priceArea}>
                <span style={{ fontSize: 24, fontWeight: 700, color: PRIMARY }}>¥{item.price}</span>
                <div style={{ fontSize: 13, color: TEXT_SUB }}>
                  商品原价：<span style={{ color: TEXT_MAIN }}>{item.originalPrice}</span>
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>参考：原价 · 使用时间 · 成色 · 市场行情</div>
                <Button
                  type="link"
                  icon={<LineChartOutlined />}
                  style={{ padding: 0, alignSelf: 'flex-start', fontSize: 13 }}
                >
                  查看价格分析
                </Button>
              </div>

              {/* 操作区 */}
              <div style={styles.actionArea}>
                <Button type="primary" block>
                  查看详情
                </Button>
                <Button block>联系卖家</Button>
              </div>
            </div>
          ))}

          {/* 分页 */}
          {!loading && !error && matchList.length > 0 && <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
            <Pagination
              current={currentPage}
              total={matchList.length}
              pageSize={pageSize}
              onChange={setCurrentPage}
              showSizeChanger={false}
            />
          </div>}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MatchResultPage;
