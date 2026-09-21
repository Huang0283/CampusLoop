import React, { useState } from 'react';
import { Layout, Input, Avatar, Space, Menu, Tabs, Table, Button, Pagination } from 'antd';
import type { MenuProps, TabsProps, TableProps, PaginationProps } from 'antd';
import {
  UserOutlined,
  ShopOutlined,
  WarningOutlined,
  BarChartOutlined,
  SearchOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { AppSidebar, NotificationBell, UserMenu } from '../../components';

const { Header, Sider, Content } = Layout;

// -------------------- Mock 数据 --------------------
interface UserItem {
  id: string;
  avatar: string;
  nickname: string;
  email: string;
  tradeCount: number;
  creditScore: number;
}

const userList: UserItem[] = [
  { id: 'U10001', avatar: 'https://picsum.photos/seed/u10001/64/64', nickname: '林同学', email: 'linxue@campus.edu', tradeCount: 28, creditScore: 98 },
  { id: 'U10002', avatar: 'https://picsum.photos/seed/u10002/64/64', nickname: '小陈同学', email: 'chenxx@campus.edu', tradeCount: 16, creditScore: 85 },
  { id: 'U10003', avatar: 'https://picsum.photos/seed/u10003/64/64', nickname: 'Tracy', email: 'tracy@campus.edu', tradeCount: 42, creditScore: 100 },
  { id: 'U10004', avatar: 'https://picsum.photos/seed/u10004/64/64', nickname: '白昼', email: 'baizhou@campus.edu', tradeCount: 7, creditScore: 76 },
  { id: 'U10005', avatar: 'https://picsum.photos/seed/u10005/64/64', nickname: 'Leo', email: 'leo@campus.edu', tradeCount: 31, creditScore: 92 },
  { id: 'U10006', avatar: 'https://picsum.photos/seed/u10006/64/64', nickname: '丸子', email: 'wanzi@campus.edu', tradeCount: 12, creditScore: 88 },
  { id: 'U10007', avatar: 'https://picsum.photos/seed/u10007/64/64', nickname: '阿杰', email: 'ajie@campus.edu', tradeCount: 25, creditScore: 90 },
  { id: 'U10008', avatar: 'https://picsum.photos/seed/u10008/64/64', nickname: 'Kiki', email: 'kiki@campus.edu', tradeCount: 9, creditScore: 80 },
  { id: 'U10009', avatar: 'https://picsum.photos/seed/u10009/64/64', nickname: '旺财', email: 'wangcai@campus.edu', tradeCount: 19, creditScore: 87 },
  { id: 'U10010', avatar: 'https://picsum.photos/seed/u10010/64/64', nickname: 'Sophie', email: 'sophie@campus.edu', tradeCount: 34, creditScore: 95 },
];

const PRIMARY = '#2f6bff';
const BG = '#f5f6f8';
const CARD_BG = '#ffffff';
const TEXT_MAIN = '#1f2329';
const BORDER = '#eef0f3';

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
  tableCard: {
    background: CARD_BG,
    borderRadius: 12,
    padding: '24px 28px',
    marginTop: 8,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
};

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');

  const siderItems: MenuProps['items'] = [
    { key: 'users', icon: <UserOutlined />, label: '用户管理' },
    { key: 'products', icon: <ShopOutlined />, label: '商品管理' },
    { key: 'reports', icon: <WarningOutlined />, label: '举报管理' },
    { key: 'stats', icon: <BarChartOutlined />, label: '数据统计' },
  ];


  const tabItems: TabsProps['items'] = [
    { key: 'users', label: '用户管理' },
    { key: 'products', label: '商品管理' },
    { key: 'reports', label: '举报管理' },
    { key: 'stats', label: '数据统计' },
  ];

  const filteredUsers = userList.filter((user) => {
    if (!searchKeyword.trim()) return true;
    const keyword = searchKeyword.trim().toLowerCase();
    return (
      user.id.toLowerCase().includes(keyword) ||
      user.nickname.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword)
    );
  });

  const columns: TableProps<UserItem>['columns'] = [
    {
      title: '用户 ID',
      dataIndex: 'id',
      key: 'id',
      width: 140,
    },
    {
      title: '头像',
      dataIndex: 'avatar',
      key: 'avatar',
      width: 90,
      render: (avatar: string, record) => <Avatar src={avatar} size={36} alt={record.nickname} />,
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '交易次数',
      dataIndex: 'tradeCount',
      key: 'tradeCount',
      width: 110,
    },
    {
      title: '信誉分',
      dataIndex: 'creditScore',
      key: 'creditScore',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space size={16}>
          <Button
            type="link"
            size="small"
            style={{ padding: 0 }}
            onClick={() => console.log('编辑用户：', record.id)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            style={{ padding: 0 }}
            onClick={() => console.log('禁用用户：', record.id)}
          >
            禁用
          </Button>
        </Space>
      ),
    },
  ];

  const pagination: PaginationProps = {
    current: currentPage,
    total: filteredUsers.length,
    pageSize: 10,
    showTotal: (total) => `共 ${total} 条`,
    onChange: setCurrentPage,
    showSizeChanger: false,
    style: { marginTop: 20, textAlign: 'right' },
  };

  return (
    <Layout style={styles.layout}>
      {/* 顶部导航栏 */}
      <Header style={styles.header}>
        {/* Logo 已统一到左侧栏 AppSidebar，这里仅保留占位以维持顶栏布局 */}
        <div style={{ width: 220 }} />
        <Input
          prefix={<SearchOutlined style={{ color: '#999' }} />}
          placeholder="搜索用户、商品或内容..."
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
          <Menu
            mode="inline"
            selectedKeys={['users']}
            items={siderItems}
            style={{ borderInlineEnd: 'none', fontSize: 15 }}
          />
        </Sider>

        {/* 主内容区 */}
        <Content style={styles.content}>
          {/* 标题 */}
          <h1 style={{ margin: '0 0 8px 0', fontSize: 28, fontWeight: 700, color: TEXT_MAIN }}>
            管理后台
          </h1>

          {/* Tab 切换 */}
          <Tabs
            activeKey={activeTab}
            items={tabItems}
            onChange={setActiveTab}
            style={{ marginBottom: 0 }}
          />

          {/* 表格卡片 */}
          <div style={styles.tableCard}>
            {/* 操作栏 */}
            <div style={styles.toolbar}>
              <Input
                prefix={<SearchOutlined style={{ color: '#999' }} />}
                placeholder="搜索用户 ID、昵称或邮箱..."
                style={{ width: 360, borderRadius: 8 }}
                allowClear
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                style={{ background: PRIMARY, borderRadius: 8 }}
                onClick={() => console.log('新增用户')}
              >
                新增用户
              </Button>
            </div>

            {/* 用户表格 */}
            <Table<UserItem>
              rowKey="id"
              columns={columns}
              dataSource={filteredUsers}
              pagination={false}
              bordered
              style={{ borderRadius: 8, overflow: 'hidden' }}
            />

            {/* 分页 */}
            <Pagination {...pagination} />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminPage;
