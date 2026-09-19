import React, { useState } from 'react';
import {
  Layout,
  Input,
  Avatar,
  Badge,
  Dropdown,
  Space,
  Button,
  Select,
  Tag,
  Progress,
  Pagination,
  Menu,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  HomeOutlined,
  ShopOutlined,
  AimOutlined,
  MessageOutlined,
  SwapOutlined,
  SearchOutlined,
  BellOutlined,
  DownOutlined,
  RobotOutlined,
  BarChartOutlined,
  EditOutlined,
  MoneyCollectOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CheckCircleFilled,
  LineChartOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

// -------------------- Mock 数据 --------------------
interface MatchItem {
  id: number;
  title: string;
  image: string;
  tags: string[];
  seller: { name: string; avatar: string };
  school: string;
  distance: string;
  publishTime: string;
  matchScore: number;
  price: number;
  priceRange: string;
  reasons: string[];
}

const matchList: MatchItem[] = [
  {
    id: 1,
    title: '戴尔 24寸显示器',
    image: 'https://picsum.photos/seed/monitor/280/240',
    tags: ['二手良好', 'LCD显示器', '24英寸', '1080P'],
    seller: { name: '同学A', avatar: 'https://i.pravatar.cc/64?img=11' },
    school: '清华大学',
    distance: '3.2 km',
    publishTime: '2天前',
    matchScore: 92,
    price: 900,
    priceRange: '¥800 - ¥1000',
    reasons: ['符合预算', '成色满足', '地点相近'],
  },
  {
    id: 2,
    title: 'MacBook Air M1',
    image: 'https://picsum.photos/seed/macbook/280/240',
    tags: ['二手优秀', '苹果', 'M1芯片', '8GB', '256GB'],
    seller: { name: '同学B', avatar: 'https://i.pravatar.cc/64?img=32' },
    school: '清华大学',
    distance: '1.5 km',
    publishTime: '5小时前',
    matchScore: 88,
    price: 3200,
    priceRange: '¥3000 - ¥3400',
    reasons: ['符合预算', '成色良好', '热门机型'],
  },
  {
    id: 3,
    title: '索尼 WH-1000XM4 耳机',
    image: 'https://picsum.photos/seed/headphone/280/240',
    tags: ['二手良好', '降噪耳机', '无线蓝牙', '黑色'],
    seller: { name: '同学C', avatar: 'https://i.pravatar.cc/64?img=47' },
    school: '清华大学',
    distance: '2.8 km',
    publishTime: '1天前',
    matchScore: 85,
    price: 800,
    priceRange: '¥700 - ¥900',
    reasons: ['符合预算', '成色满足', '卖家信誉好'],
  },
  {
    id: 4,
    title: '小米护眼台灯',
    image: 'https://picsum.photos/seed/lamp/280/240',
    tags: ['二手几乎全新', '小米', '护眼', 'LED'],
    seller: { name: '同学D', avatar: 'https://i.pravatar.cc/64?img=56' },
    school: '清华大学',
    distance: '0.8 km',
    publishTime: '12小时前',
    matchScore: 78,
    price: 120,
    priceRange: '¥100 - ¥180',
    reasons: ['价格合适', '成色优秀', '距离很近'],
  },
];

// -------------------- 样式 --------------------
const PRIMARY = '#1677ff';
const BG = '#f5f5f5';
const CARD_BG = '#ffffff';
const TEXT_MAIN = '#222222';
const TEXT_SUB = '#666666';
const BORDER = '#e5e5e5';

const styles: Record<string, React.CSSProperties> = {
  layout: { minHeight: '100vh', background: BG },
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

// -------------------- 页面组件 --------------------
const MatchResultPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);

  const siderItems: MenuProps['items'] = [
    { key: 'home', icon: <HomeOutlined />, label: '首页' },
    { key: 'market', icon: <ShopOutlined />, label: '市场' },
    { key: 'wanted', icon: <AimOutlined />, label: '求购' },
    { key: 'chat', icon: <MessageOutlined />, label: '聊天' },
    { key: 'trade', icon: <SwapOutlined />, label: '交易' },
  ];

  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', label: '个人中心' },
    { key: 'orders', label: '我的订单' },
    { key: 'logout', label: '退出登录' },
  ];

  return (
    <Layout style={styles.layout}>
      {/* 顶部导航栏 */}
      <Header style={styles.header}>
        <div style={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill={PRIMARY}>
            <path d="M12 3L1 8l4 1.8V15c0 3 3.1 5 7 5s7-2 7-5V9.8L21 8l-9-5zm0 2.2l6.2 2.8L12 10.8 5.8 8 12 5.2zM7 10.9l4 1.8v5.1c-2.2-.3-4-1.5-4-3.3v-3.6zm6 6.9v-5.1l4-1.8v3.6c0 1.8-1.8 3-4 3.3z" />
          </svg>
          <span>Campus Market</span>
        </div>
        <Input
          prefix={<SearchOutlined style={{ color: '#999' }} />}
          placeholder="搜索校园好物"
          style={styles.headerSearch}
          allowClear
        />
        <div style={styles.headerRight}>
          <Badge count={3} size="small">
            <BellOutlined style={{ fontSize: 18, color: TEXT_MAIN, cursor: 'pointer' }} />
          </Badge>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar src="https://i.pravatar.cc/64?img=5" size={34} />
              <span style={{ color: TEXT_MAIN, fontSize: 14 }}>同学</span>
              <DownOutlined style={{ fontSize: 12, color: '#999' }} />
            </Space>
          </Dropdown>
        </div>
      </Header>

      <Layout>
        {/* 左侧侧边栏 */}
        <Sider width={200} style={styles.sider}>
          <Menu
            mode="inline"
            selectedKeys={['wanted']}
            items={siderItems}
            style={{ borderInlineEnd: 'none', fontSize: 15 }}
          />
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
                  基于 AI 智能匹配，已为你找到 <span style={{ color: PRIMARY, fontWeight: 700 }}>24</span> 个相关商品
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
                <span style={{ color: TEXT_MAIN, fontWeight: 600 }}>显示器</span>
              </Space>
              <Space size={8}>
                <MoneyCollectOutlined style={{ color: PRIMARY, fontSize: 16 }} />
                <span style={{ color: TEXT_SUB }}>预算：</span>
                <span style={{ color: TEXT_MAIN, fontWeight: 600 }}>¥800-1000</span>
              </Space>
              <Space size={8}>
                <EnvironmentOutlined style={{ color: PRIMARY, fontSize: 16 }} />
                <span style={{ color: TEXT_SUB }}>地点：</span>
                <span style={{ color: TEXT_MAIN, fontWeight: 600 }}>清华大学</span>
              </Space>
            </Space>
            <Button type="link" icon={<EditOutlined />} style={{ padding: 0 }}>
              修改求购条件
            </Button>
          </div>

          {/* 匹配结果列表 */}
          <div style={styles.listHeader}>
            <span style={{ fontSize: 16, color: TEXT_MAIN }}>
              为你找到 <span style={{ color: PRIMARY, fontWeight: 700 }}>24</span> 个匹配商品
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

          {matchList.map((item) => (
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
                  <span>{item.school} · {item.distance}</span>
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
                  建议区间：<span style={{ color: TEXT_MAIN }}>{item.priceRange}</span>
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
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
            <Pagination
              current={currentPage}
              total={24}
              pageSize={5}
              onChange={setCurrentPage}
              showSizeChanger={false}
            />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MatchResultPage;
