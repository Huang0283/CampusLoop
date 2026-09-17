import { Form, Input, Button } from 'antd'
import type { UserProfile } from '../../api/user'

interface ProfileFormProps {
  profile: UserProfile
  onSubmit: (values: Partial<UserProfile>) => void
  loading?: boolean
}

export default function ProfileForm({ profile, onSubmit, loading }: ProfileFormProps) {
  const [form] = Form.useForm()

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={profile}
      onFinish={onSubmit}
    >
      <Form.Item label="Nickname" name="nickname" rules={[{ required: true }]}>
        <Input />
      </Form.Item>

      <Form.Item label="School" name="school">
        <Input />
      </Form.Item>

      <Form.Item label="College" name="college">
        <Input />
      </Form.Item>

      <Form.Item label="Major" name="major">
        <Input />
      </Form.Item>

      <Button type="primary" htmlType="submit" loading={loading}>
        Save
      </Button>
    </Form>
  )
}