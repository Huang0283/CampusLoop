import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Layout,
  Empty,
  Input,
  Space,
  Button,
  Select,
  Card,
  Row,
  Col,
  Tag,
  Pagination,
  Result,
  Spin,
  Typography,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  HeartOutlined,
  HeartFilled,
  EnvironmentOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AppSidebar, NotificationBell, UserMenu } from '../../components';
import { useRequireAuthAction } from '../../hooks/useRequireAuthAction';
import type { Product } from '../../sdk/generated/types.gen';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

// ===================== Mock 数据 =====================
// 使用 satisfies 让每条 Mock 数据都接受生成 SDK 中 Product 类型的静态校验。
const mockProducts = [
  {
    id: 1,
    seller: { id: 101, nickname: '李同学', avatar: 'https://i.pravatar.cc/64?img=11', rating: 4.9, transactionCount: 18 },
    title: 'MacBook Air M1 笔记本电脑',
    category: '数码',
    condition: '九成新',
    description: '个人自用，功能正常，配件齐全。',
    originalPrice: 7999,
    price: 3200,
    campusLocation: '清华大学',
    images: ['https://picsum.photos/seed/macbook/400/250'],
    status: 'ON_SALE',
    createdAt: '2026-09-28T10:00:00+08:00',
    updatedAt: '2026-09-28T10:00:00+08:00',
  },
  {
    id: 2,
    seller: { id: 102, nickname: '王同学', avatar: 'https://i.pravatar.cc/64?img=12', rating: 4.7, transactionCount: 9 },
    title: '大学教材 政治 高数 大学物理等',
    category: '书籍',
    condition: '八成新',
    description: '教材可单本购买，笔记较少。',
    originalPrice: 260,
    price: 80,
    campusLocation: '北京大学',
    images: ['https://picsum.photos/seed/books/400/250'],
    status: 'ON_SALE',
    createdAt: '2026-09-24T09:30:00+08:00',
    updatedAt: '2026-09-24T09:30:00+08:00',
  },
  {
    id: 3,
    seller: { id: 103, nickname: '陈同学', avatar: 'https://i.pravatar.cc/64?img=13', rating: 4.8, transactionCount: 12 },
    title: '小米护眼台灯',
    category: '生活用品',
    condition: '九成新',
    description: '亮度调节正常，适合宿舍书桌。',
    originalPrice: 169,
    price: 60,
    campusLocation: '北京航空航天大学',
    images: ['https://picsum.photos/seed/lamp/400/250'],
    status: 'ON_SALE',
    createdAt: '2026-09-27T18:20:00+08:00',
    updatedAt: '2026-09-27T18:20:00+08:00',
  },
  {
    id: 4,
    seller: { id: 104, nickname: '赵同学', avatar: 'https://i.pravatar.cc/64?img=14', rating: 4.6, transactionCount: 7 },
    title: '捷安特 山地自行车',
    category: '运动',
    condition: '八成新',
    description: '刹车和变速正常，支持校内试骑。',
    originalPrice: 1299,
    price: 500,
    campusLocation: '北京理工大学',
    images: ['https://picsum.photos/seed/bike/400/250'],
    status: 'RESERVED',
    createdAt: '2026-09-20T14:00:00+08:00',
    updatedAt: '2026-09-26T16:00:00+08:00',
  },
  {
    id: 5,
    seller: { id: 105, nickname: '周同学', avatar: 'https://i.pravatar.cc/64?img=15', rating: 5, transactionCount: 23 },
    title: '索尼 WH-1000XM4 头戴耳机',
    category: '数码',
    condition: '九成新',
    description: '降噪正常，耳罩无明显磨损。',
    originalPrice: 2299,
    price: 650,
    campusLocation: '中国人民大学',
    images: ['https://picsum.photos/seed/headphone/400/250'],
    status: 'ON_SALE',
    createdAt: '2026-09-29T08:15:00+08:00',
    updatedAt: '2026-09-29T08:15:00+08:00',
  },
  {
    id: 6,
    seller: { id: 106, nickname: '吴同学', avatar: 'https://i.pravatar.cc/64?img=16', transactionCount: 3 },
    title: '宿舍收纳箱 大号',
    category: '宿舍',
    condition: '全新',
    description: '全新未使用，可折叠收纳。',
    originalPrice: 59,
    price: 30,
    campusLocation: '北京师范大学',
    images: ['https://picsum.photos/seed/box/400/250'],
    status: 'ON_SALE',
    createdAt: '2026-09-23T12:00:00+08:00',
    updatedAt: '2026-09-23T12:00:00+08:00',
  },
  {
    id: 7,
    seller: { id: 107, nickname: '郑同学', avatar: 'https://i.pravatar.cc/64?img=17', rating: 4.5, transactionCount: 6 },
    title: '卡西欧 fx-991CN X 计算器',
    category: '数码',
    condition: '九成新',
    description: '按键灵敏，附保护盖。',
    originalPrice: 178,
    price: 80,
    campusLocation: '对外经济贸易大学',
    images: ['https://picsum.photos/seed/calculator/400/250'],
    status: 'RESERVED',
    createdAt: '2026-09-19T15:45:00+08:00',
    updatedAt: '2026-09-25T11:20:00+08:00',
  },
  {
    id: 8,
    seller: { id: 108, nickname: '孙同学', avatar: 'https://i.pravatar.cc/64?img=18', rating: 4.8, transactionCount: 14 },
    title: '北面 双肩包',
    category: '生活用品',
    condition: '八成新',
    description: '容量大，拉链顺滑，适合日常通勤。',
    originalPrice: 699,
    price: 280,
    campusLocation: '中央财经大学',
    images: ['https://picsum.photos/seed/bag/400/250'],
    status: 'ON_SALE',
    createdAt: '2026-09-22T20:10:00+08:00',
    updatedAt: '2026-09-22T20:10:00+08:00',
  },
  {
    id: 9,
    seller: { id: 109, nickname: '钱同学', avatar: 'https://i.pravatar.cc/64?img=19', rating: 4.9, transactionCount: 20 },
    title: '羽毛球拍 双拍套装',
    category: '运动',
    condition: '七成新',
    description: '球拍无裂痕，附拍套和手胶。',
    originalPrice: 399,
    price: 150,
    campusLocation: '清华大学',
    images: ['https://picsum.photos/seed/badminton/400/250'],
    status: 'ON_SALE',
    createdAt: '2026-09-26T13:30:00+08:00',
    updatedAt: '2026-09-26T13:30:00+08:00',
  },
  {
    id: 10,
    seller: { id: 110, nickname: '冯同学', avatar: 'https://i.pravatar.cc/64?img=20', rating: 4.6, transactionCount: 5 },
    title: 'Kindle Paperwhite 阅读器',
    category: '数码',
    condition: '八成新',
    description: '屏幕显示正常，续航良好。',
    originalPrice: 998,
    price: 420,
    campusLocation: '北京大学',
    images: ['https://picsum.photos/seed/kindle/400/250'],
    status: 'ON_SALE',
    createdAt: '2026-09-25T17:00:00+08:00',
    updatedAt: '2026-09-25T17:00:00+08:00',
  },
  {
    id: 11,
    seller: { id: 111, nickname: '褚同学', avatar: 'https://i.pravatar.cc/64?img=21', transactionCount: 2 },
    title: '宿舍床上桌 可折叠',
    category: '宿舍',
    condition: '九成新',
    description: '桌面平整，折叠支架稳固。',
    originalPrice: 89,
    price: 45,
    campusLocation: '北京航空航天大学',
    images: ['https://picsum.photos/seed/desk/400/250'],
    status: 'SOLD',
    createdAt: '2026-09-18T19:00:00+08:00',
    updatedAt: '2026-09-24T10:00:00+08:00',
  },
  {
    id: 12,
    seller: { id: 112, nickname: '卫同学', avatar: 'https://i.pravatar.cc/64?img=22', rating: 4.7, transactionCount: 11 },
    title: '英语六级真题与词汇书',
    category: '书籍',
    condition: '七成新',
    description: '部分页面有少量笔记，不影响使用。',
    originalPrice: 120,
    price: 35,
    campusLocation: '北京理工大学',
    images: ['https://picsum.photos/seed/cet6/400/250'],
    status: 'HIDDEN',
    createdAt: '2026-09-17T08:30:00+08:00',
    updatedAt: '2026-09-21T09:00:00+08:00',
  },
] satisfies Product[];

const categories = ['全部', '数码', '书籍', '生活用品', '运动', '宿舍'];

const priceOptions = [
  { value: 'all', label: '不限' },
  { value: '0-50', label: '50元以下' },
  { value: '50-200', label: '50-200元' },
  { value: '200-1000', label: '200-1000元' },
  { value: '1000+', label: '1000元以上' },
];

const conditionOptions = [
  { value: 'all', label: '不限' },
  { value: 'new', label: '全新' },
  { value: '90', label: '九成新' },
  { value: '80', label: '八成新' },
  { value: '70', label: '七成新及以下' },
];

const locationOptions = [
  { value: 'all', label: '全部学校' },
  { value: 'thu', label: '清华大学' },
  { value: 'pku', label: '北京大学' },
  { value: 'buaa', label: '北京航空航天大学' },
  { value: 'bit', label: '北京理工大学' },
  { value: 'ruc', label: '中国人民大学' },
];

const sortOptions = [
  { value: 'default', label: '综合排序' },
  { value: 'newest', label: '最新发布' },
  { value: 'price-asc', label: '价格从低到高' },
  { value: 'price-desc', label: '价格从高到低' },
];

const productStatusText: Record<Product['status'], string> = {
  ON_SALE: '在售',
  RESERVED: '已预约',
  SOLD: '已售出',
  HIDDEN: '已下架',
};

const productStatusColor: Record<Product['status'], string> = {
  ON_SALE: 'green',
  RESERVED: 'orange',
  SOLD: 'default',
  HIDDEN: 'red',
};

// ===================== 商品卡片 =====================
const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const [liked, setLiked] = useState(false);
  const navigate = useNavigate();
  const requireAuthAction = useRequireAuthAction();

  return (
    <Card
      hoverable
      onClick={() => navigate(`/product/${product.id}`)}
      styles={{ body: { padding: 0 } }}
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #f0f0f0',
        background: '#fff',
      }}
    >
      <div style={{ position: 'relative' }}>
        <img
          src={product.images[0] ?? '/favicon.svg'}
          alt={product.title}
          style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
        />
        <Tag
          color={productStatusColor[product.status]}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            marginRight: 0,
            borderRadius: 6,
            fontWeight: 500,
            border: 'none',
          }}
        >
          {productStatusText[product.status]}
        </Tag>
        <Button
          type="text"
          shape="circle"
          icon={
            liked ? (
              <HeartFilled style={{ color: '#ff4d4f', fontSize: 18 }} />
            ) : (
              <HeartOutlined style={{ color: '#fff', fontSize: 18 }} />
            )
          }
          onClick={(event) => {
            event.stopPropagation();
            // 收藏属于登录操作，未登录时由统一守卫引导至登录页。
            requireAuthAction(() => setLiked((previous) => !previous));
          }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(4px)',
          }}
        />
      </div>
      <div style={{ padding: '14px 16px 16px' }}>
        <Text
          strong
          style={{ fontSize: 15, display: 'block', marginBottom: 8 }}
          ellipsis={{ tooltip: product.title }}
        >
          {product.title}
        </Text>
        <Space align="center" style={{ width: '100%', marginBottom: 8 }}>
          <Text style={{ color: '#1677ff', fontSize: 18, fontWeight: 700 }}>
            ¥{product.price}
          </Text>
          <Tag
            color="green"
            style={{ marginLeft: 'auto', borderRadius: 6, border: 'none', fontWeight: 500 }}
          >
            {product.condition}
          </Tag>
        </Space>
        <Space size={4} style={{ color: '#8c8c8c', fontSize: 13 }}>
          <EnvironmentOutlined />
          <span>{product.campusLocation ?? '地点未填写'}</span>
        </Space>
      </div>
    </Card>
  );
};

// ===================== 页面组件 =====================
type PageStatus = 'loading' | 'success' | 'error' | 'forbidden';

const MarketPage: React.FC = () => {
  const navigate = useNavigate();
  const requireAuthAction = useRequireAuthAction();
  const [products, setProducts] = useState<Product[]>([]);
  const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [price, setPrice] = useState('all');
  const [condition, setCondition] = useState('all');
  const [location, setLocation] = useState('all');
  const [sort, setSort] = useState('default');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    let cancelled = false;

    // 模拟异步加载，以便页面能真实呈现 loading / error / success 状态。
    const timer = window.setTimeout(() => {
      if (cancelled) return;

      try {
        // 开发测试时可设置此 sessionStorage 标记来验证错误状态。
        if (sessionStorage.getItem('marketMockLoadError') === 'true') {
          throw new Error('Mock 商品加载失败');
        }

        // 市场路由当前需要登录；缺少凭证时显示无权限状态作为兜底。
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

  const handleReset = () => {
    setKeyword('');
    setActiveCategory('全部');
    setPrice('all');
    setCondition('all');
    setLocation('all');
    setSort('default');
    setPage(1);
  };

  // 按关键词、分类、价格、成色和地点组合过滤，再按用户选择排序。
  const filteredProducts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase('zh-CN');
    const locationName = locationOptions.find((option) => option.value === location)?.label;

    const filtered = products.filter((product) => {
      const matchesKeyword =
        !normalizedKeyword ||
        [product.title, product.description, product.category, product.seller.nickname]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLocaleLowerCase('zh-CN').includes(normalizedKeyword));
      const matchesCategory =
        activeCategory === '全部' || product.category === activeCategory;
      const matchesPrice =
        price === 'all' ||
        (price === '0-50' && product.price < 50) ||
        (price === '50-200' && product.price >= 50 && product.price <= 200) ||
        (price === '200-1000' && product.price > 200 && product.price <= 1000) ||
        (price === '1000+' && product.price > 1000);
      const matchesCondition =
        condition === 'all' ||
        (condition === 'new' && product.condition === '全新') ||
        (condition === '90' && product.condition === '九成新') ||
        (condition === '80' && product.condition === '八成新') ||
        (condition === '70' && ['七成新', '六成新', '五成新'].includes(product.condition));
      const matchesLocation =
        location === 'all' || product.campusLocation === locationName;

      return (
        matchesKeyword &&
        matchesCategory &&
        matchesPrice &&
        matchesCondition &&
        matchesLocation
      );
    });

    return [...filtered].sort((left, right) => {
      if (sort === 'price-asc') return left.price - right.price;
      if (sort === 'price-desc') return right.price - left.price;
      if (sort === 'newest') {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }
      return 0;
    });
  }, [activeCategory, condition, keyword, location, price, products, sort]);

  // 过滤和排序完成后，再截取当前页需要展示的商品。
  const paginatedProducts = filteredProducts.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const handleRetry = () => {
    setPageStatus('loading');
    setReloadKey((value) => value + 1);
  };

  const selectStyle: React.CSSProperties = { width: 150 };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f6f8' }}>
      {/* ================= 左侧侧边栏 ================= */}
      <Sider
        width={220}
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <AppSidebar />
      </Sider>

      <Layout style={{ background: '#f5f6f8' }}>
        {/* ================= 顶部导航栏 ================= */}
        <Header
          style={{
            background: '#fff',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            borderBottom: '1px solid #f0f0f0',
            height: 64,
            lineHeight: 'normal',
          }}
        >
          <Input
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="搜索校园好物"
            value={keyword}
            onChange={(event) => {
              // 搜索关键词变化时立即过滤，并回到第一页。
              setKeyword(event.target.value);
              setPage(1);
            }}
            style={{ maxWidth: 420, borderRadius: 20, height: 40 }}
            allowClear
          />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
            <NotificationBell />
            <UserMenu />
          </div>
        </Header>

        <Content style={{ padding: '24px 32px 48px' }}>
          {/* ================= 分类按钮 + 发布求购 ================= */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <Space size={12} wrap>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  type={activeCategory === cat ? 'primary' : 'default'}
                  shape="round"
                  onClick={() => {
                    setActiveCategory(cat);
                    setPage(1);
                  }}
                  style={
                    activeCategory === cat
                      ? { height: 40, padding: '0 24px', fontSize: 15 }
                      : {
                          height: 40,
                          padding: '0 24px',
                          fontSize: 15,
                          background: '#fff',
                          borderColor: '#e5e6eb',
                        }
                  }
                >
                  {cat}
                </Button>
              ))}
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => requireAuthAction(() => navigate('/publish'))}
              style={{ height: 40, borderRadius: 8, fontSize: 15, padding: '0 20px' }}
            >
              发布商品
            </Button>
          </div>

          {/* ================= 筛选栏 ================= */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <Select
              value={price}
              options={priceOptions}
              onChange={(value) => {
                setPrice(value);
                setPage(1);
              }}
              style={selectStyle}
              placeholder="价格"
            />
            <Select
              value={condition}
              options={conditionOptions}
              onChange={(value) => {
                setCondition(value);
                setPage(1);
              }}
              style={selectStyle}
              placeholder="成色"
            />
            <Select
              value={location}
              options={locationOptions}
              onChange={(value) => {
                setLocation(value);
                setPage(1);
              }}
              style={selectStyle}
              placeholder="地点"
            />
            <Select
              value={sort}
              options={sortOptions}
              onChange={(value) => {
                setSort(value);
                setPage(1);
              }}
              style={selectStyle}
              placeholder="排序"
            />
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={handleReset}
              style={{ color: '#8c8c8c', marginLeft: 'auto' }}
            >
              重置筛选
            </Button>
          </div>

          {/* ================= 商品卡片网格 ================= */}
          {pageStatus === 'loading' ? (
            // loading：Mock 数据异步装载期间展示加载提示。
            <div style={{ padding: 64, textAlign: 'center' }}>
              <Spin size="large" tip="正在加载商品..." />
            </div>
          ) : pageStatus === 'error' ? (
            // error：Mock 加载异常时提供明确错误信息和重试入口。
            <Alert
              type="error"
              showIcon
              message="商品加载失败"
              description="请稍后重试"
              action={<Button onClick={handleRetry}>重新加载</Button>}
            />
          ) : pageStatus === 'forbidden' ? (
            // forbidden：需要登录但缺少凭证时显示无权限提示。
            <Result
              status="403"
              title="暂无访问权限"
              subTitle="请先登录后查看市场商品"
              extra={<Button type="primary" onClick={() => navigate('/login')}>去登录</Button>}
            />
          ) : filteredProducts.length === 0 ? (
            // empty：搜索或筛选后没有匹配商品时展示空状态。
            <Empty description="暂无符合条件的商品" />
          ) : (
            // success：正常展示过滤、排序并分页后的商品列表。
            <Row gutter={[24, 24]}>
              {paginatedProducts.map((product) => (
                <Col key={product.id} xs={24} sm={12} md={8} lg={6}>
                  <ProductCard product={product} />
                </Col>
              ))}
            </Row>
          )}

          {/* ================= 分页 ================= */}
          {pageStatus === 'success' && filteredProducts.length > 0 && <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <Pagination
              current={page}
              total={filteredProducts.length}
              pageSize={pageSize}
              onChange={setPage}
              showSizeChanger={false}
            />
          </div>}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MarketPage;
