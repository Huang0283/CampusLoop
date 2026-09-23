# 公共组件规范（FE2-03）

## 1. 冻结范围

本文件以当前源码为准，冻结 M2/M3/M4 在 Phase 2 原型中共用的页面状态、布局、权限、导航、表单、上传、分页、状态标签、确认和反馈 API。组件实现位于 `frontend/src/components/`，统一从 `frontend/src/components/index.ts` 导入。

## 2. 页面五态

```ts
type PageStatus = 'loading' | 'empty' | 'error' | 'forbidden' | 'ready'

interface PageStateProps {
  status: PageStatus
  children: ReactNode
  loadingTip?: string
  emptyDescription?: string
  errorMessage?: string
  onRetry?: () => void
}
```

`PageState` 是五态统一入口：`ready` 渲染成功内容，其他状态分别复用 `Loading`、`EmptyState`、`ErrorState` 和 `NoPermission`。页面不得复制这四个状态组件。

```tsx
<PageState status={status} errorMessage={error.message} onRetry={reload}>
  <ProductList items={items} />
</PageState>
```

底层组件 API：

```ts
interface LoadingProps { tip?: string }
interface EmptyStateProps { description?: string }
interface ErrorStateProps { message?: string; onRetry?: () => void }
interface NoPermissionProps {}
```

## 3. 布局和导航

```ts
interface PageContainerProps {
  title?: string
  extra?: ReactNode
  children: ReactNode
}

interface AppSidebarProps { activeKey?: string }
interface NotificationBellProps { color?: string }
interface UserMenuProps { color?: string }
```

`NotificationBell` 自行读取未读数并跳转 `/notifications`；调用方不能传入静态数量。`UserMenu` 自行读取当前用户和退出动作；调用方不能传入昵称或头像副本。

## 4. 路由和动作权限

```ts
interface RequireAuthProps { children: ReactNode }
interface RequireRoleProps { role: 'student' | 'admin'; children: ReactNode }

interface CanProps {
  action: OrderActionKey
  order: Order
  children: ReactElement<{ disabled?: boolean }>
  fallback?: ReactNode
}

type RequireAuthAction = (action: () => void) => boolean
```

- 私有页面使用 `RequireAuth`；管理员页面再使用 `RequireRole`。
- 公开页面上的收藏、联系、举报、发布等私有动作使用 `useRequireAuthAction()`，不能给整个公开页面加登录守卫。
- 订单按钮使用 `Can`，权限结果来自 `access/permissions.ts`，页面不能自行复制状态判断。
- 动作守卫保存 `pathname + search + hash`，登录成功后返回完整来源地址。

## 5. 交易公共组件

```ts
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
  events: Array<{ status: string; timestamp: string; note?: string }>
}

interface ReportModalProps {
  open: boolean
  targetType: ReportTargetType
  targetId: number
  targetLabel?: string
  onClose: () => void
  onSubmit?: (values: {
    reason: ReportReason
    description?: string
    evidence: string[]
  }) => void
}

interface ReviewFormValues {
  overall: number
  descriptionAccuracy: number
  communication: number
  punctuality: number
  comment?: string
}

interface ReviewModalProps {
  open: boolean
  orderId: number
  peerNickname: string
  onClose: () => void
  onSubmit?: (values: ReviewFormValues) => void
}
```

## 6. 表单、上传与分页约定

Phase 2 直接复用 Ant Design，以下 API 视为冻结约定，不再创建页面私有包装组件：

- 表单：`Form` 使用 `layout="vertical"`；提交由 `onFinish` 触发；提交中设置 `disabled` 或按钮 `loading`；服务端字段错误在 Phase 3 映射到对应 `Form.Item`。
- 上传：`Upload`/`Upload.Dragger` 使用 `accept`、`maxCount`、`fileList` 和 `beforeUpload`；Phase 2 的 `beforeUpload={() => false}` 必须标为 Mock，Phase 3 由 FE3-05 替换真实上传及进度/重试。
- 分页：`Pagination` 的受控字段统一为 `current`、`pageSize`、`total`、`onChange(page, pageSize)`；筛选变化时页码重置为 1。
- 状态标签：使用 `Tag`，显示文本从领域常量映射；页面不能直接显示后端枚举，也不能用颜色代替文字。
- 确认弹窗：危险或不可逆动作使用 `Modal.confirm({ title, content, okText, cancelText, onOk })`；提交期间禁止重复确认。
- 反馈：字段校验留在表单项；操作成功使用 `message.success`；可恢复失败使用 `message.error` 并保留用户输入；页面加载失败使用 `ErrorState`。

## 7. Owner 与变更规则

- M2：`PageState`、页面状态组件、布局、导航、路由守卫、`useRequireAuthAction`。
- M4：`Can`、`OfferCard`、`OrderTimeline`、`ReportModal`、`ReviewModal`；M2 只在本规范记录其真实 API。
- M3/M4 如需新增共享 API，先在任务 PR 中提出，M2 更新本规范后再修改组件。
- 任何 Props 变更必须同时修改源码、导出入口、本文件和受影响页面；文档与源码不一致时不得验收 FE2-03。
