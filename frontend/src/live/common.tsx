import { localize, OriginalText, LanguageSelect } from '../i18n/Localize'
import { useLanguage, t } from '../i18n/language'
/* eslint-disable react-refresh/only-export-components -- Shared live-page hooks and components. */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Alert, Avatar, Badge, Button, Card, Dropdown, Empty, Input, Menu, Result } from 'antd'
import { BellOutlined, DownOutlined, FileSearchOutlined, MessageOutlined, SafetyCertificateOutlined, SearchOutlined, ShopOutlined, SwapOutlined } from '@ant-design/icons'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, data, listNotifications, logout } from '../sdk'
import { useSession } from './session'
import { DisabledAccountNotice } from './DisabledAccountNotice'
import type { Notification } from '../sdk'
import { AsyncTaskState } from './AsyncTaskState'
import { NOTIFICATIONS_CHANGED_EVENT } from './notifications'
import { Logo } from '../theme/brand'
import { ThemeToggle } from '../theme/AppTheme'
import './original-interface.css'

export function errorText(error: unknown) { return t(error instanceof Error && /[\u3400-\u9fff]/u.test(error.message) ? error.message : '操作失败，请重试。') }

export function useRemote<T>(key: string, loader: (signal: AbortSignal) => Promise<T>, interval = 0, retainOnReload = false) {
  const loaderRef = useRef(loader)
  const priorKey = useRef(key)
  useEffect(() => { loaderRef.current = loader }, [loader])
  const [state, setState] = useState<{ value?: T; error?: unknown; loading: boolean }>({ loading: true })
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    const sameKey = priorKey.current === key
    priorKey.current = key
    const controller = new AbortController()
    let disposed = false
    let active = false
    let deadline: number | undefined
    const refresh = async () => {
      if (active) return
      active = true
      let timedOut = false
      deadline = window.setTimeout(() => {
        timedOut = true
        controller.abort()
        if (!disposed) setState((prior) => ({ ...prior, error: new ApiError(0, 'TASK_TIMEOUT', '等待已超时，请刷新后重试。'), loading: false }))
      }, 30000)
      try {
        const value = await loaderRef.current(controller.signal)
        if (!disposed && !timedOut) setState({ value, loading: false })
      } catch (error) {
        if (!disposed && !timedOut) setState((prior) => ({ ...prior, error, loading: false }))
      } finally { window.clearTimeout(deadline); active = false }
    }
    // Sidebar refreshes must not unmount an active conversation and lose drafts.
    // A changed resource/identity key must still discard the previous data.
    const start = window.setTimeout(() => { setState((prior) => retainOnReload && sameKey ? { ...prior, loading: true, error: undefined } : { loading: true }); void refresh() }, 0)
    const timer = interval ? window.setInterval(() => { void refresh() }, interval) : undefined
    return () => { disposed = true; controller.abort(); window.clearTimeout(deadline); window.clearTimeout(start); window.clearInterval(timer) }
  }, [key, revision, interval, retainOnReload])
  return { ...state, reload }
}

const NotificationsContext = createContext<ReturnType<typeof useRemote<Notification[]>> | null>(null)

export function useNotificationsResource() {
  const resource = useContext(NotificationsContext)
  if (!resource) throw new Error('Notifications must be rendered inside Shell')
  return resource
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
  useLanguage()
  if (!error) return null
  const description = error instanceof ApiError && error.requestId ? `问题追踪编号：${error.requestId}` : undefined
  return localize(<Alert type="error" showIcon title={errorText(error)} description={description} action={retry && <Button onClick={retry}>重试</Button>} style={{ marginBottom: 16 }} />)
}

export function Resource({ loading, error, value, reload, children }: {
  loading: boolean; error?: unknown; value?: unknown; reload: () => void; children: ReactNode
}) {
  useLanguage()
  if (error instanceof ApiError && error.status === 403) return localize(<Result status="403" title="无权访问" extra={<Link to="/market">返回首页</Link>} />)
  if (loading && value === undefined) return localize(<AsyncTaskState phase="running" />)
  if (error && value === undefined) {
    if (error instanceof ApiError && error.status === 404) return localize(<Result status="404" title="内容不存在或已不可见" extra={<Link to="/market">返回首页</Link>} />)
    if (error instanceof ApiError && ['TASK_TIMEOUT', 'REQUEST_CANCELLED_OR_TIMEOUT'].includes(error.code)) return localize(<AsyncTaskState phase="timeout" refresh={reload} />)
    return localize(<Failure error={error} retry={reload} />)
  }
  return localize(<><Failure error={error} retry={reload} />{children}</>)
}

export type TabListItem = { readonly key: string; readonly label: string }

/** 自带方向键循环、aria-selected 与 roving tabIndex 的标签栏，供通知与交易中心共用。 */
export function TabList({ items, value, onChange, ariaLabel, className = 'segmented-tabs', tabClassName = 'segmented-tab' }: {
  items: readonly TabListItem[]
  value: string
  onChange: (key: string) => void
  ariaLabel: string
  className?: string
  tabClassName?: string
}) {
  useLanguage()
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const move = (index: number) => {
    if (!items.length) return
    const next = (index + items.length) % items.length
    onChange(items[next].key)
    tabs.current[next]?.focus()
  }
  return localize(<div className={className} role="tablist" aria-label={ariaLabel}>
    {items.map((item, index) => {
      const selected = item.key === value
      return localize(<button
        key={item.key}
        type="button"
        role="tab"
        ref={(element) => { tabs.current[index] = element }}
        aria-selected={selected}
        tabIndex={selected ? 0 : -1}
        className={`${tabClassName}${selected ? ' is-active' : ''}`}
        onClick={() => onChange(item.key)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); move(index + 1) }
          else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); move(index - 1) }
          else if (event.key === 'Home') { event.preventDefault(); move(0) }
          else if (event.key === 'End') { event.preventDefault(); move(items.length - 1) }
        }}
      >{item.label}</button>)
    })}
  </div>)
}

export function Guard({ admin = false, children }: { admin?: boolean; children: ReactNode }) {
  useLanguage()
  const user = useSession((state) => state.user)
  const location = useLocation()
  if (!user) return localize(<Navigate to="/login" state={{ from: location.pathname + location.search }} replace />)
  if (admin ? user.role !== 'ADMIN' : user.role !== 'USER') return localize(<Result status="403" title="当前账号无权访问" extra={<Link to="/market">返回首页</Link>} />)
  return children
}

export function Shell() {
  useLanguage()
  const user = useSession((state) => state.user)
  const location = useLocation()
  useEffect(() => { window.dispatchEvent(new Event('campusloop-route-change')) }, [location.pathname])
  const navigate = useNavigate()
  const mainRef = useRef<HTMLElement>(null)
  const accountMenuButtonRef = useRef<HTMLButtonElement>(null)
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const changed = () => setOffline(!navigator.onLine)
    window.addEventListener('online', changed); window.addEventListener('offline', changed)
    return () => { window.removeEventListener('online', changed); window.removeEventListener('offline', changed) }
  }, [])
  useEffect(() => { mainRef.current?.focus({ preventScroll: true }) }, [location.pathname])
  const mutation = useMutation()
  const notifications = useRemote<Notification[]>(`shell-notifications-${user?.id}`, (signal) => user ? data(listNotifications({ signal })) : Promise.resolve([]), 5000)
  const reloadNotifications = notifications.reload
  useEffect(() => {
    const refreshNotifications = () => reloadNotifications()
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshNotifications)
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshNotifications)
  }, [reloadNotifications])
  const unread = notifications.value?.filter((item) => !item.read).length ?? 0
  const nav = [
    { key: '/market', icon: localize(<ShopOutlined aria-hidden />), label: '市场' },
    ...(user?.role !== 'ADMIN' ? [{ key: '/wanted', icon: localize(<FileSearchOutlined aria-hidden />), label: '求购' }] : []),
    ...(user?.role === 'USER' ? [{ key: '/chat', icon: localize(<MessageOutlined aria-hidden />), label: '聊天' }, { key: '/transactions', icon: localize(<SwapOutlined aria-hidden />), label: '交易' }] : []),
    ...(user?.role === 'ADMIN' ? [{ key: '/admin', icon: localize(<SafetyCertificateOutlined aria-hidden />), label: '管理后台' }] : []),
  ]
  const selected = location.pathname.startsWith('/admin') ? '/admin' : location.pathname.startsWith('/chat') ? '/chat' : location.pathname.startsWith('/transactions') ? '/transactions' : location.pathname.startsWith('/wanted') ? '/wanted' : location.pathname.startsWith('/market') || location.pathname.startsWith('/product') ? '/market' : ''
  const menu = [
    ...(user?.role === 'ADMIN' ? [{ key: '/admin', label: '管理后台' }] : [{ key: '/profile', label: '个人中心' }, { key: '/my-products', label: '我的发布' }, { key: '/favorites', label: '我的收藏' }, { key: '/report', label: '我的举报' }, { key: '/account/decisions', label: '账号处理记录' }]),
    { key: 'logout', label: '退出登录', danger: true },
  ]
  // The landing page, the sign-in views and the admin console own their full-screen composition.
  if (['/', '/login', '/register'].includes(location.pathname) || location.pathname === '/admin' || location.pathname.startsWith('/admin/')) return localize(<NotificationsContext.Provider value={notifications}><DisabledAccountNotice /><div className="campus-app campus-bare"><main id="main-content" className="campus-content"><Outlet /></main></div></NotificationsContext.Provider>)
  return localize(<div className="campus-app">
    <DisabledAccountNotice />
    <div className="app-sky" aria-hidden="true"><i className="b1" /><i className="b2" /><i className="b3" /></div>
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <header className="app-topbar">
      <Link to="/" className="app-brand" aria-label="CampusLoop 首页"><Logo size={30} /><span>CampusLoop</span></Link>
      <Menu className="app-nav" mode="horizontal" disabledOverflow selectedKeys={[selected]} items={nav} onClick={({ key }) => navigate(key)} />
      <Input.Search key={location.pathname + location.search} className="header-search" aria-label="全站搜索商品" placeholder="搜索校园好物" prefix={<SearchOutlined style={{ color: 'var(--placeholder)' }} />} allowClear defaultValue={location.pathname === '/market' ? new URLSearchParams(location.search).get('query') || '' : ''} onSearch={(value) => navigate(value.trim() ? `/market?query=${encodeURIComponent(value.trim())}` : '/market')} />
      <div className="app-tools">
        {user?.role === 'USER' && <div className="app-notification-bell"><Badge count={unread} size="small" offset={[-6, 6]}><Button aria-label="通知" type="text" className="cl-icon-btn" icon={<BellOutlined />} onClick={() => navigate('/notifications')} /></Badge></div>}
        <ThemeToggle />
        {user?.role !== 'ADMIN' && <LanguageSelect />}
        <div className="app-user-menu">
          {user ? <Dropdown autoFocus trigger={['click', 'hover']} placement="bottomRight" menu={{ items: menu, onKeyDown: (event) => { if (event.key === 'Escape') window.requestAnimationFrame(() => accountMenuButtonRef.current?.focus({ preventScroll: true })) }, onClick: ({ key }) => { if (key !== 'logout') navigate(key); else void mutation.run(async () => {
            await logout()
            // Leave protected routes before clearing the identity, so Guard's
            // login redirect cannot race the intended return to the market.
            navigate('/market', { flushSync: true })
            useSession.getState().clear()
          }) } }}>
            <Button ref={accountMenuButtonRef} type="text" aria-label={`账号菜单：${user.nickname}`} className="app-user-menu-content"><Avatar size={34} src={user.avatar}>{<OriginalText>{user.nickname.slice(0, 1)}</OriginalText>}</Avatar><span className="app-user-menu-label">{<OriginalText>{user.nickname}</OriginalText>}</span><DownOutlined style={{ fontSize: 11 }} /></Button>
          </Dropdown> : <div className="app-guest-links"><Link to="/login" state={{ from: location.pathname + location.search }}>登录</Link><Link className="is-primary" to="/register">注册</Link></div>}
        </div>
      </div>
    </header>
    <nav className="app-mobile-nav" aria-label="移动导航"><div className="app-mobile-nav-list">
      {nav.map((item) => localize(<button key={item.key} className={selected === item.key ? 'is-active' : ''} onClick={() => navigate(item.key)}>{item.icon}<span>{item.label}</span></button>))}
    </div></nav>
    <div className="live-layout">
      <main className="campus-content" id="main-content" ref={mainRef} tabIndex={-1} aria-label="主要内容">
        {offline && <Alert role="alert" type="warning" showIcon title="当前离线，请恢复网络后刷新。提交过的操作请先确认记录，避免重复。" style={{ marginBottom: 16 }} />}
        <Failure error={mutation.error} /><Failure error={notifications.error} retry={notifications.reload} /><NotificationsContext.Provider value={notifications}><Outlet /></NotificationsContext.Provider>
      </main>
    </div>
  </div>)
}

export function Page({ title, extra, children, subtitle, className = '' }: { title: string; extra?: ReactNode; children: ReactNode; subtitle?: string; className?: string }) {
  useLanguage()
  return localize(<div className={`campus-page ${className}`}><div className="page-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{extra}</div>{children}</div>)
}

export function NoItems({ filtered = false }: { filtered?: boolean }) {
  useLanguage(); return localize(<Card><Empty description={filtered ? '没有符合筛选条件的结果，请调整条件。' : '暂无内容。'} /></Card>) }
