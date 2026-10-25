// Capture real browser acceptance; the URL must point to an already running isolated stack.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const [repo, output, commit] = process.argv.slice(2)
if (!repo || !output || !commit || !process.env.CAMPUSLOOP_UI_URL) {
  throw new Error('Usage: CAMPUSLOOP_UI_URL=... node verify_live.mjs REPO OUTPUT SOURCE_COMMIT')
}
mkdirSync(output, { recursive: false })
const win = process.platform === 'win32'
const sourceStatus = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: repo, encoding: 'utf8' })
if (sourceStatus.status !== 0) throw new Error('Cannot identify source checkout status')
const reportPath = path.join(path.resolve(output), 'playwright-results.json')
const result = spawnSync(win ? 'cmd.exe' : 'npm',
  win ? ['/d', '/s', '/c', 'npm', 'run', 'test:live', '--', '--reporter=list,json'] : ['run', 'test:live', '--', '--reporter=list,json'],
  { cwd: path.join(repo, 'frontend'), encoding: 'utf8', timeout: 600000,
    env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath } })
const log = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? String(result.error) : ''}`
writeFileSync(path.join(output, 'browser-tests.txt'), log)
let report
try { report = JSON.parse(readFileSync(reportPath, 'utf8')) } catch { /* A missing/invalid report fails the gate. */ }
const passed = report?.stats?.expected ?? 0
const incomplete = !report || report.stats.unexpected > 0 || report.stats.skipped > 0 || report.stats.flaky > 0 || report.errors.length > 0
const record = {
  sourceCommit: commit, workingTreeDirty: Boolean(sourceStatus.stdout.trim()), testedAtUtc: new Date().toISOString(),
  environment: { node: process.version, platform: process.platform, uiUrl: process.env.CAMPUSLOOP_UI_URL },
  command: ['npm', 'run', 'test:live'], exitCode: result.status, passed,
  status: result.status === 0 && passed > 0 && !incomplete ? 'PASS' : 'FAIL',
  log: 'browser-tests.txt',
  sha256: createHash('sha256').update(readFileSync(path.join(output, 'browser-tests.txt'))).digest('hex'),
}
writeFileSync(path.join(output, 'run-record.json'), JSON.stringify(record, null, 2) + '\n')
console.log(`Browser suite (real journeys and contract/fault fixtures): ${record.status} (${passed} passed)`)
process.exitCode = record.status === 'PASS' ? 0 : 1
