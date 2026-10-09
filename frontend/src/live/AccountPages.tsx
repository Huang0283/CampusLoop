import { useRef } from 'react'
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { adminListUsers, adminUpdateUserStatus, data, getCurrentUser, login, register, updateCurrentUser } from '../sdk'
import type { UpdateProfileRequest } from '../sdk'
import { Failure, Page, Resource, useMutation, useRemote } from './common'
import { useSession } from './session'

export function AuthPage({ registering = false }: { registering?: boolean }) {
  const mutation = useMutation()
  const navigate = useNavigate()
  const location = useLocation()
  const onFinish = (values: { email: string; password: string; nickname?: string }) => void mutation.run(async () => {
    const result = registering ? await data(register({ body: { email: values.email, password: values.password, nickname: values.nickname || '' } })) : await data(login({ body: { email: values.email, password: values.password } }))
    useSession.getState().accept(result)
    const from: unknown = location.state?.from
    const safe = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.includes('\\') && !from.startsWith('/login') && !from.startsWith('/register')
    navigate(safe ? from : result.user.role === 'ADMIN' ? '/admin' : '/market', { replace: true })
  })
  return <Card style={{ maxWidth: 440, margin: '40px auto' }} title={registering ? '创建账号' : '登录 CampusLoop'}>
    <Failure error={mutation.error} />
    <Form layout="vertical" onFinish={onFinish}>
      <Form.Item name="email" label="校园邮箱" rules={[{ required: true }, { type: 'email' }]}><Input autoComplete="username" /></Form.Item>
      {registering && <Form.Item name="nickname" label="昵称" rules={[{ required: true, whitespace: true, max: 40 }]}><Input maxLength={40} /></Form.Item>}
      <Form.Item name="password" label="密码" rules={[{ required: true, min: registering ? 8 : 1, max: 128 }]}><Input.Password autoComplete={registering ? 'new-password' : 'current-password'} /></Form.Item>
      <Button type="primary" htmlType="submit" block loading={mutation.busy}>{registering ? '注册并登录' : '登录'}</Button>
    </Form>
    <Space style={{ marginTop: 16 }}><Link to={registering ? '/login' : '/register'}>{registering ? '已有账号，去登录' : '注册账号'}</Link><Link to="/market">先逛逛</Link></Space>
    {registering && <Alert style={{ marginTop: 16 }} type="info" title="当前为教学模拟邮箱域验证，不代表真实学籍认证。开发环境支持 example.com / example.invalid。" />}
  </Card>
}

export function ProfilePage() {
  const user = useSession((state) => state.user)
  const remote = useRemote(`profile-${user?.id}`, (signal) => data(getCurrentUser({ signal })))
  const mutation = useMutation()
  return <Page title="个人资料"><Resource {...remote}>
    {remote.value && <Card key={remote.value.id}>
      <Typography.Paragraph>{remote.value.email} · 已完成交易 {remote.value.transactionCount} 笔 · 评分 {remote.value.rating || '暂无评价'}</Typography.Paragraph>
      <Failure error={mutation.error} />
      <Form layout="vertical" initialValues={remote.value} onFinish={(values: UpdateProfileRequest) => void mutation.run(async () => {
        const next = await data(updateCurrentUser({ body: values })); useSession.getState().update(next); remote.reload()
      })}>
        <Form.Item name="nickname" label="昵称" rules={[{ required: true, whitespace: true, max: 40 }]}><Input /></Form.Item>
        <Form.Item name="bio" label="简介"><Input.TextArea maxLength={500} /></Form.Item>
        {(['school', 'college', 'major'] as const).map((field) => <Form.Item key={field} name={field} label={{ school: '学校', college: '学院', major: '专业' }[field]}><Input maxLength={80} /></Form.Item>)}
        <Button htmlType="submit" type="primary" loading={mutation.busy}>保存资料</Button>
      </Form>
    </Card>}
  </Resource></Page>
}

export function AdminPage() {
  const remote = useRemote('admin-users', (signal) => data(adminListUsers({ signal })))
  const mutation = useMutation()
  const reason = useRef('')
  return <Page title="用户管理"><Resource {...remote}><Failure error={mutation.error} />
    <Alert type="info" title="账号状态操作会记录审计；禁用同时撤销已有会话。后台高级治理属于下一阶段。" style={{ marginBottom: 16 }} />
    <Input placeholder="填写本次状态变更原因" maxLength={200} onChange={(event) => { reason.current = event.target.value }} style={{ marginBottom: 16 }} />
    {remote.value?.items.map((user) => <Card key={user.id} style={{ marginBottom: 12 }}><Space wrap><strong>{user.nickname}</strong><span>{user.status}</span><span>{user.role}</span>
      {user.role === 'USER' && <Button loading={mutation.busy} onClick={() => void mutation.run(async () => {
        if (!reason.current.trim()) throw new Error('请填写变更原因。')
        await adminUpdateUserStatus({ path: { userId: user.id }, body: { status: user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE', reason: reason.current } }); remote.reload()
      })}>{user.status === 'ACTIVE' ? '禁用' : '恢复'}</Button>}
    </Space></Card>)}
  </Resource></Page>
}
