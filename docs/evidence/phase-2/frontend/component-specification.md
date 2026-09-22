# 公共组件规范（FE2-03）

## 1. 目标

冻结公共组件 API，让 M2/M3/M4 不需要重复设计组件，直接复用。

## 2. 组件总表

| 组件 | 用途 | 状态 | 负责人 |
|---|---|---|---|
| Loading | 加载状态 | 已存在 | M2 |
| EmptyState | 空数据 | 已存在 | M2 |
| ErrorState | 错误状态 | 已存在 | M2 |
| NoPermission | 无权限 | 已存在 | M2 |
| PageContainer | 页面容器 | 已存在 | M2 |
| AppSidebar | 公共侧边栏 | 已存在 | M2 |
| NotificationBell | 通知铃铛 | 已存在 | M2 |
| UserMenu | 用户菜单 | 已存在 | M2 |
| RoutePlaceholder | 占位页 | 已存在 | M2 |
| Can | 权限包装 | 已存在 | M2 |
| OfferCard | 报价卡片 | 已存在 | M4 |
| OrderTimeline | 订单时间线 | 已存在 | M4 |
| ReportModal | 举报弹窗 | 已存在 | M4 |
| ReviewModal | 评价弹窗 | 已存在 | M4 |

## 3. 组件 API

### Loading

```ts
interface LoadingProps {
  tip?: string
}

interface EmptyStateProps {
  description?: string
}

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

interface NoPermissionProps {}

interface PageContainerProps {
  title?: string
  extra?: ReactNode
  children: ReactNode
}

interface AppSidebarProps {
  activeKey?: string
}

interface NotificationBellProps {
  count?: number
}

interface UserMenuProps {
  nickname?: string
  avatarUrl?: string
}

interface CanProps {
  role: 'student' | 'admin'
  children: ReactNode
}

interface OfferCardProps {
  offer: {
    id: string
    amount: number
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED' | 'EXPIRED' | 'CANCELLED'
    createdAt: string
    expiresAt: string
  }
}

interface OrderTimelineProps {
  events: {
    status: string
    timestamp: string
    note?: string
  }[]
}

interface ReportModalProps {
  open: boolean
  targetType: 'PRODUCT' | 'WANTED' | 'USER' | 'ORDER'
  targetId: string
  onClose: () => void
}

interface ReviewModalProps {
  open: boolean
  orderId: string
  onClose: () => void
}

