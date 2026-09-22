/**
 * 顶栏用户区（全站统一）
 *
 * 背景：各页面各自写了一份「头像 + 昵称 + 下拉」，问题有三：
 * 1. 昵称与头像写死（"同学" / "管理员" / 随机图床），不读登录态；
 * 2. 菜单项五花八门（我的发布 / 我的订单 / 系统设置），且**全站几乎没有 onClick**，点了没反应；
 * 3. `/my-products`、`/favorites` 两个路由没有任何入口，只能手敲 URL。
 *
 * 现在唯一实现放在这里：头像与昵称读登录态，菜单项固定并接上跳转。
 *
 * @example <UserMenu />               // 默认文字色 #1f2329
 * @example <UserMenu color="#fff" />  // 深色顶栏
 */

import { Avatar, Dropdown, Space } from 'antd';
import type { MenuProps } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

interface UserMenuProps {
  /** 昵称文字颜色，默认与页面主文字色一致 */
  color?: string;
}

const MENU_ITEMS: NonNullable<MenuProps['items']> = [
  { key: 'profile', label: '个人中心' },
  { key: 'orders', label: '我的订单' },
  { key: 'my-products', label: '我的发布' },
  { key: 'favorites', label: '我的收藏' },
  { type: 'divider' },
  { key: 'logout', label: '退出登录', danger: true },
];

const MENU_PATHS: Record<string, string> = {
  profile: '/profile',
  /**
   * 订单与个人交易中心现已统一在 /transactions（购买/出售页签按身份过滤）。
   * 旧的 /profile/transactions 只保留兼容重定向，这里直接指向正式地址。
   */
  orders: '/transactions',
  'my-products': '/my-products',
  favorites: '/favorites',
};

export default function UserMenu({ color = '#1f2329' }: UserMenuProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
      return;
    }
    const path = MENU_PATHS[key];
    if (path) navigate(path);
  };

  return (
    <div className="app-user-menu-slot">
      <div className="app-user-menu">
        <Dropdown
          menu={{ items: MENU_ITEMS, onClick: handleMenuClick }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Space size={8} style={{ cursor: 'pointer' }}>
            <Avatar size={34} src={user?.avatar}>
              {(user?.nickname ?? '游').slice(0, 1)}
            </Avatar>
            <span style={{ fontSize: 14, color }}>{user?.nickname ?? '未登录'}</span>
            <DownOutlined style={{ fontSize: 11, color: '#8c8c8c' }} />
          </Space>
        </Dropdown>
      </div>
    </div>
  );
}
