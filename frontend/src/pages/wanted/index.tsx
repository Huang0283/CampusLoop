import React, { useEffect, useMemo, useState } from 'react';
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
import { readWantedItems } from '../../mocks/wantedManagement';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

interface WantedItem {
  id: number;
  title: string;
  tag?: 'urgent' | 'negotiable';
  description: string;
  budget: string;
  budgetMin: number;
  budgetMax: number;
  condition: string;
  publisher: string;
  avatar: string;
  time: string;
  createdAt: string;
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

const budgetOptions = [
  { value: '0-100', label: '¥100 以下' },
  { value: '100-500', label: '¥100-500' },
  { value: '500-1000', label: '¥500-1000' },
  { value: '1000-3000', label: '¥1000-3000' },
  { value: '3000+', label: '¥3000 以上' },
];

const conditionOptions = [
  { value: '全新', label: '全新' },
  { value: '几乎全新', label: '几乎全新' },
  { value: '八成新', label: '八成新' },
  { value: '七成新', label: '七成新' },
  { value: '不限成色', label: '不限成色' },
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [filters, setFilters] = useState({
    budget: undefined as string | undefined,
    condition: undefined as string | undefined,
    sort: undefined as string | undefined,
  });

  useEffect(() => {
    let cancelled = false;

    // Phase 2 从持久化 Mock 数据加载；Phase 3 按 page-api-map 替换为 listWanted。
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      try {
        if (sessionStorage.getItem('wantedMockLoadError') === 'true') {
          throw new Error('Mock 求购加载失败');
        }
        if (cancelled) return;
        const normalizedQuery = appliedQuery.trim().toLocaleLowerCase('zh-CN');
        setWantedItems(readWantedItems()
          .filter((item) =>
            !normalizedQuery ||
            [item.title, item.description, item.condition, item.location]
              .filter((value): value is string => Boolean(value))
              .some((value) => value.toLocaleLowerCase('zh-CN').includes(normalizedQuery)),
          )
          .map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description ?? '',
            budget: `¥${item.budgetMin}-${item.budgetMax}`,
            budgetMin: item.budgetMin,
            budgetMax: item.budgetMax,
            condition: item.condition,
            publisher: item.owner.nickname,
            avatar: item.owner.avatar ?? '',
            time: formatCreatedAt(item.createdAt),
            createdAt: item.createdAt,
          })));
      } catch {
        if (!cancelled) {
          setWantedItems([]);
          setError('求购信息加载失败，请稍后重试');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    // 组件卸载后忽略尚未完成的请求结果，避免更新已卸载组件。
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [appliedQuery, reloadKey]);

  const filteredItems = useMemo(() => {
    const result = wantedItems.filter((item) => {
      const conditionMatches =
        !filters.condition ||
        filters.condition === '不限成色' ||
        item.condition === filters.condition;

      const budgetMatches = (() => {
        switch (filters.budget) {
          case '0-100':
            return item.budgetMin < 100;
          case '100-500':
            return item.budgetMax >= 100 && item.budgetMin <= 500;
          case '500-1000':
            return item.budgetMax >= 500 && item.budgetMin <= 1000;
          case '1000-3000':
            return item.budgetMax >= 1000 && item.budgetMin <= 3000;
          case '3000+':
            return item.budgetMax >= 3000;
          default:
            return true;
        }
      })();

      return conditionMatches && budgetMatches;
    });

    return [...result].sort((left, right) => {
      switch (filters.sort) {
        case 'budget-high':
          return right.budgetMax - left.budgetMax;
        case 'budget-low':
          return left.budgetMin - right.budgetMin;
        case 'latest':
          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        default:
          return 0;
      }
    });
  }, [filters.budget, filters.condition, filters.sort, wantedItems]);

  const visibleItems = useMemo(() => {
    const offset = (currentPage - 1) * 10;
    return filteredItems.slice(offset, offset + 10);
  }, [currentPage, filteredItems]);

  const handleFilterChange = (key: keyof typeof filters, value?: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleReset = () => {
    sessionStorage.removeItem('wantedMockLoadError');
    setFilters({
      budget: undefined,
      condition: undefined,
      sort: undefined,
    });
    setSearchText('');
    setAppliedQuery('');
    setCurrentPage(1);
  };

  const handleRetry = () => {
    sessionStorage.removeItem('wantedMockLoadError');
    setReloadKey((value) => value + 1);
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

        <Input.Search
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="搜索求购标题或描述"
          value={searchText}
          allowClear
          enterButton="搜索"
          onChange={(event) => {
            const value = event.target.value;
            setSearchText(value);
            if (!value && appliedQuery) {
              setAppliedQuery('');
              setCurrentPage(1);
            }
          }}
          onSearch={(value) => {
            setAppliedQuery(value.trim());
            setCurrentPage(1);
          }}
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
                  <Alert
                    type="error"
                    showIcon
                    message={error}
                    action={<Button onClick={handleRetry}>重新加载</Button>}
                  />
                </Col>
              ) : filteredItems.length === 0 ? (
                <Col span={24}>
                  <Empty description="暂无求购信息" />
                </Col>
              ) : visibleItems.map((item) => (
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

            {!loading && !error && filteredItems.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: 32,
                }}
              >
                <Pagination
                  current={currentPage}
                  total={filteredItems.length}
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
