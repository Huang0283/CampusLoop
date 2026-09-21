import React from 'react';
import { Layout, Input, Space, Table, Button } from 'antd';
import type { TableProps } from 'antd';
import {
  SearchOutlined,
} from '@ant-design/icons';
import { AppSidebar, NotificationBell, UserMenu } from '../../components';

const { Header, Sider, Content } = Layout;

// -------------------- Mock 数据 --------------------
type ProductStatus = '在售' | '已预约' | '已售' | '隐藏' | '已下架';

interface ProductItem {
  id: string;
  title: string;
  image: string;
  price: number;
  status: ProductStatus;
}

const productList: ProductItem[] = [
  { id: 'P10001', title: '戴尔 27 英寸显示器', image: 'https://picsum.photos/seed/monitor/128/128', price: 899, status: '在售' },
  { id: 'P10002', title: '高等数学教材', image: 'https://picsum.photos/seed/textbook/128/128', price: 35, status: '已预约' },
  { id: 'P10003', title: '宿舍收纳架', image: 'https://picsum.photos/seed/shelf/128/128', price: 28, status: '已售' },
  { id: 'P10004', title: '机械键盘', image: 'https://picsum.photos/seed/keyboard/128/128', price: 220, status: '隐藏' },
  { id: 'P10005', title: '人体工学椅', image: 'https://picsum.photos/seed/chair/128/128', price: 450, status: '已下架' },
];

// -------------------- 颜色配置 --------------------
const PRIMARY = '#2f6bff';
const BG = '#f5f6f8';
const CARD_BG = '#ffffff';
const TEXT_MAIN = '#1f2329';
const BORDER = '#eef0f3';

const statusStyleMap: Record<ProductStatus, React.CSSProperties> = {
  在售: { background: '#e8f0ff', color: PRIMARY },
  已预约: { background: '#fff3e0', color: '#fa8c16' },
  已售: { background: '#e8f8ee', color: '#1db863' },
  隐藏: { background: '#f2f3f5', color: '#8a9099' },
  已下架: { background: '#f2f3f5', color: '#8a9099' },
};

const disabledEditStatuses: ProductStatus[] = ['已售', '已下架'];

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
  tableCard: { background: CARD_BG, borderRadius: 12, padding: '28px 32px' },
};

const MyProductsPage: React.FC = () => {

  const columns: TableProps<ProductItem>['columns'] = [
    {
      title: '商品信息',
      dataIndex: 'title',
      key: 'info',
      render: (_, record) => (
        <Space size={16}>
          <img
            src={record.image}
            alt={record.title}
            style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
          />
          <span style={{ color: TEXT_MAIN, fontSize: 15, fontWeight: 500 }}>{record.title}</span>
        </Space>
      ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 140,
      render: (price: number) => (
        <span style={{ color: TEXT_MAIN, fontSize: 15, fontWeight: 600 }}>¥ {price}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: ProductStatus) => (
        <span
          style={{
            display: 'inline-block',
            borderRadius: 16,
            padding: '4px 16px',
            fontSize: 13,
            fontWeight: 500,
            ...statusStyleMap[status],
          }}
        >
          {status}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_, record) => {
        const editDisabled = disabledEditStatuses.includes(record.status);
        return (
          <Space size={12}>
            <Button
              style={{ color: PRIMARY, borderColor: PRIMARY, borderRadius: 8 }}
              disabled={editDisabled}
              onClick={() => console.log('编辑商品：', record.id)}
            >
              编辑
            </Button>
            <Button style={{ borderRadius: 8 }} onClick={() => console.log('下架商品：', record.id)}>
              下架
            </Button>
            <Button
              danger
              style={{ borderRadius: 8 }}
              onClick={() => console.log('删除商品：', record.id)}
            >
              删除
            </Button>
          </Space>
        );
      },
    },
  ];

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
          {/* 标题 */}
          <h1 style={{ margin: '0 0 24px 0', fontSize: 28, fontWeight: 700, color: TEXT_MAIN }}>
            我的商品
          </h1>

          {/* 表格卡片 */}
          <div style={styles.tableCard}>
            <Table<ProductItem>
              rowKey="id"
              columns={columns}
              dataSource={productList}
              pagination={false}
            />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MyProductsPage;
