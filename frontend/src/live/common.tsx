/* eslint-disable react-refresh/only-export-components -- Shared live-page hooks and components. */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Alert, Avatar, Badge, Button, Card, Dropdown, Empty, Layout, Menu, Result, Space, Spin, Typography } from 'antd'
import { BellOutlined, FileSearchOutlined, HomeOutlined, MessageOutlined, ReadOutlined, SwapOutlined } from '@ant-design/icons'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, data, listNotifications, logout } from '../sdk'
import { useSession } from './session'
import type { Notification } from '../sdk'

export function errorText(error: unknown) { return error instanceof Error ? error.message : '操作失败，请重试。' }

export function useRemote<T>(key: string, loader: (signal: AbortSignal) => Promise<T>, interval = 0) {
  const loaderRef = useRef(loader)
  useEffect(() => { loaderRef.current = loader }, [loader])
  const [state, setState] = useState<{ value?: T; error?: unknown; loading: boolean }>({ loading: true })
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    let disposed = false
    let active = false
    const refresh = async () => {
      if (active) return
      active = true
      try {
        const value = await loaderRef.current(controller.signal)
        if (!disposed) setState({ value, loading: false })
      } catch (error) {
        if (!disposed) setState((prior) => ({ ...prior, error, loading: false }))
      } finally { active = false }
    }
    const start = window.setTimeout(() => { setState({ loading: true }); void refresh() }, 0)
    const timer = interval ? window.setInterval(() => { void refresh() }, interval) : undefined
    return () => { disposed = true; controller.abort(); window.clearTimeout(start); window.clearInterval(timer) }
  }, [key, revision, interval])
  return { ...state, reload }
}

export function useMutation() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>()
  const locked = useRef(false)
  const run = async (action: () => Promise<unknown>) => {
    if (locked.current) return false
    locked.current = true; setBusy(true); setError(undefined)
    try { await action(); return true } catch (failure) { setError(failure); return false }
    finally { locked.current = false; setBusy(false) }
  }
  return { busy, error, run }
}

export function Failure({ error, retry }: { error?: unknown; retry?: () => void }) {
  if (!error) return null
  const description = error instanceof ApiError ? `${error.code}${error.requestId ? ' · ' + error.requestId : ''}` : undefined
  return <Alert type="error" showIcon title={errorText(error)} description={description} action={retry && <Button onClick={retry}>重试</Button>} style={{ marginBottom: 16 }} />
}

export function Resource({ loading, error, value, reload, children }: {
  loading: boolean; error?: unknown; value?: unknown; reload: () => void; children: ReactNode
}) {
  if (loading && value === undefined) return <Spin description="正在读取数据…"><div style={{ minHeight: 140 }} /></Spin>
  if (error && value === undefined) {
    if (error instanceof ApiError && error.status === 403) return <Result status="403" title="无权访问" extra={<Link to="/market">返回首页</Link>} />
    return <Failure error={error} retry={reload} />
  }
  return <><Failure error={error} retry={reload} />{children}</>
}

export function Guard({ admin = false, children }: { admin?: boolean; children: ReactNode }) {
  const user = useSession((state) => state.user)
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  if (admin ? user.role !== 'ADMIN' : user.role !== 'USER') return <Result status="403" title="当前账号无权访问" />
  return children
}

export function Shell() {
  const user = useSession((state) => state.user)
  const location = useLocation()
  const navigate = useNavigate()
  const mutation = useMutation()
  const notifications = useRemote<Notification[]>(`shell-notifications-${user?.id}`, (signal) => user?.role === 'USER' ? data(listNotifications({ signal })) : Promise.resolve([]), 5000)
  const unread = notifications.value?.filter((item) => !item.read).length ?? 0
  const nav = [
    { key: '/market', icon: <HomeOutlined />, label: '首页' },
    { key: '/wanted', icon: <FileSearchOutlined />, label: '求购' },
    ...(user?.role === 'USER' ? [{ key: '/chat', icon: <MessageOutlined />, label: '聊天' }, { key: '/transactions', icon: <SwapOutlined />, label: '交易' }] : []),
  ]
  const selected = location.pathname.startsWith('/chat') ? '/chat' : location.pathname.startsWith('/transactions') ? '/transactions' : location.pathname.startsWith('/wanted') ? '/wanted' : '/market'
  const menu = [
    ...(user?.role === 'ADMIN' ? [{ key: '/admin', label: '管理后台' }] : [{ key: '/profile', label: '个人中心' }, { key: '/my-products', label: '我的发布' }, { key: '/favorites', label: '我的收藏' }]),
    { key: 'logout', label: '退出登录', danger: true },
  ]
  return <Layout style={{ minHeight: '100vh' }}>
    <aside className="app-sidebar">
      <div style={{ display: 'flex', gap: 8, padding: '20px 24px', alignItems: 'center' }}><ReadOutlined style={{ color: '#1677ff', fontSize: 26 }} /><Typography.Text strong style={{ fontSize: 18 }}>CampusLoop</Typography.Text></div>
      <Menu mode="inline" selectedKeys={[selected]} items={nav} onClick={({ key }) => navigate(key)} />
    </aside>
    <nav className="app-mobile-nav" aria-label="移动导航"><div className="app-mobile-nav-list">
      {nav.map((item) => <button key={item.key} className={selected === item.key ? 'is-active' : ''} onClick={() => navigate(item.key)}>{item.icon}<span>{item.label}</span></button>)}
    </div></nav>
    <Layout className="live-layout">
      <Layout.Header style={{ background: '#fff', padding: '0 24px', height: 64 }}>
        <Typography.Text type="secondary">校园闲置交易</Typography.Text>
        {user?.role === 'USER' && <div className="app-notification-bell"><Badge count={unread}><Button aria-label="通知" type="text" icon={<BellOutlined />} onClick={() => navigate('/notifications')} /></Badge></div>}
        <div className="app-user-menu">
          {user ? <Dropdown menu={{ items: menu, onClick: ({ key }) => { if (key !== 'logout') navigate(key); else void mutation.run(async () => { await logout(); useSession.getState().clear(); navigate('/market') }) } }}>
            <Space className="app-user-menu-content"><Avatar src={user.avatar}>{user.nickname.slice(0, 1)}</Avatar><span className="app-user-menu-label">{user.nickname}</span></Space>
          </Dropdown> : <Space><Link to="/login">登录</Link><Link to="/register">注册</Link></Space>}
        </div>
      </Layout.Header>
      <Layout.Content style={{ padding: 24 }}><Failure error={mutation.error} /><Failure error={notifications.error} retry={notifications.reload} /><Outlet /></Layout.Content>
    </Layout>
  </Layout>
}

export function Page({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return <div style={{ maxWidth: 1160, margin: '0 auto' }}><Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><Typography.Title level={3} style={{ margin: 0 }}>{title}</Typography.Title>{extra}</Space>{children}</div>
}

export function NoItems({ filtered = false }: { filtered?: boolean }) { return <Card><Empty description={filtered ? '没有符合筛选条件的结果，请调整条件。' : '暂无内容。'} /></Card> }
