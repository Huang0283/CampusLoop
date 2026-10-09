import React, { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Layout, Input, message, Result, Space, Spin, Select } from 'antd';
import {
  SearchOutlined,
  HeartFilled,
} from '@ant-design/icons';
import { AppSidebar, NotificationBell, UserMenu } from '../../components';
import { useNavigate } from 'react-router-dom';
import { useRequireAuthAction } from '../../hooks/useRequireAuthAction';
import type { Product } from '../../sdk/generated/types.gen';

const { Header, Sider, Content } = Layout;

// -------------------- Mock 数据 --------------------
// 使用 satisfies 持续校验每条收藏 Mock 与 SDK Product 契约完全兼容。
const mockFavorites = [
  {
    id: 10001,
    seller: { id: 201, nickname: '林同学', avatar: 'https://i.pravatar.cc/64?img=31', rating: 4.9, transactionCount: 16 },
    title: '戴尔 27 英寸显示器',
    category: '数码',
    condition: '九成新',
    description: '2K 分辨率，屏幕无坏点。',
    originalPrice: 1899,
    price: 899,
    campusLocation: '清华大学',
    images: ['https://picsum.photos/seed/monitor/400/300'],
    status: 'ON_SALE',
    createdAt: '2026-09-28T10:00:00+08:00',
    updatedAt: '2026-09-28T10:00:00+08:00',
  },
  {
    id: 10002,
    seller: { id: 202, nickname: '张同学', avatar: 'https://i.pravatar.cc/64?img=32', rating: 4.8, transactionCount: 10 },
    title: '机械键盘',
    category: '数码',
    condition: '八成新',
    description: '青轴机械键盘，灯光正常。',
    originalPrice: 499,
    price: 220,
    campusLocation: '北京大学',
    images: ['https://picsum.photos/seed/keyboard/400/300'],
    status: 'RESERVED',
    createdAt: '2026-09-27T15:20:00+08:00',
    updatedAt: '2026-09-28T09:00:00+08:00',
  },
  {
    id: 10003,
    seller: { id: 203, nickname: '王同学', avatar: 'https://i.pravatar.cc/64?img=33', rating: 0, transactionCount: 4 },
    title: '高等数学教材',
    category: '书籍',
    condition: '七成新',
    description: '有少量课堂笔记，不影响阅读。',
    originalPrice: 78,
    price: 35,
    campusLocation: '中国人民大学',
    images: ['https://picsum.photos/seed/textbook/400/300'],
    status: 'SOLD',
    createdAt: '2026-09-20T08:30:00+08:00',
    updatedAt: '2026-09-26T12:00:00+08:00',
  },
  {
    id: 10004,
    seller: { id: 204, nickname: '赵同学', avatar: 'https://i.pravatar.cc/64?img=34', rating: 4.6, transactionCount: 8 },
    title: '人体工学椅',
    category: '生活用品',
    condition: '八成新',
    description: '升降和后仰功能正常。',
    originalPrice: 999,
    price: 450,
    campusLocation: '北京航空航天大学',
    images: ['https://picsum.photos/seed/chair/400/300'],
    status: 'HIDDEN',
    createdAt: '2026-09-18T13:00:00+08:00',
    updatedAt: '2026-09-25T18:00:00+08:00',
  },
  {
    id: 10005,
    seller: { id: 205, nickname: '陈同学', avatar: 'https://i.pravatar.cc/64?img=35', rating: 4.7, transactionCount: 12 },
    title: '宿舍收纳架',
    category: '宿舍',
    condition: '九成新',
    description: '免打孔组合收纳架。',
    originalPrice: 129,
    price: 68,
    campusLocation: '北京理工大学',
    images: ['https://picsum.photos/seed/shelf/400/300'],
    status: 'ON_SALE',
    createdAt: '2026-09-29T09:10:00+08:00',
    updatedAt: '2026-09-29T09:10:00+08:00',
  },
  {
    id: 10006,
    seller: { id: 206, nickname: '刘同学', avatar: 'https://i.pravatar.cc/64?img=36', rating: 5, transactionCount: 21 },
    title: '索尼降噪耳机',
    category: '数码',
    condition: '九成新',
    description: '降噪和蓝牙连接功能正常。',
    originalPrice: 2299,
    price: 680,
    campusLocation: '清华大学',
    images: ['https://picsum.photos/seed/headphone/400/300'],
    status: 'RESERVED',
    createdAt: '2026-09-26T19:30:00+08:00',
    updatedAt: '2026-09-28T14:00:00+08:00',
  },
  {
    id: 10007,
    seller: { id: 207, nickname: '周同学', avatar: 'https://i.pravatar.cc/64?img=37', rating: 4.5, transactionCount: 6 },
    title: '校园自行车',
    category: '运动',
    condition: '七成新',
    description: '适合校内通勤，刹车正常。',
    originalPrice: 699,
    price: 300,
    campusLocation: '北京大学',
    images: ['https://picsum.photos/seed/bike/400/300'],
    status: 'SOLD',
    createdAt: '2026-09-21T11:00:00+08:00',
    updatedAt: '2026-09-27T16:30:00+08:00',
  },
  {
    id: 10008,
    seller: { id: 208, nickname: '吴同学', avatar: 'https://i.pravatar.cc/64?img=38', rating: 4.8, transactionCount: 13 },
    title: '便携投影仪',
    category: '数码',
    condition: '八成新',
    description: '支持 HDMI 和无线投屏。',
    originalPrice: 1299,
    price: 520,
    campusLocation: '中国人民大学',
    images: ['https://picsum.photos/seed/projector/400/300'],
    status: 'HIDDEN',
    createdAt: '2026-09-19T20:00:00+08:00',
    updatedAt: '2026-09-24T17:00:00+08:00',
  },
] satisfies Product[];

const filterOptions = ['全部', '在售', '已预约', '已售', '已下架'] as const;
type FilterKey = (typeof filterOptions)[number];

// -------------------- 颜色配置 --------------------
const PRIMARY = '#2f6bff';
const BG = '#f5f6f8';
const CARD_BG = '#ffffff';
const TEXT_MAIN = '#1f2329';
const TEXT_SUB = '#646a73';
const PRICE_RED = '#ff4d4f';
const BORDER = '#eef0f3';

const statusTextMap: Record<Product['status'], FilterKey> = {
  ON_SALE: '在售',
  RESERVED: '已预约',
  SOLD: '已售',
  HIDDEN: '已下架',
};

const statusStyleMap: Record<Product['status'], React.CSSProperties> = {
  ON_SALE: { background: '#e8f0ff', color: PRIMARY },
  RESERVED: { background: '#fff3e0', color: '#fa8c16' },
  SOLD: { background: '#e8f8ee', color: '#1db863' },
  HIDDEN: { background: '#f2f3f5', color: '#8a9099' },
};

const soldOutStatuses: Product['status'][] = ['SOLD', 'HIDDEN'];
const removedFavoritesStorageKey = 'campusloop:removed-favorite-product-ids';

const readRemovedFavoriteIds = (): number[] => {
  try {
    const value = JSON.parse(localStorage.getItem(removedFavoritesStorageKey) ?? '[]');
    return Array.isArray(value)
      ? value.filter((id): id is number => typeof id === 'number')
      : [];
  } catch {
    return [];
  }
};

const styles: Record<string, React.CSSProperties> = {
  layout: { minHeight: '100vh', background: BG, marginLeft: 220 },
  header: {
    background: CARD_BG,
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `1px solid ${BORDER}`,
    height: 64,
    lineHeight: '64px',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 20, fontWeight: 700, color: TEXT_MAIN },
  headerSearch: { width: 420, maxWidth: '40vw' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 20 },
  sider: { background: CARD_BG, borderRight: `1px solid ${BORDER}`, paddingTop: 16 },
  content: { padding: '24px 32px 48px', background: BG },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  filterPill: {
    borderRadius: 20,
    padding: '6px 22px',
    fontSize: 14,
    cursor: 'pointer',
    border: `1px solid ${BORDER}`,
    background: CARD_BG,
    color: TEXT_SUB,
    transition: 'all 0.2s',
  },
  filterPillActive: {
    borderRadius: 20,
    padding: '6px 22px',
    fontSize: 14,
    cursor: 'pointer',
    border: `1px solid ${PRIMARY}`,
    background: CARD_BG,
    color: PRIMARY,
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  card: {
    background: CARD_BG,
    borderRadius: 12,
    padding: 16,
  },
  cardImageWrap: { position: 'relative', borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  cardImage: { width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' },
  heartIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: 22,
    color: PRICE_RED,
    cursor: 'pointer',
    zIndex: 2,
  },
  soldOutMask: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(255, 255, 255, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  soldOutText: {
    fontSize: 22,
    fontWeight: 700,
    color: '#8a9099',
    fontStyle: 'italic',
    letterSpacing: 2,
  },
};

type PageStatus = 'loading' | 'success' | 'error' | 'forbidden';
type SortKey = '最新收藏' | '价格从低到高' | '价格从高到低';

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const requireAuthAction = useRequireAuthAction();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('全部');
  const [sort, setSort] = useState<SortKey>('最新收藏');

  useEffect(() => {
    let cancelled = false;

    // 模拟异步加载收藏数据，使 loading、error 和 success 状态都可被验证。
    const timer = window.setTimeout(() => {
      if (cancelled) return;

      try {
        // 开发测试时可设置此标记，刷新页面验证 error 状态。
        if (sessionStorage.getItem('favoritesMockLoadError') === 'true') {
          throw new Error('Mock 收藏加载失败');
        }

        // 收藏属于登录后功能，缺少凭证时展示无权限兜底状态。
        if (!localStorage.getItem('token')) {
          setFavorites([]);
          setPageStatus('forbidden');
          return;
        }

        const removedIds = new Set(readRemovedFavoriteIds());
        setFavorites(mockFavorites.filter((product) => !removedIds.has(product.id)));
        setPageStatus('success');
      } catch {
        setFavorites([]);
        setPageStatus('error');
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [reloadKey]);

  // 搜索、状态筛选和排序都在前端基于 Mock 收藏数据完成。
  const filteredList = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase('zh-CN');
    const filtered = favorites.filter((item) => {
      const matchesFilter =
        activeFilter === '全部' || statusTextMap[item.status] === activeFilter;
      const matchesKeyword =
        !normalizedKeyword ||
        [item.title, item.category, item.description, item.seller.nickname]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLocaleLowerCase('zh-CN').includes(normalizedKeyword));
      return matchesFilter && matchesKeyword;
    });

    return [...filtered].sort((left, right) => {
      if (sort === '价格从低到高') return left.price - right.price;
      if (sort === '价格从高到低') return right.price - left.price;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [activeFilter, favorites, keyword, sort]);

  // 取消收藏后同步更新内存状态和 localStorage，返回页面时仍保持移除。
  const handleRemoveFavorite = (productId: number) => {
    requireAuthAction(() => {
      const removedIds = new Set(readRemovedFavoriteIds());
      removedIds.add(productId);
      localStorage.setItem(removedFavoritesStorageKey, JSON.stringify([...removedIds]));
      setFavorites((current) => current.filter((product) => product.id !== productId));
      message.success('已取消收藏');
    });
  };

  const handleRetry = () => {
    sessionStorage.removeItem('favoritesMockLoadError');
    setPageStatus('loading');
    setReloadKey((value) => value + 1);
  };


  return (
    <Layout style={styles.layout}>
      {/* 顶部导航栏 */}
      <Header style={styles.header}>
        {/* Logo 已统一到左侧栏 AppSidebar，这里仅保留占位以维持顶栏布局 */}
        <div style={{ width: 220 }} />
        <Input
          prefix={<SearchOutlined style={{ color: '#999' }} />}
          placeholder="搜索校园好物"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
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
          {/* 标题 */}
          <h1 style={{ margin: '0 0 24px 0', fontSize: 28, fontWeight: 700, color: TEXT_MAIN }}>
            我的收藏
          </h1>

          {/* 筛选栏 */}
          <div style={styles.filterBar}>
            <Space size={12} wrap>
              {filterOptions.map((option) => (
                <span
                  key={option}
                  style={option === activeFilter ? styles.filterPillActive : styles.filterPill}
                  onClick={() => setActiveFilter(option)}
                >
                  {option}
                </span>
              ))}
            </Space>
            <Select
              value={sort}
              onChange={setSort}
              style={{ width: 140 }}
              options={[
                { value: '最新收藏', label: '最新收藏' },
                { value: '价格从低到高', label: '价格从低到高' },
                { value: '价格从高到低', label: '价格从高到低' },
              ]}
            />
          </div>

          {/* 商品卡片网格 */}
          {pageStatus === 'loading' ? (
            // loading：模拟收藏数据加载期间展示加载提示。
            <div style={{ padding: '80px 0', textAlign: 'center' }}>
              <Spin size="large" tip="正在加载收藏..." />
            </div>
          ) : pageStatus === 'error' ? (
            // error：Mock 加载失败时展示错误结果和重试入口。
            <Result
              status="error"
              title="收藏加载失败"
              subTitle="请稍后重试"
              extra={<Button type="primary" onClick={handleRetry}>重新加载</Button>}
            />
          ) : pageStatus === 'forbidden' ? (
            // forbidden：未登录时使用 M2 登录守卫跳转登录页面。
            <Result
              status="403"
              title="暂无访问权限"
              subTitle="登录后才能查看收藏商品"
              extra={
                <Button
                  type="primary"
                  onClick={() => requireAuthAction(handleRetry)}
                >
                  去登录
                </Button>
              }
            />
          ) : filteredList.length === 0 ? (
            // empty：收藏为空或筛选无结果时，引导用户返回市场。
            <Empty
              description={favorites.length === 0 ? '暂无收藏商品' : '暂无符合条件的收藏'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => navigate('/market')}>
                去市场逛逛
              </Button>
            </Empty>
          ) : (
            // success：正常渲染可交互的收藏商品卡片。
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 16,
              }}
            >
              {filteredList.map((item) => {
                const isSoldOut = soldOutStatuses.includes(item.status);
                return (
                  <div
                    key={item.id}
                    style={styles.card}
                    onClick={() => navigate(`/product/${item.id}`)}
                  >
                    {/* 图片区域 */}
                    <div style={styles.cardImageWrap}>
                      <img
                        src={item.images[0] ?? '/favicon.svg'}
                        alt={item.title}
                        style={styles.cardImage}
                      />
                      <HeartFilled
                        style={styles.heartIcon}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemoveFavorite(item.id);
                        }}
                      />
                      {isSoldOut && (
                        <div style={styles.soldOutMask}>
                          <span style={styles.soldOutText}>已售罄</span>
                        </div>
                      )}
                    </div>

                    {/* 标题 */}
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: TEXT_MAIN,
                        marginBottom: 8,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.title}
                    </div>

                    {/* 价格 */}
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: PRICE_RED,
                        marginBottom: 10,
                      }}
                    >
                      ¥{item.price}
                    </div>

                    {/* 状态标签 */}
                    <span
                      style={{
                        display: 'inline-block',
                        borderRadius: 6,
                        padding: '3px 12px',
                        fontSize: 13,
                        fontWeight: 500,
                        ...statusStyleMap[item.status],
                      }}
                    >
                      {statusTextMap[item.status]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default FavoritesPage;
