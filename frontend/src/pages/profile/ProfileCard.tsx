import { Card, Avatar, Descriptions, Tag } from 'antd'
import type { UserProfile } from '../../api/user'

interface ProfileCardProps {
  profile: UserProfile
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <Card title="Profile">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar size={64} src={profile.avatar}>
          {profile.nickname?.[0]}
        </Avatar>
        <div>
          <h2 style={{ margin: 0 }}>{profile.nickname}</h2>
          <Tag color="blue">{profile.creditLevel}</Tag>
        </div>
      </div>

      <Descriptions column={1} style={{ marginTop: 16 }}>
        <Descriptions.Item label="School">{profile.school || '-'}</Descriptions.Item>
        <Descriptions.Item label="College">{profile.college || '-'}</Descriptions.Item>
        <Descriptions.Item label="Major">{profile.major || '-'}</Descriptions.Item>
        <Descriptions.Item label="Trades">{profile.tradeCount}</Descriptions.Item>
        <Descriptions.Item label="Rating">{profile.rating}</Descriptions.Item>
      </Descriptions>
    </Card>
  )
}