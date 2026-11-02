import { useState } from 'react'
import type { ReactNode } from 'react'
import { Avatar, Button, Pagination } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import * as api from '../sdk'
import type { AdminAuditLog } from '../sdk'
import { Resource, useRemote } from '../live/common'
import { useSession } from '../live/session'
import { useConsole } from './AdminLayout'
import { clock, fmt } from './format'
import { Icon, type IconName } from './icons'
import { auditEventLabels, resultStatusLabels } from './labels'

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
  const user = useSession((state) => state.user)
  const navigate = useNavigate()
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
  const facts = [user.school, user.college, user.major].filter(Boolean).join(' · ')
  return <div className="adm-section adm-profile">
    <div className="adm-head"><div><h1>个人中心</h1><p>你的管理员账号与处理记录。资料和头像与前台个人中心是同一份。</p></div></div>
    <div className="adm-pf-grid">
      <section className="adm-card adm-pf-hero" aria-label="账号资料">
        <div className="adm-pf-avatar"><Avatar size={84} src={user.avatar}>{user.nickname.slice(0, 1)}</Avatar></div>
        <h2>{user.nickname}</h2>
        <div className="adm-pf-tags"><span className="adm-pill p-blue">管理员</span><span className={`adm-pill ${user.status === 'ACTIVE' ? 'p-green' : 'p-red'}`}>{user.status === 'ACTIVE' ? '账号正常' : '已禁用'}</span></div>
        <p className="adm-pf-line"><Icon name="mail" size={15} />{user.email}</p>
        {facts && <p className="adm-pf-line"><Icon name="user" size={15} />{facts}</p>}
        {user.bio && <p className="adm-pf-bio">{user.bio}</p>}
        <div className="adm-pf-actions">
          <Button type="primary" icon={<Icon name="edit" size={15} />} onClick={() => navigate('/profile')}>编辑资料与头像</Button>
          <Button icon={<Icon name="logout" size={15} />} onClick={() => void signOut()}>退出登录</Button>
        </div>
      </section>

      <div className="adm-pf-stats">
        <Stat tone="#2F6BFF" icon="check" label="累计处理决定" value={remote.value ? fmt(total) : '—'} note="下架、恢复、举报结论与账号状态变更" />
        <Stat tone="#14B8A6" icon="clock" label="近 7 天处理" value={remote.value ? (total > items.length && recent === items.length ? `${recent}+` : fmt(recent)) : '—'} note={items[0] ? `最近一次 ${clock(items[0].createdAt)}` : '还没有处理记录'} />
        <Stat tone="#F5365C" icon="alert" label="当前待处理" value={fmt(pending)} note={pending ? <Link to="/admin/reports">去处理 →</Link> : '暂无待处理事项'} />
        <section className="adm-card adm-pf-mix" style={{ ['--tint' as string]: '#7B5CFF' }} aria-label="处理类型">
          <h3>处理类型</h3>
          <ul>{KINDS.map((kind) => {
            const count = items.filter((row) => kind.match(row.event)).length
            return <li key={kind.key} style={{ ['--kc' as string]: kind.color }}>
              <span className="adm-pf-kic"><Icon name={kind.icon} size={15} /></span><span>{kind.label}</span><b>{count}</b>
              <i><u style={{ width: `${items.length ? (count / items.length) * 100 : 0}%` }} /></i>
            </li>
          })}</ul>
        </section>
      </div>

      <section className="adm-card adm-pf-log" style={{ ['--tint' as string]: '#3B8BFF' }} aria-label="我的处理记录">
        <header className="adm-card-hd"><h2><span className="adm-hic"><Icon name="log" size={15} /></span>我的处理记录</h2><small className="adm-card-sub">最近 {Math.min(total, 100)} 条</small><Link className="adm-more" to="/admin/audit">全部操作日志 ›</Link></header>
        <Resource {...remote}>
          {items.length ? <>
            <ul className="adm-notes">{items.slice((page - 1) * PAGE, page * PAGE).map((row) => <Decision key={row.id} row={row} />)}</ul>
            {items.length > PAGE && <Pagination className="adm-pager" size="small" current={page} pageSize={PAGE} total={items.length} showSizeChanger={false} onChange={setPage} />}
          </> : <p className="adm-empty">还没有处理记录。下架商品、处理举报或禁用账号后会显示在这里。</p>}
        </Resource>
      </section>
    </div>
  </div>
}

function Stat({ tone, icon, label, value, note }: { tone: string; icon: IconName; label: string; value: string; note: ReactNode }) {
  return <section className="adm-card adm-kpi adm-pf-stat" style={{ ['--g1' as string]: tone, ['--g2' as string]: tone, ['--tint' as string]: tone }} aria-label={label}>
    <div className="adm-kpi-top"><span className="adm-kpi-ic"><Icon name={icon} /></span>{label}</div>
    <div className="adm-kpi-val">{value}</div>
    <div className="adm-kpi-foot">{note}</div>
  </section>
}

function Decision({ row }: { row: AdminAuditLog }) {
  const kind = row.event.includes('product') ? 'goods' : row.event.includes('user') ? 'user' : 'flag'
  const color = row.event === 'admin_user_disabled' || row.resultStatus === 'HIDDEN' ? 'var(--adm-red)' : row.resultStatus === 'REJECTED' ? 'var(--adm-orange)' : 'var(--adm-green)'
  return <li>
    <span className="adm-note-ic" style={{ ['--nc' as string]: color }}><Icon name={kind} size={16} /></span>
    <div><p>{auditEventLabels[row.event] ?? row.event}{row.resultStatus && <> · {resultStatusLabels[row.resultStatus] ?? row.resultStatus}</>}{row.subject && <span className="adm-note-sub"> {SUBJECTS[row.subject.type]} #{row.subject.id}</span>}</p><small>{row.reason ?? '未填写理由'}</small></div>
    <time>{clock(row.createdAt)}</time>
  </li>
}
