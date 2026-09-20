import React, { useState } from 'react';
import { Layout, Input, Avatar, Badge, Dropdown, Space, Select } from 'antd';
import type { MenuProps } from 'antd';
import {
  SearchOutlined,
  BellOutlined,
  DownOutlined,
  HeartFilled,
} from '@ant-design/icons';
import { AppSidebar } from '../../components';

const { Header, Sider, Content } = Layout;

// -------------------- Mock 数据 --------------------
type FavoriteStatus = '在售' | '已预约' | '已售' | '已下架';

interface FavoriteItem {
  id: string;
  title: string;
  image: string;
  price: number;
  status: FavoriteStatus;
}

const favoriteList: FavoriteItem[] = [
  { id: 'F10001', title: '戴尔 27 英寸显示器', image: 'https://picsum.photos/seed/monitor/400/300', price: 899, status: '在售' },
  { id: 'F10002', title: '机械键盘', image: 'https://picsum.photos/seed/keyboard/400/300', price: 220, status: '已预约' },
  { id: 'F10003', title: '高等数学教材', image: 'https://picsum.photos/seed/textbook/400/300', price: 35, status: '已售' },
  { id: 'F10004', title: '人体工学椅', image: 'https://picsum.photos/seed/chair/400/300', price: 450, status: '已下架' },
  { id: 'F10005', title: '宿舍收纳架', image: 'https://picsum.photos/seed/shelf/400/300', price: 68, status: '在售' },
  { id: 'F10006', title: '索尼降噪耳机', image: 'https://picsum.photos/seed/headphone/400/300', price: 680, status: '已预约' },
  { id: 'F10007', title: '校园自行车', image: 'https://picsum.photos/seed/bike/400/300', price: 300, status: '已售' },
  { id: 'F10008', title: '便携投影仪', image: 'https://picsum.photos/seed/projector/400/300', price: 520, status: '已下架' },
];

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

const statusStyleMap: Record<FavoriteStatus, React.CSSProperties> = {
  在售: { background: '#e8f0ff', color: PRIMARY },
  已预约: { background: '#fff3e0', color: '#fa8c16' },
  已售: { background: '#e8f8ee', color: '#1db863' },
  已下架: { background: '#f2f3f5', color: '#8a9099' },
};

const soldOutStatuses: FavoriteStatus[] = ['已售', '已下架'];

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

const FavoritesPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('全部');

  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', label: '个人中心' },
    { key: 'orders', label: '我的订单' },
    { key: 'logout', label: '退出登录' },
  ];

  const filteredList = favoriteList.filter(
    (item) => activeFilter === '全部' || item.status === activeFilter
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
          <Badge dot>
            <BellOutlined style={{ fontSize: 18, color: TEXT_MAIN, cursor: 'pointer' }} />
          </Badge>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar src="https://picsum.photos/seed/avatar/64/64" size={34} />
              <span style={{ color: TEXT_MAIN, fontSize: 14 }}>同学</span>
              <DownOutlined style={{ fontSize: 12, color: '#999' }} />
            </Space>
          </Dropdown>
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
              defaultValue="最新收藏"
              style={{ width: 140 }}
              options={[
                { value: '最新收藏', label: '最新收藏' },
                { value: '价格从低到高', label: '价格从低到高' },
                { value: '价格从高到低', label: '价格从高到低' },
              ]}
            />
          </div>

          {/* 商品卡片网格 */}
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
                <div key={item.id} style={styles.card}>
                  {/* 图片区域 */}
                  <div style={styles.cardImageWrap}>
                    <img src={item.image} alt={item.title} style={styles.cardImage} />
                    <HeartFilled
                      style={styles.heartIcon}
                      onClick={() => console.log('取消收藏：', item.id)}
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
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>

          {filteredList.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                color: TEXT_SUB,
                padding: '80px 0',
                fontSize: 15,
              }}
            >
              暂无收藏商品
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default FavoritesPage;