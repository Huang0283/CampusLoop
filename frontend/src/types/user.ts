/**
 * 全局用户与角色类型
 *
 * ⚠ 与 M2（登录）/ M5（鉴权）共同维护。
 * 原型阶段角色只有 student / admin 两种，订单内的买卖方视角
 * 不属于全局角色，由 access/permissions.ts 按订单参与关系推导。
 */

export type UserRole = 'student' | 'admin'

export interface CurrentUser {
  id: number
  nickname: string
  role: UserRole
  avatar?: string
}
