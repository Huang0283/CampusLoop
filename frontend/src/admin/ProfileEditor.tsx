import { useState } from 'react'
import { App, Button, Input, Space } from 'antd'
import * as api from '../sdk'
import type { UpdateProfileRequest, UserProfile } from '../sdk'
import { Form } from '../i18n/Form'
import { localize, LocalizedText } from '../i18n/Localize'
import { useLanguage } from '../i18n/language'
import { AvatarUpload } from '../live/AvatarUpload'
import { Failure, Resource, useMutation, useRemote } from '../live/common'
import { useSession } from '../live/session'

const editable = (profile: UserProfile): UpdateProfileRequest => ({
  nickname: profile.nickname, avatar: profile.avatar ?? null,
  bio: profile.bio ?? '', school: profile.school ?? '', college: profile.college ?? '', major: profile.major ?? '',
})

/** The page editor edits only the signed-in account through /users/me. */
export function ProfileEditor() {
  useLanguage()
  const userId = useSession((state) => state.user?.id)
  const remote = useRemote(`admin-edit-profile-${userId}`, (signal) => api.data(api.getCurrentUser({ signal })))
  return localize(<Resource {...remote}>
    {remote.value && <ProfileForm key={remote.value.id} profile={remote.value} />}
  </Resource>)
}

function ProfileForm({ profile }: { profile: UserProfile }) {
  useLanguage()
  const mutation = useMutation()
  const { message } = App.useApp()
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(() => editable(profile))
  const [form] = Form.useForm<UpdateProfileRequest>()
  const save = (values: UpdateProfileRequest) => {
    if (uploading || mutation.busy) return
    void mutation.run(async () => {
      // Explicit allowlist: never submit the role, email or other account fields.
      const body: UpdateProfileRequest = {
        nickname: values.nickname?.trim(), avatar: values.avatar ?? null,
        bio: values.bio, school: values.school, college: values.college, major: values.major,
      }
      const next = await api.data(api.updateCurrentUser({ body }))
      useSession.getState().update(next)
      const confirmed = editable(next)
      setSaved(confirmed)
      form.setFieldsValue(confirmed)
      message.success(<LocalizedText>资料已保存。</LocalizedText>)
    })
  }
  return localize(<>
    <Failure error={mutation.error} />
    <Form form={form} layout="vertical" initialValues={saved} onFinish={save} disabled={mutation.busy} requiredMark={false}>
      <div className="adm-pf-form-avatar"><Form.Item name="avatar" label="头像"><AvatarUpload onBusyChange={setUploading} disabled={mutation.busy} /></Form.Item></div>
      <div className="adm-pf-form-fields">
        <Form.Item name="nickname" label="昵称" rules={[{ required: true, whitespace: true, max: 40, message: '请输入 1–40 个字符的昵称，不能全为空格。' }]}><Input maxLength={40} /></Form.Item>
        {(['school', 'college', 'major'] as const).map((field) => localize(<Form.Item key={field} name={field} label={{ school: '学校', college: '学院', major: '专业' }[field]}><Input maxLength={80} /></Form.Item>))}
        <Form.Item name="bio" label="简介" className="adm-pf-form-bio"><Input.TextArea rows={3} maxLength={500} showCount /></Form.Item>
      </div>
      <Space wrap className="adm-pf-form-actions">
        <Button type="primary" htmlType="submit" aria-label="保存资料" loading={mutation.busy} disabled={uploading}>保存资料</Button>
        <Button aria-label="重置修改" onClick={() => {
          form.resetFields()
          message.info(<LocalizedText>已恢复上次保存的资料，未保存的修改已撤销。</LocalizedText>)
        }} disabled={uploading || mutation.busy}>重置修改</Button>
      </Space>
    </Form>
  </>)
}
