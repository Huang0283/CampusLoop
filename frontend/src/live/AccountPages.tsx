import { Avatar, Button, Form, Input, Rate, Space, Tag } from 'antd'
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { data, getCurrentUser, login, register, updateCurrentUser } from '../sdk'
import type { UpdateProfileRequest } from '../sdk'
import { Failure, Page, Resource, useMutation, useRemote } from './common'
import { useSession } from './session'
import { AuthScene } from '../landing/AuthScene'

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
  return <AuthScene registering={registering}>
    <Failure error={mutation.error} />
    <Form layout="vertical" onFinish={onFinish} size="large" requiredMark={false}>
      <Form.Item name="email" label="校园邮箱" rules={[{ required: true }, { type: 'email' }]}><Input prefix={<MailOutlined />} placeholder="请输入邮箱" autoComplete="username" autoFocus /></Form.Item>
      {registering && <Form.Item name="nickname" label="昵称" rules={[{ required: true, whitespace: true, max: 40 }]}><Input prefix={<UserOutlined />} placeholder="请输入昵称" maxLength={40} /></Form.Item>}
      <Form.Item name="password" label="密码" rules={[{ required: true, min: registering ? 8 : 1, max: 128 }]}><Input.Password prefix={<LockOutlined />} placeholder={registering ? '请设置至少 8 位密码' : '请输入密码'} autoComplete={registering ? 'new-password' : 'current-password'} /></Form.Item>
      {registering && <p className="note">教学演示注册：请填写类似 name@example.invalid 或 name@example.com 的测试邮箱，并自行设置密码。无需真实邮箱，也不会发送验证码；这不代表真实学校身份认证。已有账号请直接登录。</p>}
      <Button type="primary" htmlType="submit" block loading={mutation.busy} className="submit">{registering ? '注册并登录' : '登录'}</Button>
    </Form>
    <div className="alt"><Link to={registering ? '/login' : '/register'} state={location.state}>{registering ? '已有账号，去登录' : '还没有账号？去注册'}</Link><Link to="/market">先逛逛 →</Link></div>
  </AuthScene>
}

export function ProfilePage() {
  const user = useSession((state) => state.user)
  const remote = useRemote(`profile-${user?.id}`, (signal) => data(getCurrentUser({ signal })))
  const mutation = useMutation()
  const profile = remote.value
  return <Page title="个人资料"><Resource {...remote}>
    {profile && <div className="profile-grid" key={profile.id}>
      <section className="surface profile-summary" aria-label="个人资料概览"><Avatar size={120} src={profile.avatar}>{profile.nickname.slice(0, 1)}</Avatar><h2>{profile.nickname}</h2><p className="muted">{profile.email}</p><Tag color="blue">校园交易用户</Tag>
        {([['学校', profile.school || '未填写'], ['学院', profile.college || '未填写'], ['专业', profile.major || '未填写'], ['交易次数', `${profile.transactionCount} 次`]]).map(([label, value]) => <div className="profile-info" key={label}><span className="muted">{label}</span><strong>{value}</strong></div>)}
        <div className="profile-info"><span className="muted">评分</span>{profile.rating > 0 ? <Space><Rate disabled allowHalf value={profile.rating} style={{ fontSize: 14 }} /><strong>{profile.rating.toFixed(1)}</strong></Space> : <span>暂无评价</span>}</div>
      </section>
      <section className="surface profile-editor" aria-label="编辑资料"><h2>编辑资料</h2>
      <Failure error={mutation.error} />
      <Form layout="vertical" size="large" initialValues={profile} onFinish={(values: UpdateProfileRequest) => void mutation.run(async () => {
        const next = await data(updateCurrentUser({ body: values })); useSession.getState().update(next); remote.reload()
      })}>
        <Form.Item name="nickname" label="昵称" rules={[{ required: true, whitespace: true, max: 40 }]}><Input /></Form.Item>
        <Form.Item name="bio" label="简介"><Input.TextArea maxLength={500} /></Form.Item>
        {(['school', 'college', 'major'] as const).map((field) => <Form.Item key={field} name={field} label={{ school: '学校', college: '学院', major: '专业' }[field]}><Input maxLength={80} /></Form.Item>)}
        <Button htmlType="submit" type="primary" loading={mutation.busy}>保存资料</Button>
      </Form>
    </section></div>}
  </Resource></Page>
}

