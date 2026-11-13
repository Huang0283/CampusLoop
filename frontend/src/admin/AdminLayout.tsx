import { LanguageSelect, localize, OriginalText } from '../i18n/Localize'
import { t, useLanguage } from '../i18n/language'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Alert, Avatar, Badge, Button, Dropdown, Tooltip } from 'antd'
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import * as api from '../sdk'
import type { AdminDashboard } from '../sdk'
import { useNotificationsResource, useRemote } from '../live/common'
import { useSession } from '../live/session'
import { Logo } from '../theme/brand'
import { ThemeToggle } from '../theme/AppTheme'
import { Icon, type IconName } from './icons'
import './admin.css'

export interface ConsoleContext {
  dashboard: { value?: AdminDashboard; error?: unknown; loading: boolean; reload: () => void }
  days: 7 | 30
  setDays: (days: 7 | 30) => void
}
// eslint-disable-next-line react-refresh/only-export-components -- Pages read the shared dashboard resource from the layout.
export const useConsole = () => useOutletContext<ConsoleContext>()

interface Entry { to: string; label: string; icon: IconName; color: string; badge?: (data?: AdminDashboard) => number; end?: boolean }
// Each entry keeps its own hue (the same one its dashboard card uses), so the sidebar reads as a colour key.
const MENU: { group: string; items: Entry[] }[] = [
  { group: '概览', items: [{ to: '/admin', label: '仪表盘', icon: 'dashboard', color: '#3D6BFF', end: true }] },
  { group: '审核中心', items: [
    { to: '/admin/reports', label: '举报处理', icon: 'flag', color: '#FF7A2F', badge: (data) => data?.pending.openReports ?? 0 },
    { to: '/admin/appeals', label: '申诉复核', icon: 'shield', color: '#8B5CF6' },
    { to: '/admin/products', label: '商品治理', icon: 'shield', color: '#12A877' },
  ] },
  { group: '运营管理', items: [
    { to: '/admin/orders', label: '订单管理', icon: 'order', color: '#0EA5C6', badge: (data) => data?.pending.disputedOrders ?? 0 },
    { to: '/admin/users', label: '用户管理', icon: 'user', color: '#8B5CF6' },
  ] },
  { group: '系统', items: [
    { to: '/admin/audit', label: '操作日志', icon: 'log', color: '#E0569E' },
    { to: '/admin/profile', label: '个人中心', icon: 'heart', color: '#F5A524' },
  ] },
]
const TITLES: Record<string, string> = { '/admin': '仪表盘', '/admin/reports': '举报处理', '/admin/appeals': '申诉复核', '/admin/notifications': '通知', '/admin/products': '商品治理', '/admin/orders': '订单管理', '/admin/users': '用户管理', '/admin/audit': '操作日志', '/admin/profile': '个人中心' }
const COLLAPSE_KEY = 'campusloop-admin-sidebar'

export function AdminLayout() {
  useLanguage()
  const user = useSession((state) => state.user)
  const location = useLocation()
  const navigate = useNavigate()
  const [days, setDays] = useState<7 | 30>(7)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')
  const [drawer, setDrawer] = useState(false)
  const [palette, setPalette] = useState(false)
  const [offline, setOffline] = useState(!navigator.onLine)
  // One audited read refreshes the dashboard and the sidebar badges every two minutes.
  const dashboard = useRemote(`admin-dashboard-${days}`, (signal) => api.data(api.adminGetDashboard({ signal, query: { days } })), 120000, true)
  const reloadDashboard = dashboard.reload
  useEffect(() => {
    let queued = false
    const refreshOnReturn = () => {
      if (document.visibilityState !== 'visible' || queued) return
      queued = true
      window.setTimeout(() => { queued = false; if (document.visibilityState === 'visible') reloadDashboard() }, 0)
    }
    window.addEventListener('focus', refreshOnReturn)
    document.addEventListener('visibilitychange', refreshOnReturn)
    return () => {
      window.removeEventListener('focus', refreshOnReturn)
      document.removeEventListener('visibilitychange', refreshOnReturn)
    }
  }, [reloadDashboard])
  useEffect(() => {
    const changed = () => setOffline(!navigator.onLine)
    window.addEventListener('online', changed); window.addEventListener('offline', changed)
    return () => { window.removeEventListener('online', changed); window.removeEventListener('offline', changed) }
  }, [])
  useEffect(() => {
    const open = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPalette(true) } }
    window.addEventListener('keydown', open)
    return () => window.removeEventListener('keydown', open)
  }, [])
  const toggle = () => setCollapsed((value) => { localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1'); return !value })
  const signOut = async () => {
    await api.logout()
    navigate('/market', { flushSync: true })
    useSession.getState().clear()
  }
  const notifications = useNotificationsResource()
  const unread = notifications.value?.filter(item => !item.read).length ?? 0
  const title = TITLES[location.pathname] ?? '管理后台'
  const context: ConsoleContext = { dashboard, days, setDays }
  return localize(<div className={`adm ${collapsed ? 'is-collapsed' : ''} ${drawer ? 'is-drawer' : ''}`}>
    <div className="adm-sky" aria-hidden="true"><i className="b1" /><i className="b2" /><i className="b3" /><i className="b4" /><i className="b5" /></div>
    <a className="skip-link" href="#admin-main">跳到主要内容</a>
    <aside className="adm-side" aria-label="管理后台导航">
      <Link to="/admin" className="adm-brand"><Logo size={30} /><span><b>CampusLoop</b><small>管理后台</small></span></Link>
      <nav className="adm-menu">
        {MENU.map((section) => localize(<div key={section.group} className="adm-menu-group">
          <div className="adm-menu-label">{section.group}</div>
          {section.items.map((item) => {
            const count = item.badge?.(dashboard.value) ?? 0
            return localize(<NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `adm-menu-item ${isActive ? 'is-active' : ''}`} style={{ ['--mc' as string]: item.color }} title={item.label} onClick={() => setDrawer(false)}>
              <span className="adm-menu-ic"><Icon name={item.icon} /></span><span className="adm-menu-text">{item.label}</span>{count > 0 && <span className="adm-menu-badge">{count}</span>}
            </NavLink>)
          })}
        </div>))}
      </nav>
      <Link to="/market" className="adm-menu-item adm-back" title="返回市场"><Icon name="store" /><span className="adm-menu-text">返回市场</span></Link>
      <button type="button" className="adm-menu-item adm-collapse" onClick={toggle} aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}><Icon name="chevron" /><span className="adm-menu-text">收起菜单</span></button>
    </aside>
    <button type="button" className="adm-scrim" aria-label="关闭导航" onClick={() => setDrawer(false)} />
    <div className="adm-main">
      <header className="adm-top">
        <button type="button" className="adm-icon-btn adm-burger" aria-label="打开导航" onClick={() => setDrawer(true)}><Icon name="menu" /></button>
        <div className="adm-crumb">CampusLoop 管理后台 / <b>{title}</b></div>
        <button type="button" className="adm-search" onClick={() => setPalette(true)}><Icon name="search" /><span>搜索订单号或跳转页面</span><kbd>Ctrl K</kbd></button>
        <ThemeToggle className="adm-theme" />
        <LanguageSelect className="adm-language" />
        <Tooltip title="通知与申诉提醒">
          <Badge count={unread} size="small" offset={[-4, 4]}><Button type="text" className="adm-icon-btn" aria-label="通知" icon={<Icon name="bell" />} onClick={() => navigate('/admin/notifications')} /></Badge>
        </Tooltip>
        <Dropdown trigger={['click']} placement="bottomRight" getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
          // Keep positioning relative to the sticky header; reduced motion must
          // skip the popup animation rather than interrupt its alignment phase.
          transitionName={window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '' : undefined}
          menu={{ items: [
          { key: 'profile', icon: <Icon name="heart" size={15} />, label: '个人中心', onClick: () => navigate('/admin/profile') },
          { key: 'edit', icon: <Icon name="edit" size={15} />, label: '编辑资料与头像', onClick: () => navigate('/admin/profile?edit=1') },
          { key: 'market', icon: <Icon name="store" size={15} />, label: '返回市场', onClick: () => navigate('/market') },
          { type: 'divider' },
          { key: 'logout', icon: <Icon name="logout" size={15} />, label: '退出登录', danger: true, onClick: () => void signOut() },
        ] }}>
          <button type="button" className="adm-me" aria-label={`账号菜单：${user?.nickname ?? '管理员'}`}><Avatar size={32} src={user?.avatar}>{<OriginalText>{user?.nickname.slice(0, 1)}</OriginalText>}</Avatar><span><b>{<OriginalText>{user?.nickname}</OriginalText>}</b><small>管理员</small></span><Icon name="chevron" size={14} /></button>
        </Dropdown>
      </header>
      <main id="admin-main" className="adm-page" tabIndex={-1}>
        {offline && <Alert role="alert" type="warning" showIcon title="当前离线，恢复网络后数据会自动刷新。已提交的处理请先确认结果，避免重复操作。" style={{ marginBottom: 16 }} />}
        <Outlet context={context} />
      </main>
    </div>
    {palette && <CommandPalette onClose={() => setPalette(false)} />}
  </div>)
}

interface Command { group: string; label: string; hint?: string; icon: IconName; run: () => void }

function CommandPalette({ onClose }: { onClose: () => void }) {
  useLanguage()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { input.current?.focus() }, [])
  const go = useCallback((to: string) => { onClose(); navigate(to) }, [navigate, onClose])
  const commands: Command[] = (() => {
    const text = query.trim()
    const pages: Command[] = MENU.flatMap((section) => section.items.map((item) => ({ group: '跳转页面', label: item.label, icon: item.icon, run: () => go(item.to) })))
    const searches: Command[] = text ? [{ group: '搜索', label: `在订单管理中搜索「${text}」`, hint: '订单号或商品名称', icon: 'order', run: () => go(`/admin/orders?query=${encodeURIComponent(text)}`) }] : []
    const filtered = pages.filter((item) => !text || item.label.includes(text) || t(item.label).toLowerCase().includes(text.toLowerCase()))
    return [...searches, ...filtered, { group: '其他', label: '返回前台市场', icon: 'store', run: () => go('/market') }]
  })()
  const current = Math.min(selected, commands.length - 1)
  let lastGroup = ''
  return localize(<div className="adm-cmdk-mask" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="adm-cmdk" role="dialog" aria-modal="true" aria-label="搜索与跳转">
      <div className="adm-cmdk-input"><Icon name="search" /><input ref={input} value={query} placeholder="输入订单号、商品名称或页面名…" aria-label="搜索与跳转"
        onChange={(event) => { setQuery(event.target.value); setSelected(0) }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose()
          if (event.key === 'ArrowDown') { event.preventDefault(); setSelected(Math.min(commands.length - 1, current + 1)) }
          if (event.key === 'ArrowUp') { event.preventDefault(); setSelected(Math.max(0, current - 1)) }
          if (event.key === 'Enter') commands[current]?.run()
        }} /><kbd>Esc</kbd></div>
      <div className="adm-cmdk-list" role="listbox">
        {commands.map((item, index) => {
          const heading: ReactNode = item.group !== lastGroup ? localize(<div className="adm-cmdk-group">{item.group}</div>) : null
          lastGroup = item.group
          return localize(<div key={`${item.group}-${item.label}`}>{heading}<button type="button" role="option" aria-selected={index === current} className={index === current ? 'is-on' : ''} onMouseEnter={() => setSelected(index)} onClick={item.run}>
            <span className="adm-cmdk-icon"><Icon name={item.icon} /></span><span>{item.label}</span>{item.hint && <small>{item.hint}</small>}
          </button></div>)
        })}
      </div>
    </div>
  </div>)
}
