import { useState } from 'react'
import { PageContainer } from '../../components'
import ProfileCard from './ProfileCard'
import ProfileForm from './ProfileForm'
import type { UserProfile } from '../../api/user'

const mockProfile: UserProfile = {
  id: 1,
  nickname: 'Test User',
  school: 'Example University',
  college: 'Computer Science',
  major: 'Software Engineering',
  tradeCount: 0,
  rating: 5.0,
  creditLevel: 'New',
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(mockProfile)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (values: Partial<UserProfile>) => {
    setLoading(true)
    setTimeout(() => {
      setProfile((prev) => ({ ...prev, ...values }))
      setLoading(false)
    }, 500)
  }

  return (
    <PageContainer title="Profile">
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px' }}>
          <ProfileCard profile={profile} />
        </div>
        <div style={{ flex: '1 1 320px' }}>
          <ProfileForm profile={profile} onSubmit={handleSubmit} loading={loading} />
        </div>
      </div>
    </PageContainer>
  )
}