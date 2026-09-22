export type UserRole = 'student' | 'admin'

export interface CurrentUser {
  id: number
  nickname: string
  role: UserRole
  avatar?: string
  campusVerified?: boolean
  school?: string
  college?: string
  major?: string
  bio?: string
}