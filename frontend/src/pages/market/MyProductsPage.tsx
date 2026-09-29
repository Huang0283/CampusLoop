import React, { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Input, Layout, message, Modal, Result, Space, Spin, Table } from 'antd';
import type { TableProps } from 'antd';
import {
  SearchOutlined,
} from '@ant-design/icons';
import { AppSidebar, NotificationBell, UserMenu } from '../../components';
import { useNavigate } from 'react-router-dom';
import { useRequireAuthAction } from '../../hooks/useRequireAuthAction';
import type { Product } from '../../sdk/generated/types.gen';

const { Header, Sider, Content } = Layout;

// -------------------- Mock 数据 --------------------
// 使用 satisfies 确保每条 Mock 商品持续符合生成 SDK 的 Product 契约。
const mockProducts = [
  {
    id: 20001,
    seller: { id: 301, nickname: '我', avatar: 'https://i.pravatar.cc/64?img=41', rating: 4.9, transactionCount: 18 },
    title: '戴尔 27 英寸显示器',
    category: '数码',
    condition: '九成新',
    description: '2K 分辨率，显示正常，无明显坏点。',
    originalPrice: 1899,
    price: 899,
    campusLocation: '清华大学',
    images: ['https://picsum.photos/seed/monitor/128/128'],
    status: 'ON_SALE',
    createdAt: '2026-09-28T10:00:00+08:00',
    updatedAt: '2026-09-28T10:00:00+08:00',
  },
  {
    id: 20002,
    seller: { id: 301, nickname: '我', avatar: 'https://i.pravatar.cc/64?img=41', rating: 4.9, transactionCount: 18 },
    title: '高等数学教材',
    category: '书籍',
    condition: '八成新',
    description: '有少量笔记，页面完整。',
    originalPrice: 78,
    price: 35,
    campusLocation: '清华大学',
    images: ['https://picsum.photos/seed/textbook/128/128'],
    status: 'RESERVED',
    createdAt: '2026-09-25T09:30:00+08:00',
    updatedAt: '2026-09-28T14:00:00+08:00',
  },
  {
    id: 20003,
    seller: { id: 301, nickname: '我', avatar: 'https://i.pravatar.cc/64?img=41', rating: 4.9, transactionCount: 18 },
    title: '宿舍收纳架',
    category: '宿舍',
    condition: '九成新',
    description: '结构稳固，配件齐全。',
    originalPrice: 69,
    price: 28,
    campusLocation: '清华大学',
    images: ['https://picsum.photos/seed/shelf/128/128'],
    status: 'SOLD',
    createdAt: '2026-09-20T12:00:00+08:00',
    updatedAt: '2026-09-27T16:00:00+08:00',
  },
  {
    id: 20004,
    seller: { id: 301, nickname: '我', avatar: 'https://i.pravatar.cc/64?img=41', rating: 4.9, transactionCount: 18 },
    title: '机械键盘',
    category: '数码',
    condition: '八成新',
    description: '青轴键盘，灯光与按键功能正常。',
    originalPrice: 499,
    price: 220,
    campusLocation: '清华大学',
    images: ['https://picsum.photos/seed/keyboard/128/128'],
    status: 'HIDDEN',
    createdAt: '2026-09-18T15:00:00+08:00',
    updatedAt: '2026-09-24T11:00:00+08:00',
  },
  {
    id: 20005,
    seller: { id: 301, nickname: '我', avatar: 'https://i.pravatar.cc/64?img=41', rating: 4.9, transactionCount: 18 },
    title: '人体工学椅',
    category: '生活用品',
    condition: '八成新',
    description: '升降和后仰功能正常。',
    originalPrice: 999,
    price: 450,
    campusLocation: '清华大学',
    images: ['https://picsum.photos/seed/chair/128/128'],
    status: 'ON_SALE',
    createdAt: '2026-09-29T08:30:00+08:00',
    updatedAt: '2026-09-29T08:30:00+08:00',
  },
] satisfies Product[];

// -------------------- 颜色配置 --------------------
const PRIMARY = '#2f6bff';
const BG = '#f5f6f8';
const CARD_BG = '#ffffff';
const TEXT_MAIN = '#1f2329';
const BORDER = '#eef0f3';

const statusTextMap: Record<Product['status'], string> = {
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

type PageStatus = 'loading' | 'success' | 'error' | 'forbidden';

const MyProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const requireAuthAction = useRequireAuthAction();
  const [products, setProducts] = useState<Product[]>([]);
  const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  useEffect(() => {
    let cancelled = false;

    // 模拟异步加载，使 loading、error 和 success 状态都可被验证。
    const timer = window.setTimeout(() => {
      if (cancelled) return;

      try {
        // 开发测试时可设置此标记，刷新页面验证 error 状态。
        if (sessionStorage.getItem('myProductsMockLoadError') === 'true') {
          throw new Error('Mock 商品加载失败');
        }

        // “我的发布”属于登录功能，缺少凭证时展示无权限兜底状态。
        if (!localStorage.getItem('token')) {
          setProducts([]);
          setPageStatus('forbidden');
          return;
        }

        setProducts(mockProducts);
        setPageStatus('success');
      } catch {
        setProducts([]);
        setPageStatus('error');
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [reloadKey]);

  // 搜索框基于标题、分类和描述过滤当前 Mock 商品列表。
  const filteredProducts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase('zh-CN');
    if (!normalizedKeyword) return products;

    return products.filter((product) =>
      [product.title, product.category, product.description]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase('zh-CN').includes(normalizedKeyword)),
    );
  }, [keyword, products]);

  // HIDDEN 状态执行上架，其余状态执行下架，全部只更新前端 Mock 状态。
  const handleToggleStatus = (productId: number) => {
    requireAuthAction(() => {
      setProducts((current) =>
        current.map((product) =>
          product.id === productId
            ? {
                ...product,
                status: product.status === 'HIDDEN' ? 'ON_SALE' : 'HIDDEN',
                updatedAt: new Date().toISOString(),
              }
            : product,
        ),
      );
      message.success('商品状态已更新');
    });
  };

  // Modal 二次确认后，从当前 Mock 列表中删除目标商品。
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    requireAuthAction(() => {
      setProducts((current) =>
        current.filter((product) => product.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
      message.success('商品已删除');
    });
  };

  const handleRetry = () => {
    sessionStorage.removeItem('myProductsMockLoadError');
    setPageStatus('loading');
    setReloadKey((value) => value + 1);
  };

  const columns: TableProps<Product>['columns'] = [
    {
      title: '商品信息',
      dataIndex: 'title',
      key: 'info',
      render: (_, record) => (
        <Space size={16}>
          <img
            src={record.images[0] ?? '/favicon.svg'}
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
      render: (status: Product['status']) => (
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
          {statusTextMap[status]}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_, record) => {
        return (
          <Space size={12}>
            <Button
              style={{ color: PRIMARY, borderColor: PRIMARY, borderRadius: 8 }}
              onClick={(event) => {
                event.stopPropagation();
                requireAuthAction(() =>
                  navigate(`/product/publish?id=${record.id}`),
                );
              }}
            >
              编辑
            </Button>
            <Button
              style={{ borderRadius: 8 }}
              onClick={(event) => {
                event.stopPropagation();
                handleToggleStatus(record.id);
              }}
            >
              {record.status === 'HIDDEN' ? '上架' : '下架'}
            </Button>
            <Button
              danger
              style={{ borderRadius: 8 }}
              onClick={(event) => {
                event.stopPropagation();
                requireAuthAction(() => setDeleteTarget(record));
              }}
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
            我的发布
          </h1>

          {/* 表格卡片 */}
          <div style={styles.tableCard}>
            {pageStatus === 'loading' ? (
              // loading：模拟商品数据加载期间展示 Spin。
              <div style={{ padding: '80px 0', textAlign: 'center' }}>
                <Spin size="large" tip="正在加载发布商品..." />
              </div>
            ) : pageStatus === 'error' ? (
              // error：Mock 加载失败时展示错误结果和重试入口。
              <Result
                status="error"
                title="商品加载失败"
                subTitle="请稍后重试"
                extra={<Button type="primary" onClick={handleRetry}>重新加载</Button>}
              />
            ) : pageStatus === 'forbidden' ? (
              // forbidden：未登录时通过 M2 登录守卫引导登录。
              <Result
                status="403"
                title="暂无访问权限"
                subTitle="登录后才能管理自己发布的商品"
                extra={
                  <Button
                    type="primary"
                    onClick={() => requireAuthAction(handleRetry)}
                  >
                    去登录
                  </Button>
                }
              />
            ) : filteredProducts.length === 0 ? (
              // empty：没有发布商品或搜索无结果时展示引导提示。
              <Empty
                description={products.length === 0 ? '暂无发布商品' : '暂无符合条件的商品'}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={() => navigate('/publish')}>
                  去发布商品
                </Button>
              </Empty>
            ) : (
              // success：正常渲染支持点击和操作的商品表格。
              <Table<Product>
                rowKey="id"
                columns={columns}
                dataSource={filteredProducts}
                pagination={false}
                onRow={(record) => ({
                  onClick: () => navigate(`/product/${record.id}`),
                })}
              />
            )}
          </div>
        </Content>
      </Layout>

      {/* 删除操作必须经过二次确认，确认后才更新 Mock 列表。 */}
      <Modal
        open={deleteTarget !== null}
        title="确认删除商品"
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        onOk={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        确定要删除“{deleteTarget?.title}”吗？删除后将从当前列表移除。
      </Modal>
    </Layout>
  );
};

export default MyProductsPage;
