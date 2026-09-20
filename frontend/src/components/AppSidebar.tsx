/**
 * 全站统一的左侧导航（Logo + 导航项）
 *
 * 背景：各页面此前各写一份 Logo 与导航，出现图标、字号、间距、高亮规则不一致。
 * 现在唯一实现放在这里，所有页面只引用本组件：
 * - Logo：图标 ReadOutlined + 文案 CampusLoop，字号 18 / 700，图标与文字间距 8，整块内边距 20/24
 * - 导航项图标：首页 HomeOutlined / 市场 ShopOutlined / 求购 FileSearchOutlined / 聊天 MessageOutlined / 交易 SwapOutlined
 * - 高亮项由当前路由推导（不再由页面各自传），因此点击导航跳转后侧边栏外观保持一致
 *
 * 用法：放在页面自己的 Sider / aside 容器内；容器宽度统一 220。
 */

import { Menu, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  FileSearchOutlined,
  HomeOutlined,
  MessageOutlined,
  ReadOutlined,
  ShopOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';

const { Text } = Typography;

/** 与 /market 一致的品牌蓝 */
export const BRAND_COLOR = '#1677ff';
const TEXT_PRIMARY = '#1f2329';

/** 侧边栏容器样式：所有页面共用，保证宽度与分隔线一致 */
export const SIDEBAR_WIDTH = 220;

const NAV_ITEMS: NonNullable<MenuProps['items']> = [
  { key: 'home', icon: <HomeOutlined />, label: '首页' },
  { key: 'market', icon: <ShopOutlined />, label: '市场' },
  { key: 'wanted', icon: <FileSearchOutlined />, label: '求购' },
  { key: 'chat', icon: <MessageOutlined />, label: '聊天' },
  { key: 'transaction', icon: <SwapOutlined />, label: '交易' },
];

const NAV_PATHS: Record<string, string> = {
  home: '/market',
  market: '/market',
  wanted: '/wanted',
  chat: '/chat',
  transaction: '/transactions',
};

/** 由当前路由推导高亮项 */
export function resolveActiveKey(pathname: string): string[] {
  if (pathname.startsWith('/chat')) return ['chat'];
  if (pathname.startsWith('/wanted')) return ['wanted'];
  if (
    pathname.startsWith('/transactions') ||
    pathname.startsWith('/profile/transactions') ||
    pathname.includes('/review') ||
    pathname.includes('/meetup')
  ) {
    return ['transaction'];
  }
  if (pathname === '/' || pathname.startsWith('/market') || pathname.startsWith('/product')) return ['market'];
  return [];
}

/** 统一 Logo：图标 + 文案 + 字号 + 间距全站一致 */
export function SidebarLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 24px' }}>
      <ReadOutlined style={{ fontSize: 26, color: BRAND_COLOR }} />
      <Text strong style={{ fontSize: 18, color: TEXT_PRIMARY }}>
        CampusLoop
      </Text>
    </div>
  );
}

/** 统一导航：图标与高亮规则全站一致 */
export function SidebarNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <Menu
      mode="inline"
      selectedKeys={resolveActiveKey(pathname)}
      style={{ borderRight: 'none', fontSize: 15 }}
      items={NAV_ITEMS}
      onClick={({ key }) => navigate(NAV_PATHS[key])}
    />
  );
}

/** SidebarLogo + SidebarNav：放进页面的 Sider / aside 容器即可 */
export default function AppSidebar() {
  return (
    <>
      <SidebarLogo />
      <SidebarNav />
    </>
  );
}
