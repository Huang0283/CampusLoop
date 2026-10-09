import assert from 'node:assert/strict'
import { createServer } from 'vite'

// Test the actual TypeScript stores through Vite, not a duplicate state machine.
const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
}
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
let realtime
try {
  const { useMockDbStore: db } = await server.ssrLoadModule('/src/stores/mockDb.ts')
  const { useAuthStore: auth } = await server.ssrLoadModule('/src/stores/auth.ts')
  realtime = (await server.ssrLoadModule('/src/stores/realtime.ts')).useRealtimeStore
  const actor = (id, role = 'student') => auth.getState().login({ id, role, nickname: `User ${id}` })
  const run = (name, check) => {
    db.getState().resetDemo()
    actor(1)
    check()
    console.log(`PASS ${name}`)
  }
  const product = () => db.getState().products[102]
  const offer = () => db.getState().offers.find((item) => item.id === 9003)
  const order = () => db.getState().orders.find((item) => item.id === offer().orderId)
  const meetup = { campusLocation: 'Library', scheduledDate: '2026-10-10', timeSlotStart: '14:00', timeSlotEnd: '16:00' }

  run('guest, admin and nonparticipant cannot accept or create offers', () => {
    for (const [id, role] of [[2, 'student'], [1, 'admin']]) {
      actor(id, role)
      assert.equal(db.getState().acceptOffer(9003), false)
      assert.equal(db.getState().createOffer(5002, 3, product(), 500), null)
    }
    auth.getState().logout()
    assert.equal(db.getState().acceptOffer(9003), false)
  })
  run('seller-initiated quote preserves buyer/seller, validates amount and session', () => {
    for (const amount of [0, -1, NaN, Infinity]) {
      assert.equal(db.getState().createOffer(5002, 3, product(), amount), null)
    }
    assert.equal(db.getState().createOffer(5001, 3, product(), 510), null)
    const created = db.getState().createOffer(5002, 3, product(), 510)
    assert.equal(created.buyerId, 3)
    assert.equal(created.sellerId, 1)
    assert.equal(created.proposerId, 1)
    assert.equal(db.getState().acceptOffer(created.id), false)
    actor(3)
    assert.equal(db.getState().acceptOffer(created.id), true)
    assert.equal(db.getState().products[102].status, 'RESERVED')
  })
  run('counteroffer reverses proposer permissions and cannot be self-accepted', () => {
    assert.equal(db.getState().counterOffer(9003, 0), false)
    assert.equal(db.getState().counterOffer(9003, 520), true)
    const counter = db.getState().offers.at(-1)
    assert.equal(counter.proposerId, 1)
    assert.equal(db.getState().acceptOffer(counter.id), false)
    actor(3)
    assert.equal(db.getState().acceptOffer(counter.id), true)
    assert.equal(db.getState().offers.find((item) => item.id === 9003).status, 'COUNTERED')
  })
  run('expiry and duplicate orders block acceptance without changing state', () => {
    db.setState({ offers: db.getState().offers.map((item) => item.id === 9003 ? { ...item, expireAt: '2000-01-01T00:00:00Z' } : item) })
    assert.equal(db.getState().acceptOffer(9003), false)
    db.getState().resetDemo()
    assert.equal(db.getState().acceptOffer(9003), true)
    assert.equal(db.getState().acceptOffer(9003), false)
    assert.equal(db.getState().createOffer(5002, 3, product(), 600), null)
    assert.equal(db.getState().orders.filter((item) => item.productId === 102).length, 1)
  })
  run('meetup version resets confirmations; completion requires two parties', () => {
    assert.equal(db.getState().acceptOffer(9003), true)
    const id = order().id
    db.getState().confirmComplete(id)
    assert.equal(order().buyerConfirmedComplete, false)
    assert.equal(db.getState().saveMeetup(id, { ...meetup, timeSlotEnd: '13:00' }), false)
    assert.equal(db.getState().saveMeetup(id, { ...meetup, scheduledDate: '2026-02-31' }), false)
    assert.equal(db.getState().saveMeetup(id, meetup), true)
    db.getState().confirmMeetup(id)
    actor(3)
    db.getState().confirmMeetup(id)
    assert.equal(order().status, 'MEETUP_ARRANGED')
    db.getState().confirmComplete(id)
    assert.equal(order().status, 'MEETUP_ARRANGED')
    actor(1)
    assert.equal(db.getState().saveMeetup(id, meetup), true)
    assert.equal(order().meetup.version, 2)
    assert.equal(order().buyerConfirmedComplete, false)
    assert.equal(order().meetup.buyerConfirmed, false)
    assert.equal(order().meetup.sellerConfirmed, false)
    db.getState().confirmMeetup(id)
    actor(3)
    db.getState().confirmMeetup(id)
    db.getState().confirmComplete(id)
    actor(1)
    db.getState().confirmComplete(id)
    assert.equal(order().status, 'COMPLETED')
    assert.equal(db.getState().products[102].status, 'SOLD')
    assert.equal(db.getState().saveMeetup(id, meetup), false)
  })
  run('reviews require completion, correct actors, valid stars and uniqueness', () => {
    const review = { orderId: 8001, reviewerId: 1, revieweeId: 2, overall: 5, descriptionAccuracy: 5, communication: 5, punctuality: 5 }
    assert.equal(db.getState().submitReview(review), false)
    db.setState({ orders: db.getState().orders.map((item) => item.id === 8001 ? { ...item, status: 'COMPLETED' } : item) })
    assert.equal(db.getState().submitReview({ ...review, overall: 0 }), false)
    assert.equal(db.getState().submitReview({ ...review, revieweeId: 3 }), false)
    assert.equal(db.getState().submitReview(review), true)
    assert.equal(db.getState().submitReview(review), false)
    assert.equal(db.getState().reviews.length, 1)
  })
  run('nonparticipants cannot cancel, confirm or edit another order', () => {
    actor(3)
    const original = structuredClone(db.getState().orders.find((item) => item.id === 8001))
    db.getState().cancelOrder(8001)
    db.getState().confirmMeetup(8001)
    db.getState().confirmComplete(8001)
    assert.equal(db.getState().saveMeetup(8001, meetup), false)
    assert.deepEqual(db.getState().orders.find((item) => item.id === 8001), original)
  })
  run('notification reads are scoped to the signed-in recipient', () => {
    const others = structuredClone(db.getState().notifications.filter((item) => item.recipientId !== 1))
    db.getState().markAllNotificationsRead()
    assert.deepEqual(db.getState().notifications.filter((item) => item.recipientId !== 1), others)
    assert.ok(db.getState().notifications.filter((item) => item.recipientId === 1).every((item) => item.read))
  })
  console.log('8 transaction prototype scenarios passed (Mock only).')
} finally {
  realtime?.getState().shutdown()
  await server.close()
}
