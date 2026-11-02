// Contract-shaped `GET /admin/dashboard` payload for fixture tests. Values are illustrative only.
const days = Array.from({ length: 7 }, (_, i) => `2030-01-0${i + 1}`)

export const adminDashboardFixture = {
  asOf: '2030-01-07T10:00:00Z',
  timezone: '+08:00',
  days: 7,
  rangeStart: days[0],
  products: { newToday: 12, newYesterday: 9, newInRange: 61, newPreviousRange: 48, onSale: 240, moderationHeld: 2 },
  orders: { newToday: 4, newYesterday: 5, newInRange: 23, newPreviousRange: 19, completedInRange: 11 },
  users: { total: 108, disabled: 3, newInRange: 9, newPreviousRange: 7 },
  pending: { openReports: 1, disputedOrders: 0, total: 1 },
  trend: days.map((date, i) => ({ date, newProducts: [6, 9, 7, 11, 8, 9, 12][i], newOrders: [2, 3, 4, 3, 2, 5, 4][i], completedOrders: [1, 1, 2, 2, 1, 2, 2][i] })),
  categories: [{ key: 'DIGITAL', count: 80 }, { key: 'BOOKS', count: 60 }, { key: 'DAILY', count: 50 }, { key: 'clothing', count: 30 }, { key: 'SPORTS', count: 12 }, { key: 'other', count: 8 }],
  orderStatuses: [{ key: 'COMPLETED', count: 11 }, { key: 'BOOKED', count: 6 }, { key: 'CANCELLED', count: 5 }, { key: 'DISPUTED', count: 1 }],
  reportReasons: [{ key: 'SPAM', count: 3 }, { key: 'FAKE_PRODUCT', count: 2 }],
  postingHeatmap: { days: 28, cells: Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => (h > 8 && h < 23 ? (d + h) % 5 : 0))) },
  health: {
    reportsHandled: { numerator: 4, denominator: 5 },
    reportsHandledWithin24h: { numerator: 3, denominator: 4 },
    ordersCompleted: { numerator: 11, denominator: 17 },
  },
  todo: [{ kind: 'REPORT', id: 9001, status: 'PENDING', reason: 'FAKE_PRODUCT', targetType: 'PRODUCT', targetId: 601, targetTitle: 'Fixture product', submittedBy: 'Fixture reporter', createdAt: '2030-01-07T08:00:00Z' }],
  recentOrders: [{ id: 1001, status: 'BOOKED', amount: 45, createdAt: '2030-01-07T09:00:00Z', productTitle: 'Fixture product', category: 'DIGITAL', buyerNickname: 'Buyer', sellerNickname: 'Seller' }],
  riskUsers: [{ id: 502, nickname: 'Seller fixture', avatar: null, status: 'ACTIVE', reportCount: 2, openReportCount: 1, lastReportedAt: '2030-01-07T08:00:00Z' }],
  recentDecisions: [{ id: 1, event: 'admin_product_moderate', decision: true, actor: { id: 501, nickname: 'Fixture admin' }, targetUser: null, subject: { type: 'PRODUCT', id: 601 }, reason: 'Fixture review', resultStatus: 'HIDDEN', createdAt: '2030-01-06T08:00:00Z' }],
}
