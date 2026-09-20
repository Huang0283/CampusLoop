import request from './request'
import type { ApiResponse } from '../types/api'

export interface LoginParams {
  email: string
  password: string
}

export interface LoginResult {
  token: string
  refreshToken: string
  role: string
  user: {
    id: number
    nickname: string
    avatar?: string
  }
}

export function login(data: LoginParams) {
  return request.post<ApiResponse<LoginResult>>('/auth/login', data)
}

export function register(data: LoginParams) {
  return request.post<ApiResponse<LoginResult>>('/auth/register', data)
}

export function logout() {
  return request.post<ApiResponse<null>>('/auth/logout')
}

export function getCurrentUser() {
  return request.get<ApiResponse<LoginResult['user']>>('/users/me')
}
