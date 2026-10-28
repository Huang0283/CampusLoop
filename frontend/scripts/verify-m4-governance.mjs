/**
 * M4 治理与交易前端回归（FE4-07/FE4-08 回归项 + FE2-08~10 收尾验收）
 *
 * 覆盖可在无后端环境复跑的判定：
 * 1. 见面时间按北京时间校验：昨天、今天已过、结束早于开始均不可保存。
 * 2. 举报原因按目标与订单身份过滤。
 * 3. 举报证据上限与 OpenAPI 契约一致（5 张）。
 * 4. M4 页面路由守卫与公开页面举报动作守卫。
 *
 * 浏览器双账号 E2E 仍由 `npm run test:live` 在后端可用时执行，本脚本不冒充其结论。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { campusToday, validateMeetupEnd, validateMeetupStart } from '../src/live/meetupTime.ts'
import { reportReasons } from '../src/live/reportReasons.ts'
import { uniqueNotifications } from '../src/live/notifications.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const results = []

function check(name, fn) {
  fn()
  results.push(name)
}

function throws(fn, label) {
  assert.throws(fn, (error) => error instanceof Error && error.message.includes(label))
}

function beijingNowMinus(minutes) {
  const shifted = new Date(Date.now() + 8 * 60 * 60 * 1000 - minutes * 60 * 1000)
  const day = shifted.toISOString().slice(0, 10)
  const time = shifted.toISOString().slice(11, 16)
  return { day, time }
}

check('约见：昨天的时间不能保存', () => {
  const yesterday = new Date(Date.now() + 8 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  throws(() => validateMeetupStart(yesterday, '12:00'), '北京时间')
})

check('约见：今天已过去的开始时间不能保存', () => {
  const past = beijingNowMinus(90)
  throws(() => validateMeetupStart(past.day, past.time), '北京时间')
})

check('约见：未来时间可以保存', () => {
  const future = new Date(Date.now() + 8 * 60 * 60 * 1000 + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  validateMeetupStart(future, '09:00')
})

check('约见：非法日期不能保存', () => {
  throws(() => validateMeetupStart('not-a-date', '09:00'), '北京时间')
})

check('约见：结束时间不晚于开始时间不能保存', () => {
  throws(() => validateMeetupEnd('13:00', '12:00'), '结束时间')
  throws(() => validateMeetupEnd('12:00', '12:00'), '结束时间')
  validateMeetupEnd('12:00', '13:00')
  validateMeetupEnd(undefined, '13:00')
})

check('约见：空值交给表单必填校验', () => {
  validateMeetupStart(undefined, undefined)
  validateMeetupStart('', '')
})

check('约见：当天日期按北京时间计算', () => {
  assert.match(campusToday(), /^\d{4}-\d{2}-\d{2}$/)
  const expected = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
  assert.equal(campusToday(), expected)
})

check('举报：商品举报保留商品类原因', () => {
  const values = reportReasons('PRODUCT').map((item) => item.value)
  for (const reason of ['FAKE_PRODUCT', 'DESCRIPTION_MISMATCH', 'ABNORMAL_PRICE']) assert.ok(values.includes(reason))
})

check('举报：买家举报订单可选商品虚假与描述不符', () => {
  const values = reportReasons('ORDER', 'buyer').map((item) => item.value)
  assert.ok(values.includes('FAKE_PRODUCT'))
  assert.ok(values.includes('DESCRIPTION_MISMATCH'))
  assert.ok(values.includes('VIOLATION'))
})

check('举报：卖家举报买家不出现商品类原因', () => {
  const values = reportReasons('ORDER', 'seller').map((item) => item.value)
  assert.deepEqual(values, ['SPAM', 'HARASSMENT', 'VIOLATION'])
})

check('举报：卖家交易违规使用行为类文案', () => {
  const seller = reportReasons('ORDER', 'seller').find((item) => item.value === 'VIOLATION')
  assert.match(seller.label, /恶意下单|爽约/)
})

check('举报：用户与聊天消息使用行为类原因', () => {
  for (const target of ['USER', 'CHAT_MESSAGE']) {
    const values = reportReasons(target).map((item) => item.value)
    assert.deepEqual(values, ['SPAM', 'HARASSMENT', 'VIOLATION'])
  }
})

check('契约：原型、真实上传与 OpenAPI 证据上限均为 5', () => {
  const modal = read('src/components/transaction/ReportModal.tsx')
  assert.match(modal, /const MAX_EVIDENCE = 5\b/)
  assert.match(modal, /maxCount=\{MAX_EVIDENCE\}/)
  assert.match(read('src/live/ImageQueue.tsx'), /maxCount=\{5\}/)
  const openapi = read('../openapi/campusloop.v1.yaml')
  assert.match(openapi, /evidence: \{ type: array, maxItems: 5,/)
})

check('守卫：M4 私有路由均由 Guard 包裹', () => {
  const router = read('src/router/index.tsx')
  for (const path of ['/chat', '/chat/:id', '/transactions', '/transactions/:id', '/transactions/:id/meetup', '/transactions/:id/review', '/notifications', '/report']) {
    const line = router.split('\n').find((item) => item.includes(`path: '${path}'`))
    assert.ok(line, `缺少路由 ${path}`)
    assert.match(line, /<Guard>/, `路由 ${path} 未使用 Guard`)
  }
})

check('守卫：公开商品/求购页的举报动作走统一登录动作守卫', () => {
  assert.match(read('src/pages/market/ProductDetailPage.tsx'), /requireAuthAction\(\(\) => setReportTarget/)
  assert.match(read('src/pages/wanted/WantedDetailPage.tsx'), /requireAuthAction\(\(\) => setReportOpen\(true\)\)/)
  assert.match(read('src/hooks/useRequireAuthAction.ts'), /toReturnPath|returnTo/)
})

check('通知：重复任务通知按通知 ID 去重，保留首次顺序', () => {
  const items = [
    { id: 11, type: 'MATCH_FOUND', title: 'match', content: '', read: false, createdAt: '2026-01-01T00:00:00Z' },
    { id: 11, type: 'MATCH_FOUND', title: 'retry', content: '', read: false, createdAt: '2026-01-01T00:00:01Z' },
    { id: 12, type: 'REPORT_RESULT', title: 'report', content: '', read: true, createdAt: '2026-01-01T00:00:02Z' },
  ]
  assert.deepEqual(uniqueNotifications(items).map((item) => item.id), [11, 12])
  assert.equal(uniqueNotifications(items)[0].title, 'match')
})

check('举报：处理说明与结果通知对举报人可见', () => {
  const governance = read('../backend/app/api/routes/governance.py')
  const transactions = read('../backend/app/api/routes/transactions.py')
  assert.match(governance, /entity\.resolution_note = body\.note/)
  assert.match(governance, /"REPORT_RESULT"/)
  assert.match(transactions, /"handledAt": dto\.iso\(entity\.handled_at\)/)
  assert.match(transactions, /"resolutionNote": entity\.resolution_note/)
  assert.match(transactions, /SELF_REPORT_FORBIDDEN/)
  assert.match(transactions, /\.offset\(\(page - 1\) \* pageSize\)/)
})

check('举报：客户端展示处理说明、分页并禁止举报自己', () => {
  const page = read('src/live/ReportsPage.tsx')
  assert.match(page, /item\.handledAt/)
  assert.match(page, /item\.resolutionNote/)
  assert.match(page, /pageSize: PAGE_SIZE/)
  const market = read('src/live/MarketPages.tsx')
  assert.match(market, /user\.id !== item\.seller\.id/)
  assert.match(market, /label="举报发布者"/)
})

check('通知：已读操作通知外壳刷新未读数，缓存按账号隔离', () => {
  const page = read('src/live/TransactionPages.tsx')
  const shell = read('src/live/common.tsx')
  assert.match(page, /useNotificationsResource\(\)/)
  assert.match(page, /notifyNotificationsChanged\(\)/)
  assert.match(shell, /`shell-notifications-\$\{user\?\.id\}`/)
  assert.match(shell, /NOTIFICATIONS_CHANGED_EVENT/)
})

console.log(`M4 governance checks passed: ${results.length}`)
for (const name of results) console.log(`- PASS ${name}`)
