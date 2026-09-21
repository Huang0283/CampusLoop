import React, { useState } from 'react';
import {
  Layout,
  Input,
  Badge,
  Avatar,
  Dropdown,
  Space,
  Button,
  Select,
  Card,
  Row,
  Col,
  Tag,
  Pagination,
  Typography,
} from 'antd';
import {
  SearchOutlined,
  BellOutlined,
  DownOutlined,
  PlusOutlined,
  HeartOutlined,
  HeartFilled,
  EnvironmentOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '../../components';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

// ===================== Mock 数据 =====================
interface Product {
  id: number;
  title: string;
  price: number;
  condition: string;
  school: string;
  status: '在售' | '已预约';
  category: string;
  image: string;
}

const mockProducts: Product[] = [
  {
    id: 1,
    title: 'MacBook Air M1 笔记本电脑',
    price: 3200,
    condition: '九成新',
    school: '清华大学',
    status: '在售',
    category: '数码',
    image: 'https://picsum.photos/seed/macbook/400/250',
  },
  {
    id: 2,
    title: '大学教材 政治 高数 大学物理等',
    price: 80,
    condition: '八成新',
    school: '北京大学',
    status: '在售',
    category: '书籍',
    image: 'https://picsum.photos/seed/books/400/250',
  },
  {
    id: 3,
    title: '小米护眼台灯',
    price: 60,
    condition: '九成新',
    school: '北京航空航天大学',
    status: '在售',
    category: '生活用品',
    image: 'https://picsum.photos/seed/lamp/400/250',
  },
  {
    id: 4,
    title: '捷安特 山地自行车',
    price: 500,
    condition: '八成新',
    school: '北京理工大学',
    status: '已预约',
    category: '运动',
    image: 'https://picsum.photos/seed/bike/400/250',
  },
  {
    id: 5,
    title: '索尼 WH-1000XM4 头戴耳机',
    price: 650,
    condition: '九成新',
    school: '中国人民大学',
    status: '在售',
    category: '数码',
    image: 'https://picsum.photos/seed/headphone/400/250',
  },
  {
    id: 6,
    title: '宿舍收纳箱 大号',
    price: 30,
    condition: '全新',
    school: '北京师范大学',
    status: '在售',
    category: '宿舍',
    image: 'https://picsum.photos/seed/box/400/250',
  },
  {
    id: 7,
    title: '卡西欧 fx-991CN X 计算器',
    price: 80,
    condition: '九成新',
    school: '对外经济贸易大学',
    status: '已预约',
    category: '数码',
    image: 'https://picsum.photos/seed/calculator/400/250',
  },
  {
    id: 8,
    title: '北面 双肩包',
    price: 280,
    condition: '八成新',
    school: '中央财经大学',
    status: '在售',
    category: '生活用品',
    image: 'https://picsum.photos/seed/bag/400/250',
  },
];

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

// ===================== 商品卡片 =====================
const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const [liked, setLiked] = useState(false);
  const navigate = useNavigate();

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
          src={product.image}
          alt={product.title}
          style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
        />
        <Tag
          color={product.status === '在售' ? 'green' : 'orange'}
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
          {product.status}
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
            setLiked(!liked);
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
          <span>{product.school}</span>
        </Space>
      </div>
    </Card>
  );
};

// ===================== 页面组件 =====================
const MarketPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('全部');
  const [price, setPrice] = useState('all');
  const [condition, setCondition] = useState('all');
  const [location, setLocation] = useState('all');
  const [sort, setSort] = useState('default');
  const [page, setPage] = useState(1);

  const handleReset = () => {
    setPrice('all');
    setCondition('all');
    setLocation('all');
    setSort('default');
  };

  const filteredProducts =
    activeCategory === '全部'
      ? mockProducts
      : mockProducts.filter((p) => p.category === activeCategory);

  const userMenu = {
    items: [{ key: 'profile', label: '个人中心' }, { key: 'logout', label: '退出登录' }],
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
            style={{ maxWidth: 420, borderRadius: 20, height: 40 }}
            allowClear
          />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
            <Badge count={3} size="small">
              <BellOutlined style={{ fontSize: 18, color: '#595959', cursor: 'pointer' }} />
            </Badge>
            <Dropdown menu={userMenu}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar src="https://picsum.photos/seed/avatar/80/80" size={36} />
                <span style={{ fontSize: 14, color: '#262626' }}>同学</span>
                <DownOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
              </Space>
            </Dropdown>
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
              onClick={() => navigate('/publish')}
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
              onChange={setPrice}
              style={selectStyle}
              placeholder="价格"
            />
            <Select
              value={condition}
              options={conditionOptions}
              onChange={setCondition}
              style={selectStyle}
              placeholder="成色"
            />
            <Select
              value={location}
              options={locationOptions}
              onChange={setLocation}
              style={selectStyle}
              placeholder="地点"
            />
            <Select
              value={sort}
              options={sortOptions}
              onChange={setSort}
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
          <Row gutter={[24, 24]}>
            {filteredProducts.map((product) => (
              <Col key={product.id} xs={24} sm={12} md={8} lg={6}>
                <ProductCard product={product} />
              </Col>
            ))}
          </Row>

          {/* ================= 分页 ================= */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <Pagination
              current={page}
              total={50}
              pageSize={8}
              onChange={setPage}
              showSizeChanger={false}
            />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MarketPage;
