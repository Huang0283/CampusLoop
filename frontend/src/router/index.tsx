import { createBrowserRouter, Navigate } from 'react-router-dom'
import RequireAuth from './RequireAuth'
import RequireRole from './RequireRole'

// 占位页面，后面由 M3、M4 替换
const Placeholder = ({ name }: { name: string }) => <div>{name}</div>

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Placeholder name="登录页" />,
  },
  {
    path: '/register',
    element: <Placeholder name="注册页" />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <Placeholder name="首页" />
      </RequireAuth>
    ),
  },
  {
    path: '/profile',
    element: (
      <RequireAuth>
        <Placeholder name="个人中心" />
      </RequireAuth>
    ),
  },
  {
    path: '/market',
    element: (
      <RequireAuth>
        <Placeholder name="市场" />
      </RequireAuth>
    ),
  },
  {
    path: '/product/:id',
    element: (
      <RequireAuth>
        <Placeholder name="商品详情" />
      </RequireAuth>
    ),
  },
  {
    path: '/publish',
    element: (
      <RequireAuth>
        <Placeholder name="发布商品" />
      </RequireAuth>
    ),
  },
  {
    path: '/my-products',
    element: (
      <RequireAuth>
        <Placeholder name="我的商品" />
      </RequireAuth>
    ),
  },
  {
    path: '/favorites',
    element: (
      <RequireAuth>
        <Placeholder name="收藏" />
      </RequireAuth>
    ),
  },
  {
    path: '/wanted',
    element: (
      <RequireAuth>
        <Placeholder name="求购市场" />
      </RequireAuth>
    ),
  },
  {
    path: '/chat',
    element: (
      <RequireAuth>
        <Placeholder name="聊天" />
      </RequireAuth>
    ),
  },
  {
    path: '/orders',
    element: (
      <RequireAuth>
        <Placeholder name="订单" />
      </RequireAuth>
    ),
  },
  {
    path: '/meeting',
    element: (
      <RequireAuth>
        <Placeholder name="见面约定" />
      </RequireAuth>
    ),
  },
  {
    path: '/notifications',
    element: (
      <RequireAuth>
        <Placeholder name="通知" />
      </RequireAuth>
    ),
  },
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <RequireRole role="admin">
          <Placeholder name="管理后台" />
        </RequireRole>
      </RequireAuth>
    ),
  },
  {
    path: '/403',
    element: <Placeholder name="无权限" />,
  },
  {
    path: '/404',
    element: <Placeholder name="页面不存在" />,
  },
  {
    path: '*',
    element: <Navigate to="/404" replace />,
  },
])