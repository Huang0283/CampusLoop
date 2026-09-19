import request from './request'
import type { ApiResponse } from '../types/api'

export interface UserProfile {
  id: number
  nickname: string
  avatar?: string
  school?: string
  college?: string
  major?: string
  tradeCount: number
  rating: number
  creditLevel: string
}

export function getProfile(id: number) {
  return request.get<ApiResponse<UserProfile>>(`/users/${id}`)
}

export function updateProfile(data: Partial<UserProfile>) {
  return request.patch<ApiResponse<UserProfile>>('/users/me', data)
}