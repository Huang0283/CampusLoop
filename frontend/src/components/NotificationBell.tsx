/**
 * 顶部通知铃铛（全站统一）
 *
 * 背景：各页面顶栏各自写了一份铃铛：有的没接跳转（点了没反应），
 * 有的用写死的 `<Badge dot>` / `<Badge count={3}>`，字号与颜色也不一致。
 * 现在唯一实现放在这里：
 * - 未读数来自可变 mockDb（报价 / 订单 / 举报等动作产生的通知会实时反映）
 * - 点击进入 `/notifications`
 *
 * @example <NotificationBell />            // 默认色 #1f2329
 * @example <NotificationBell color="#fff" /> // 深色顶栏
 */

import { Badge } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMockDbStore } from '../stores/mockDb';

interface NotificationBellProps {
  /** 图标颜色，默认与各页面主文字色一致 */
  color?: string;
}

export default function NotificationBell({ color = '#1f2329' }: NotificationBellProps) {
  const navigate = useNavigate();
  const unreadCount = useMockDbStore(
    (s) => s.notifications.filter((n) => !n.read).length
  );

  return (
    <Badge count={unreadCount} size="small" offset={[-2, 4]}>
      <BellOutlined
        style={{ fontSize: 18, color, cursor: 'pointer' }}
        onClick={() => navigate('/notifications')}
      />
    </Badge>
  );
}
