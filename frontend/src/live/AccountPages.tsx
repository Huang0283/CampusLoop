import { localize, LocalizedText, OriginalText } from '../i18n/Localize'
import { useLanguage } from '../i18n/language'
import { CatalogText } from '../i18n/CatalogText'
import { useState } from 'react'
import { Avatar, Button, Input, Rate, Space, Tag, message } from 'antd'
import { Form } from '../i18n/Form'
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, data, getCurrentUser, login, register, updateCurrentUser } from '../sdk'
import type { UpdateProfileRequest, UserProfile } from '../sdk'
import { Failure, Page, Resource, useMutation, useRemote } from './common'
import { useSession } from './session'
import { AuthScene } from '../landing/AuthScene'
import { AvatarUpload } from './AvatarUpload'

export function AuthPage({ registering = false }: { registering?: boolean }) {
  useLanguage()
  return localize(<AuthForm key={registering ? 'register' : 'login'} registering={registering} />)
}

function authError(error: unknown, registering: boolean) {
  if (error instanceof ApiError) {
    const messages: Record<string, string> = {
      AUTH_INVALID_CREDENTIALS: '邮箱或密码错误，请检查后重试。',
      EMAIL_ALREADY_REGISTERED: '该邮箱已注册，请直接登录或使用其他邮箱。',
      ACCOUNT_DISABLED: '该账号已被禁用，请联系管理员处理。',
      RATE_LIMITED: '操作过于频繁，请稍后再试。',
      AUTH_SERVICE_UNAVAILABLE: '登录服务暂不可用，请稍后重试。',
      NETWORK_ERROR: '网络连接失败，请检查网络后重试。',
      REQUEST_CANCELLED_OR_TIMEOUT: '请求超时，请稍后重试。',
      VALIDATION_ERROR: registering ? '注册信息格式有误，请检查邮箱后缀、密码长度和昵称。' : '登录信息格式有误，请检查邮箱和密码。',
    }
    if (messages[error.code]) return messages[error.code]
    if (error.status >= 500) return '服务暂不可用，请稍后重试。'
    if (error.status === 0) return '网络连接失败，请检查网络后重试。'
  }
  return registering ? '注册失败，请检查填写的信息后重试。' : '登录失败，请检查邮箱和密码后重试。'
}

function AuthForm({ registering }: { registering: boolean }) {
  useLanguage()
  const mutation = useMutation()
  const navigate = useNavigate()
  const location = useLocation()
  const onFinish = (values: { email: string; password: string; nickname?: string }) => void mutation.run(async () => {
    const result = await (registering ? data(register({ body: { email: values.email.trim(), password: values.password, nickname: values.nickname || '' } })) : data(login({ body: { email: values.email.trim(), password: values.password } }))).catch((error: unknown) => { throw new Error(authError(error, registering)) })
    useSession.getState().accept(result)
    const from: unknown = location.state?.from
    const safe = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.includes('\\') && !from.startsWith('/login') && !from.startsWith('/register')
    const adminReturn = safe && (from === '/admin' || from.startsWith('/admin/') || from.startsWith('/admin?'))
    navigate(result.user.role === 'ADMIN' ? adminReturn ? from : '/admin' : safe ? from : '/market', { replace: true })
  })
  return localize(<AuthScene registering={registering}>
    <Failure error={mutation.error} />
    <Form layout="vertical" onFinish={onFinish} size="large" requiredMark={false}>
      <Form.Item name="email" label="校园邮箱" normalize={(value: string) => value.trim()} extra={registering ? '演示邮箱后缀：@example.com 或 @example.invalid，例如 name@example.com。' : undefined} rules={[{ required: true, message: '请输入邮箱。' }, { type: 'email', max: 255, message: '请输入完整邮箱，例如 name@example.com。' }]}><Input prefix={<MailOutlined />} placeholder={registering ? 'name@example.com' : '请输入邮箱'} autoComplete="username" autoFocus /></Form.Item>
      {registering && <Form.Item name="nickname" label="昵称" rules={[{ required: true, whitespace: true, max: 40, message: '请输入 1–40 个字符的昵称，不能全为空格。' }]}><Input prefix={<UserOutlined />} placeholder="请输入昵称" maxLength={40} /></Form.Item>}
      <Form.Item name="password" label="密码" extra={registering ? '密码长度为 8–128 个字符，区分大小写；不是只能填写 8 位。' : undefined} rules={[{ required: true, message: '请输入密码。' }, { min: registering ? 8 : 1, max: 128, message: registering ? '密码长度须为 8–128 个字符。' : '密码不能超过 128 个字符。' }]}><Input.Password prefix={<LockOutlined />} placeholder={registering ? '请设置 8–128 个字符的密码' : '请输入密码'} autoComplete={registering ? 'new-password' : 'current-password'} /></Form.Item>
      {registering && <p className="note">教学演示注册：请填写类似 name@example.invalid 或 name@example.com 的测试邮箱，并自行设置密码。无需真实邮箱，也不会发送验证码；这不代表真实学校身份认证。已有账号请直接登录。</p>}
      <Button type="primary" htmlType="submit" aria-label={registering ? '注册并登录' : '登录'} block loading={mutation.busy} className="submit">{registering ? '注册并登录' : '登录'}</Button>
    </Form>
    <div className="alt"><Link to={registering ? '/login' : '/register'} state={location.state}>{registering ? '已有账号，去登录' : '还没有账号？去注册'}</Link><Link to="/market">先逛逛 →</Link></div>
  </AuthScene>)
}

export function ProfilePage() {
  useLanguage()
  const user = useSession((state) => state.user)
  const remote = useRemote(`profile-${user?.id}`, (signal) => data(getCurrentUser({ signal })), 0, true)
  return localize(<Page title="个人资料"><Resource {...remote}>
    {remote.value && <ProfileEditor key={remote.value.id} profile={remote.value} refresh={remote.reload} />}
  </Resource></Page>)
}

function ProfileEditor({ profile, refresh }: { profile: UserProfile; refresh: () => void }) {
  useLanguage()
  const mutation = useMutation()
  const [form] = Form.useForm<UpdateProfileRequest>()
  const avatar = Form.useWatch('avatar', form)
  const [uploading, setUploading] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()
  return localize(<div className="profile-grid">
      {contextHolder}
      <section className="surface profile-summary" aria-label="个人资料概览"><Avatar size={120} src={avatar === undefined ? profile.avatar : avatar}>{<OriginalText>{profile.nickname.slice(0, 1)}</OriginalText>}</Avatar><h2>{<OriginalText>{profile.nickname}</OriginalText>}</h2><p className="muted">{<OriginalText>{profile.email}</OriginalText>}</p><Tag color="blue">校园交易用户</Tag>
        {([['学校', profile.school || '未填写'], ['学院', profile.college || '未填写'], ['专业', profile.major || '未填写'], ['交易次数', `${profile.transactionCount} 次`]]).map(([label, value]) => localize(<div className="profile-info" key={label}><span className="muted">{label}</span><strong>{label === '交易次数' ? value : <CatalogText text={value} />}</strong></div>))}
        <div className="profile-info"><span className="muted">评分</span>{profile.rating > 0 ? <Space><Rate disabled allowHalf value={profile.rating} style={{ fontSize: 14 }} /><strong>{profile.rating.toFixed(1)}</strong></Space> : <span>暂无评价</span>}</div>
      </section>
      <section className="surface profile-editor" aria-label="编辑资料"><h2>编辑资料</h2>
      <Failure error={mutation.error} />
      <Form form={form} layout="vertical" size="large" initialValues={profile} onFinish={(values: UpdateProfileRequest) => {
        if (uploading) return
        void mutation.run(async () => {
          const next = await data(updateCurrentUser({ body: values }))
          useSession.getState().update(next); form.setFieldsValue(next)
          void messageApi.success(<LocalizedText>资料已保存。</LocalizedText>); refresh()
        })
      }}>
        <Form.Item name="avatar" label="头像"><AvatarUpload onBusyChange={setUploading} disabled={mutation.busy} /></Form.Item>
        <Form.Item name="nickname" label="昵称" rules={[{ required: true, whitespace: true, max: 40, message: '请输入 1–40 个字符的昵称，不能全为空格。' }]}><Input maxLength={40} /></Form.Item>
        <Form.Item name="bio" label="简介"><Input.TextArea maxLength={500} /></Form.Item>
        {(['school', 'college', 'major'] as const).map((field) => localize(<Form.Item key={field} name={field} label={{ school: '学校', college: '学院', major: '专业' }[field]}><Input maxLength={80} /></Form.Item>))}
        <Button htmlType="submit" type="primary" aria-label="保存资料" loading={mutation.busy} disabled={uploading}>保存资料</Button>
      </Form>
    </section></div>)
}

