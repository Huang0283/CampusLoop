/**
 * 登录态全局 store
 *
 * 职责：持有当前用户身份，并同步到 localStorage。
 * - 持久化键与路由守卫（RequireAuth / RequireRole）已读的键保持一致，
 *   因此守卫无需改动即可继续工作。
 * - realtime store 的 currentUserId() 读 localStorage 'userId'，
 *   切换演示身份后聊天消息的 senderId 会随之变化。
 *
 * 原型阶段登录为演示占位（PrototypeLoginPage 调用 login 写假 token），
 * 接 M2/M5 后替换为真实接口调用。
 */

import { create } from 'zustand'
import type { CurrentUser } from '../types/user'

const STORAGE_KEYS = {
  token: 'token',
  role: 'role',
  userId: 'userId',
  nickname: 'nickname',
} as const

/** 从 localStorage 恢复身份（页面刷新后 store 初始化即有值） */
function readUser(): CurrentUser | null {
  const token = localStorage.getItem(STORAGE_KEYS.token)
  const id = Number(localStorage.getItem(STORAGE_KEYS.userId))
  if (!token || !Number.isFinite(id) || id <= 0) return null
  const role = localStorage.getItem(STORAGE_KEYS.role)
  return {
    id,
    nickname: localStorage.getItem(STORAGE_KEYS.nickname) || '我',
    role: role === 'admin' ? 'admin' : 'student',
  }
}

interface AuthState {
  user: CurrentUser | null
  /** 写入身份并持久化（原型演示：直接生效，不发请求） */
  login: (user: CurrentUser) => void
  /** 原型演示：切换身份（订单页买卖方视角切换用），与 login 同语义 */
  switchUser: (user: CurrentUser) => void
  logout: () => void
}

function persist(user: CurrentUser) {
  localStorage.setItem(STORAGE_KEYS.token, 'prototype-token')
  localStorage.setItem(STORAGE_KEYS.role, user.role)
  localStorage.setItem(STORAGE_KEYS.userId, String(user.id))
  localStorage.setItem(STORAGE_KEYS.nickname, user.nickname)
}

export const useAuthStore = create<AuthState>((set) => ({
  user: readUser(),

  login: (user) => {
    persist(user)
    set({ user })
  },

  switchUser: (user) => {
    persist(user)
    set({ user })
  },

  logout: () => {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k))
    set({ user: null })
  },
}))
