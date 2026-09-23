import React, { useEffect, useState } from 'react';
import {
  Alert,
  Layout,
  Input,
  Select,
  Button,
  Avatar,
  Card,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Empty,
  Pagination,
  Spin,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AppSidebar, NotificationBell, UserMenu } from '../../components';
import { listWanted } from '../../sdk/generated/sdk.gen';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

interface WantedItem {
  id: number;
  title: string;
  tag?: 'urgent' | 'negotiable';
  description: string;
  budget: string;
  condition: string;
  publisher: string;
  avatar: string;
  time: string;
}

// 将接口时间转换为页面展示所需的中文格式。
const formatCreatedAt = (createdAt: string) => {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime())
    ? createdAt
    : date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
};

const categoryOptions = [
  { value: 'digital', label: '数码电子' },
  { value: 'books', label: '图书教材' },
  { value: 'life', label: '生活用品' },
  { value: 'sports', label: '运动户外' },
  { value: 'others', label: '其他' },
];

const budgetOptions = [
  { value: '0-100', label: '¥100 以下' },
  { value: '100-500', label: '¥100-500' },
  { value: '500-1000', label: '¥500-1000' },
  { value: '1000-3000', label: '¥1000-3000' },
  { value: '3000+', label: '¥3000 以上' },
];

const conditionOptions = [
  { value: 'new', label: '全新' },
  { value: 'like-new', label: '几乎全新' },
  { value: 'eighty', label: '八成新' },
  { value: 'seventy', label: '七成新' },
  { value: 'any', label: '不限成色' },
];

const sortOptions = [
  { value: 'latest', label: '最新发布' },
  { value: 'budget-high', label: '预算从高到低' },
  { value: 'budget-low', label: '预算从低到高' },
];

const WantedPage: React.FC = () => {
  const navigate = useNavigate();
  const [wantedItems, setWantedItems] = useState<WantedItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    category: undefined as string | undefined,
    budget: undefined as string | undefined,
    condition: undefined as string | undefined,
    sort: undefined as string | undefined,
  });

  useEffect(() => {
    let cancelled = false;

    // 页面加载时从后端获取求购列表，并映射为现有卡片使用的数据结构。
    const fetchWantedItems = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await listWanted({
          query: { page: currentPage, pageSize: 10 },
          throwOnError: true,
        });

        if (cancelled) return;

        setWantedItems(
          response.data.items.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description ?? '',
            budget: `¥${item.budgetMin}-${item.budgetMax}`,
            condition: item.condition,
            publisher: item.owner.nickname,
            avatar: item.owner.avatar ?? '',
            time: formatCreatedAt(item.createdAt),
          })),
        );
        setTotal(response.data.pagination.total);
      } catch {
        if (!cancelled) {
          setWantedItems([]);
          setTotal(0);
          setError('求购信息加载失败，请稍后重试');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchWantedItems();

    // 组件卸载后忽略尚未完成的请求结果，避免更新已卸载组件。
    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  const handleFilterChange = (key: keyof typeof filters, value?: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({
      category: undefined,
      budget: undefined,
      condition: undefined,
      sort: undefined,
    });
  };

  const renderTag = (tag?: WantedItem['tag']) => {
    if (tag === 'urgent') {
      return (
        <Tag color="red" style={{ marginLeft: 8, borderRadius: 4 }}>
          急需
        </Tag>
      );
    }
    if (tag === 'negotiable') {
      return (
        <Tag color="blue" style={{ marginLeft: 8, borderRadius: 4 }}>
          可议价
        </Tag>
      );
    }
    return null;
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header
        style={{
          position: 'fixed',
          top: 0,
          left: 220,
          right: 0,
          zIndex: 100,
          height: 64,
          padding: '0 24px',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e5e5e5',
        }}
      >
        {/* Logo 已统一到左侧栏 AppSidebar，这里仅保留占位以维持顶栏布局 */}
        <div style={{ width: 220 }} />

        <Input
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="搜索校园好物"
          style={{
            maxWidth: 480,
            height: 40,
            borderRadius: 20,
            background: '#f5f5f5',
          }}
        />

        <Space size={20} style={{ width: 220, justifyContent: 'flex-end' }}>
          <NotificationBell />
          <UserMenu />
        </Space>
      </Header>

      <Layout style={{ marginTop: 64, background: '#f5f5f5' }}>
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
          }}
        >
          <AppSidebar />
        </Sider>

        <Content style={{ marginLeft: 220, padding: '24px 40px 40px' }}>
          <Card
            style={{
              maxWidth: 1360,
              margin: '0 auto',
              borderRadius: 12,
              border: '1px solid #e5e5e5',
              background: '#ffffff',
            }}
            bodyStyle={{ padding: '28px 32px 32px' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 24,
              }}
            >
              <div>
                <Title level={3} style={{ marginBottom: 4, fontWeight: 700 }}>
                  求购市场
                </Title>
                <Text type="secondary" style={{ fontSize: 14 }}>
                  看看同学们正在寻找什么
                </Text>
              </div>
              <Button
                type="primary"
                size="large"
                style={{ borderRadius: 8 }}
                onClick={() => navigate('/wanted/publish')}
              >
                发布求购
              </Button>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <Space size={12}>
                <Select
                  placeholder="分类"
                  value={filters.category}
                  onChange={(value) => handleFilterChange('category', value)}
                  options={categoryOptions}
                  style={{ width: 200 }}
                  allowClear
                />
                <Select
                  placeholder="预算范围"
                  value={filters.budget}
                  onChange={(value) => handleFilterChange('budget', value)}
                  options={budgetOptions}
                  style={{ width: 200 }}
                  allowClear
                />
                <Select
                  placeholder="最低成色"
                  value={filters.condition}
                  onChange={(value) => handleFilterChange('condition', value)}
                  options={conditionOptions}
                  style={{ width: 200 }}
                  allowClear
                />
                <Select
                  placeholder="排序"
                  value={filters.sort}
                  onChange={(value) => handleFilterChange('sort', value)}
                  options={sortOptions}
                  style={{ width: 200 }}
                  allowClear
                />
              </Space>
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={handleReset}
                style={{ color: '#666666' }}
              >
                重置筛选
              </Button>
            </div>

            <Row gutter={[16, 16]}>
              {loading ? (
                <Col span={24}>
                  <div style={{ padding: 48, textAlign: 'center' }}>
                    <Spin tip="正在加载求购信息..." />
                  </div>
                </Col>
              ) : error ? (
                <Col span={24}>
                  <Alert type="error" showIcon message={error} />
                </Col>
              ) : wantedItems.length === 0 ? (
                <Col span={24}>
                  <Empty description="暂无求购信息" />
                </Col>
              ) : wantedItems.map((item) => (
                <Col span={12} key={item.id}>
                  <Card
                    hoverable
                    onClick={() => navigate(`/wanted/${item.id}`)}
                    style={{
                      borderRadius: 8,
                      border: '1px solid #e5e5e5',
                      background: '#ffffff',
                    }}
                    bodyStyle={{ padding: '20px 24px' }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <Text
                        strong
                        style={{ fontSize: 17, color: '#222222' }}
                      >
                        {item.title}
                      </Text>
                      {renderTag(item.tag)}
                    </div>

                    <Text
                      type="secondary"
                      style={{ fontSize: 14, color: '#666666' }}
                    >
                      {item.description}
                    </Text>

                    <div
                      style={{
                        display: 'flex',
                        gap: 32,
                        marginTop: 14,
                        fontSize: 14,
                        color: '#666666',
                      }}
                    >
                      <Space size={8}>
                        <span
                          style={{
                            color: '#1677ff',
                            fontWeight: 700,
                            fontSize: 15,
                          }}
                        >
                          ¥
                        </span>
                        <Text style={{ color: '#666666' }}>预算</Text>
                        <Text strong style={{ color: '#222222' }}>
                          {item.budget}
                        </Text>
                      </Space>
                      <Space size={8}>
                        <InboxOutlined style={{ color: '#1677ff' }} />
                        <Text style={{ color: '#666666' }}>
                          最低成色：{item.condition}
                        </Text>
                      </Space>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 18,
                      }}
                    >
                      <Avatar src={item.avatar} size={28} />
                      <Text style={{ fontSize: 14, color: '#222222' }}>
                        {item.publisher}
                      </Text>
                      <Space size={6} style={{ marginLeft: 8 }}>
                        <ClockCircleOutlined
                          style={{ fontSize: 13, color: '#666666' }}
                        />
                        <Text style={{ fontSize: 13, color: '#666666' }}>
                          {item.time}
                        </Text>
                      </Space>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {!loading && !error && wantedItems.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: 32,
                }}
              >
                <Pagination
                  current={currentPage}
                  total={total}
                  pageSize={10}
                  onChange={setCurrentPage}
                />
              </div>
            )}
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
};

export default WantedPage;
