import { Alert, Button, Card, Descriptions, Input, Pagination, Space, Tag } from 'antd'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Form } from '../i18n/Form'
import { CatalogText } from '../i18n/CatalogText'
import { localize } from '../i18n/Localize'
import { useLanguage } from '../i18n/language'
import * as api from '../sdk'
import type { AccountDecisionRecord, AccountAppealRecord } from '../sdk'
import { Failure, NoItems, Page, Resource, useMutation, useRemote } from './common'
import { appealStatusLabels, displayDate } from './display'
import { ImageQueue } from './ImageQueue'
import { ModerationImage } from './ModerationImage'
import { useSession } from './session'
import './moderation.css'

export function DecisionSummary({ decision }: { decision: AccountDecisionRecord }) {
  useLanguage()
  return localize(<Descriptions column={1} bordered size="small" items={[
    { key: 'action', label: '处理结果', children: <Space wrap><Tag color={decision.action === 'DISABLE' ? 'red' : 'orange'}>{decision.action === 'DISABLE' ? '禁用账号' : '违规警告'}</Tag>{decision.revokedAt && <Tag color="green">已撤销</Tag>}</Space> },
    { key: 'occurred', label: '行为发生时间', children: decision.occurredAt ? displayDate(decision.occurredAt) : '历史处理未记录具体发生时间' },
    { key: 'created', label: '处理时间', children: displayDate(decision.createdAt) },
    { key: 'facts', label: '相关行为与事实', children: <CatalogText text={decision.facts} /> },
    { key: 'basis', label: '处理依据', children: <CatalogText text={decision.basis} /> },
    { key: 'reason', label: '处理原因', children: <CatalogText text={decision.reason} /> },
    ...(decision.reference ? [{ key: 'product', label: '关联商品快照', children: <CatalogText text={`#${decision.reference.productId} ${decision.reference.title}`} /> }] : []),
    ...(decision.revokedAt ? [{ key: 'revoked', label: '撤销时间', children: displayDate(decision.revokedAt) }, { key: 'revocation', label: '撤销说明', children: <CatalogText text={decision.revocationReason || ''} /> }] : []),
  ]} />)
}

export function AppealSummary({ appeal }: { appeal: AccountAppealRecord }) {
  useLanguage()
  return localize(<Descriptions column={1} bordered size="small" items={[
    { key: 'status', label: '申诉状态', children: <Tag color={appeal.status === 'PENDING' ? 'orange' : 'green'}>{appealStatusLabels[appeal.status]}</Tag> },
    { key: 'time', label: '申诉时间', children: displayDate(appeal.createdAt) },
    { key: 'explanation', label: '申诉说明', children: <CatalogText text={appeal.explanation} /> },
    ...(appeal.reviewedAt ? [{ key: 'reviewed', label: '复核时间', children: displayDate(appeal.reviewedAt) }, { key: 'reason', label: '复核说明', children: <CatalogText text={appeal.reviewReason || ''} /> }] : []),
  ]} />)
}

export function AccountDecisionsPage() {
  useLanguage()
  const user = useSession(state => state.user)
  const token = useSession(state => state.appealToken)
  if (!user && !token) return <Navigate to="/login" replace />
  return <DecisionContent key={`${user?.id}-${token}`} token={token} />
}

function DecisionContent({ token }: { token: string | null }) {
  useLanguage()
  const { decisionId } = useParams()
  const [page, setPage] = useState(1)
  const [uploading, setUploading] = useState(false)
  const [form] = Form.useForm()
  const mutation = useMutation()
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined
  const list = useRemote(`account-decisions-${page}`, signal => api.data(api.listAccountDecisions({ signal, headers, query: { page, pageSize: 10 } })))
  const detail = useRemote(`account-decision-${decisionId}`, signal => decisionId ? api.data(api.getAccountDecision({ signal, headers, path: { decisionId: Number(decisionId) } })) : Promise.resolve(null))
  const decision = detail.value
  return localize(<Page title="账号处理记录" subtitle="查看处理事实、依据和申诉进度。原始记录会保留，复核结果另行记录。" extra={<Space wrap><Link to="/account/decisions">全部处理记录</Link>{token ? <Button onClick={() => { useSession.getState().clear(); window.location.assign('/login') }}>返回登录</Button> : <Link to="/notifications">返回通知</Link>}</Space>}>
    {token && <Alert type="warning" showIcon title="当前仅可查看本人的处理记录并申诉，不能进行交易。凭证有效期为 15 分钟，过期后请重新登录验证。" style={{ marginBottom: 16 }} />}
    {decisionId ? <Resource {...detail}>{decision && <div className="moderation-stack">
      <Card title={`处理记录 #${decision.id}`}><DecisionSummary decision={decision} /><Space wrap style={{ marginTop: 16 }}>{decision.evidence.map((_, index) => <ModerationImage key={index} load={signal => api.getDecisionEvidence({ signal, headers, path: { decisionId: decision.id, imageIndex: index }, parseAs: 'blob' })} />)}</Space></Card>
      <Card title="申诉与复核">
        {decision.appeal ? <><AppealSummary appeal={decision.appeal} /><Space wrap style={{ marginTop: 16 }}>{decision.appeal.evidence.map((_, index) => <ModerationImage key={index} load={signal => api.getOwnAppealEvidence({ signal, headers, path: { appealId: decision.appeal!.id, imageIndex: index }, parseAs: 'blob' })} />)}</Space><Button style={{ marginTop: 16 }} onClick={detail.reload}>刷新复核进度</Button></> : decision.revokedAt ? <Alert type="success" title="该处理已撤销，无需申诉。" /> : <>
          <Alert type="info" showIcon title="每条处理记录可提交一次申诉。请一次写清情况，提交后等待管理员复核。" style={{ marginBottom: 16 }} />
          <Failure error={mutation.error} />
          <Form form={form} layout="vertical" onFinish={(values: { explanation: string; evidence?: string[] }) => void mutation.run(async () => { await api.data(api.submitAccountAppeal({ headers, path: { decisionId: decision.id }, body: { explanation: values.explanation.trim(), evidence: values.evidence || [] } })); form.resetFields(); detail.reload(); list.reload() })}>
            <Form.Item name="explanation" label="申诉说明" rules={[{ required: true, whitespace: true, max: 2000 }]}><Input.TextArea rows={5} maxLength={2000} showCount placeholder="请说明对处理结果有异议的原因，并补充相关事实。" /></Form.Item>
            <Form.Item name="evidence" label="补充证据图片（可选，私有存储）"><ImageQueue onBusyChange={setUploading} uploadImage={file => api.data(api.uploadAppealImage({ headers, body: { file } }))} /></Form.Item>
            <Button type="primary" htmlType="submit" loading={mutation.busy} disabled={uploading}>提交申诉</Button>
          </Form>
        </>}
      </Card>
    </div>}</Resource> : <Resource {...list}>{list.value && <div className="moderation-stack">
      {!list.value.items.length && <NoItems />}
      {list.value.items.map(item => <Card key={item.id} title={`处理记录 #${item.id}`} extra={<Link to={`/account/decisions/${item.id}`}>查看详情与申诉</Link>}><Space wrap><Tag color={item.action === 'DISABLE' ? 'red' : 'orange'}>{item.action === 'DISABLE' ? '禁用账号' : '违规警告'}</Tag>{item.revokedAt && <Tag color="green">已撤销</Tag>}{item.appeal && <Tag>{appealStatusLabels[item.appeal.status]}</Tag>}<span>{displayDate(item.createdAt)}</span></Space><p><CatalogText text={item.reason} /></p></Card>)}
      <Pagination current={page} pageSize={10} total={list.value.pagination.total} onChange={setPage} showSizeChanger={false} />
    </div>}</Resource>}
  </Page>)
}
