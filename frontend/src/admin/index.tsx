import { localize } from '../i18n/Localize'
import { useLanguage } from '../i18n/language'
import type { ReactNode } from 'react'
import { ProductsPanel, ReportsPanel, UsersPanel } from '../live/AdminPages'

export { AdminLayout } from './AdminLayout'
export { DashboardPage } from './Dashboard'
export { OrdersPage } from './OrdersPage'
export { AuditLogPage } from './AuditLogPage'
export { ProfilePage } from './ProfilePage'

// The existing audited panels keep their behaviour; the console only gives them a page frame.
function Section({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  useLanguage()
  return localize(<div className="adm-section"><div className="adm-head"><div><h1>{title}</h1><p>{intro}</p></div></div><div className="adm-card adm-plain admin-panel">{children}</div></div>)
}

export const ReportsSection = () => { useLanguage(); return localize(<Section title="举报处理" intro="处理用户提交的举报。处理结论需要填写说明，会通知举报人并写入操作日志。"><ReportsPanel /></Section>) }
export const ProductsSection = () => { useLanguage(); return localize(<Section title="商品治理" intro="人工下架或恢复商品。已预订、已售出的商品不受影响，发布者不能绕过人工下架。"><ProductsPanel /></Section>) }
export const UsersSection = () => { useLanguage(); return localize(<Section title="用户管理" intro="查看账号、读取风险线索、禁用或恢复账号。禁用会立即撤销该账号的登录会话。"><UsersPanel /></Section>) }
