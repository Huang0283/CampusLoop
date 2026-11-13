import { UserAvatar as Avatar } from '../live/UserAvatar'
import { localize, OriginalText } from '../i18n/Localize'
import { useLanguage } from '../i18n/language'
import { CatalogText } from '../i18n/CatalogText'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Pagination } from 'antd'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import * as api from '../sdk'
import type { AdminAuditLog } from '../sdk'
import { Resource, useRemote } from '../live/common'
import { useSession } from '../live/session'
import { useConsole } from './AdminLayout'
import { clock, fmt } from './format'
import { Icon, type IconName } from './icons'
import { auditEventLabels, resultStatusLabels } from './labels'
import { ProfileEditor } from './ProfileEditor'

const SUBJECTS = { PRODUCT: '商品', REPORT: '举报', USER: '用户' } as const
const KINDS: { key: string; label: string; icon: IconName; color: string; match: (event: string) => boolean }[] = [
  { key: 'report', label: '举报处理', icon: 'flag', color: '#FF7D00', match: (event) => event.startsWith('admin_report') },
  { key: 'product', label: '商品处理', icon: 'shield', color: '#2F6BFF', match: (event) => event.startsWith('admin_product') },
  { key: 'user', label: '账号处理', icon: 'user', color: '#7B5CFF', match: (event) => event.startsWith('admin_user') },
]
const PAGE = 8
const WEEK = 7 * 24 * 3600 * 1000

/** The signed-in administrator's own account and decision trail (`mine=true` on the audited log). */
export function ProfilePage() {
  const { language } = useLanguage()
  const user = useSession((state) => state.user)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editor = useRef<HTMLElement>(null)
  const focusEditor = () => {
    editor.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
    editor.current?.focus({ preventScroll: true })
  }
  useEffect(() => { if (params.get('edit') === '1') focusEditor() }, [params])
  const { dashboard } = useConsole()
  const [page, setPage] = useState(1)
  // One audited read of the latest 100 own decisions feeds both the summary and the list.
  const remote = useRemote('admin-profile-mine', (signal) => api.data(api.adminListAuditLogs({ signal, query: { mine: true, scope: 'decisions', page: 1, pageSize: 100 } })))
  const items = remote.value?.items ?? []
  const total = remote.value?.pagination.total ?? 0
  const [now] = useState(() => Date.now())
  const recent = items.filter((row) => now - Date.parse(row.createdAt) < WEEK).length
  const pending = dashboard.value?.pending.total ?? 0
  const signOut = async () => {
    await api.logout()
    navigate('/market', { flushSync: true })
    useSession.getState().clear()
  }
  if (!user) return null
  const facts = [user.school, user.college, user.major].filter(Boolean)
  return localize(<div className="adm-section adm-profile">
    <div className="adm-head"><div><h1>个人中心</h1><p>管理个人资料，查看你的处理记录。</p></div></div>
    <div className="adm-pf-grid">
      <section className="adm-card adm-pf-hero" aria-label="账号资料">
        <div className="adm-pf-avatar"><Avatar size={84} src={user.avatar}>{<OriginalText>{user.nickname.slice(0, 1)}</OriginalText>}</Avatar></div>
        <div className="adm-pf-identity">
        <div className="adm-pf-title"><h2>{<OriginalText>{user.nickname}</OriginalText>}</h2>
        <div className="adm-pf-tags"><span className="adm-pill p-blue">管理员</span><span className={`adm-pill ${user.status === 'ACTIVE' ? 'p-green' : 'p-red'}`}>{user.status === 'ACTIVE' ? '账号正常' : '已禁用'}</span></div></div>
        <p className="adm-pf-line"><Icon name="mail" size={15} />{<OriginalText>{user.email}</OriginalText>}</p>
        {facts.length > 0 && <div className="adm-pf-line adm-pf-facts"><Icon name="user" size={15} /><div>{facts.map((fact, index) => <span key={index}>{language === 'zh' ? <OriginalText>{fact}</OriginalText> : <CatalogText text={fact!} />}</span>)}</div></div>}
        {user.bio && <p className="adm-pf-bio">{<CatalogText text={user.bio} />}</p>}
        </div>
        <div className="adm-pf-actions">
          <Button icon={<Icon name="edit" size={15} />} onClick={focusEditor}>编辑资料与头像</Button>
          <Button type="text" icon={<Icon name="logout" size={15} />} onClick={() => void signOut()}>退出登录</Button>
        </div>
      </section>

      <section ref={editor} id="admin-profile-editor" tabIndex={-1} className="adm-card adm-pf-editor" style={{ ['--tint' as string]: '#7B5CFF' }} aria-label="编辑资料与头像">
        <header className="adm-card-hd"><h2><span className="adm-hic"><Icon name="edit" size={15} /></span>编辑资料与头像</h2></header>
        <ProfileEditor />
      </section>

      <aside className="adm-card adm-pf-stats" aria-label="处理概览">
        <header className="adm-card-hd"><h2><span className="adm-hic"><Icon name="shield" size={15} /></span>处理概览</h2></header>
        <Stat tone="#2F6BFF" icon="check" label="累计处理决定" value={remote.value ? fmt(total) : '—'} note="下架、恢复、举报结论与账号状态变更" />
        <Stat tone="#14B8A6" icon="clock" label="近 7 天处理" value={remote.value ? (total > items.length && recent === items.length ? `${recent}+` : fmt(recent)) : '—'} note={items[0] ? `最近一次 ${clock(items[0].createdAt)}` : '还没有处理记录'} />
        <Stat tone="#F5365C" icon="alert" label="当前待处理" value={fmt(pending)} note={pending ? <Link to="/admin/reports">去处理 →</Link> : '暂无待处理事项'} />
        <section className="adm-pf-mix" aria-label="处理类型">
          <h3>处理类型</h3>
          <ul>{KINDS.map((kind) => {
            const count = items.filter((row) => kind.match(row.event)).length
            return localize(<li key={kind.key} style={{ ['--kc' as string]: kind.color }}>
              <span className="adm-pf-kic"><Icon name={kind.icon} size={15} /></span><span>{kind.label}</span><b>{count}</b>
              <i><u style={{ width: `${items.length ? (count / items.length) * 100 : 0}%` }} /></i>
            </li>)
          })}</ul>
        </section>
      </aside>

      <section className="adm-card adm-pf-log" style={{ ['--tint' as string]: '#3B8BFF' }} aria-label="我的处理记录">
        <header className="adm-card-hd"><h2><span className="adm-hic"><Icon name="log" size={15} /></span>我的处理记录</h2><small className="adm-card-sub">最近 {Math.min(total, 100)} 条</small><Link className="adm-more" to="/admin/audit">全部操作日志 ›</Link></header>
        <Resource {...remote}>
          {items.length ? <>
            <ul className="adm-notes">{items.slice((page - 1) * PAGE, page * PAGE).map((row) => localize(<Decision key={row.id} row={row} />))}</ul>
            {items.length > PAGE && <Pagination className="adm-pager" size="small" current={page} pageSize={PAGE} total={items.length} showSizeChanger={false} onChange={setPage} />}
          </> : <p className="adm-empty">还没有处理记录。下架商品、处理举报或禁用账号后会显示在这里。</p>}
        </Resource>
      </section>
    </div>
  </div>)
}

function Stat({ tone, icon, label, value, note }: { tone: string; icon: IconName; label: string; value: string; note: ReactNode }) {
  useLanguage()
  return localize(<section className="adm-pf-stat" style={{ ['--g1' as string]: tone, ['--g2' as string]: tone }} aria-label={label}>
    <div className="adm-kpi-top"><span className="adm-kpi-ic"><Icon name={icon} /></span>{label}</div>
    <div className="adm-kpi-val">{value}</div>
    <div className="adm-kpi-foot">{note}</div>
  </section>)
}

function Decision({ row }: { row: AdminAuditLog }) {
  useLanguage()
  const kind = row.event.includes('product') ? 'goods' : row.event.includes('user') ? 'user' : 'flag'
  const color = row.event === 'admin_user_disabled' || row.resultStatus === 'HIDDEN' ? 'var(--adm-red)' : row.resultStatus === 'REJECTED' ? 'var(--adm-orange)' : 'var(--adm-green)'
  return localize(<li>
    <span className="adm-note-ic" style={{ ['--nc' as string]: color }}><Icon name={kind} size={16} /></span>
    <div><p>{auditEventLabels[row.event] ?? row.event}{row.resultStatus && <> · {resultStatusLabels[row.resultStatus] ?? row.resultStatus}</>}{row.subject && <span className="adm-note-sub"> {SUBJECTS[row.subject.type]} #{row.subject.id}</span>}</p><small>{<CatalogText text={row.reason ?? '未填写理由'} />}</small></div>
    <time>{clock(row.createdAt)}</time>
  </li>)
}
