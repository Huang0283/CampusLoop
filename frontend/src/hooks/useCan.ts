import { useMemo } from 'react'
import {
  evaluateMeetupConfirm,
  evaluateOrderAction,
  hasGlobalPermission,
  resolveOfferRole,
  resolveOrderRole,
  type GlobalPermission,
  type OrderActionKey,
} from '../access/permissions'
import { useAuthStore } from '../stores/auth'
import type { Order } from '../types/transaction'

export function useCan() {
  const user = useAuthStore((state) => state.user)

  return useMemo(
    () => ({
      order: (order: Order, action: OrderActionKey) =>
        evaluateOrderAction(user, order, action),
      meetupConfirm: (order: Order) => evaluateMeetupConfirm(user, order),
      has: (permission: GlobalPermission) => hasGlobalPermission(user, permission),
      orderRole: (order: Order) => resolveOrderRole(user?.id, order),
      offerRole: (offer: Parameters<typeof resolveOfferRole>[1]) =>
        resolveOfferRole(user?.id, offer),
    }),
    [user],
  )
}
