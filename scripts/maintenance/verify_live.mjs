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
const result = spawnSync(win ? 'cmd.exe' : 'npm',
  win ? ['/d', '/s', '/c', 'npm', 'run', 'test:live'] : ['run', 'test:live'],
  { cwd: path.join(repo, 'frontend'), encoding: 'utf8', timeout: 600000, env: process.env })
const log = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? String(result.error) : ''}`
writeFileSync(path.join(output, 'browser-tests.txt'), log)
const passed = Number(log.match(/(\d+) passed/)?.[1] ?? 0)
const incomplete = /\d+ (?:failed|skipped|flaky|did not run)/.test(log)
const record = {
  sourceCommit: commit, testedAtUtc: new Date().toISOString(),
  environment: { node: process.version, platform: process.platform, uiUrl: process.env.CAMPUSLOOP_UI_URL },
  command: ['npm', 'run', 'test:live'], exitCode: result.status, passed,
  status: result.status === 0 && passed === 5 && !incomplete ? 'PASS' : 'FAIL',
  log: 'browser-tests.txt',
  sha256: createHash('sha256').update(readFileSync(path.join(output, 'browser-tests.txt'))).digest('hex'),
}
writeFileSync(path.join(output, 'run-record.json'), JSON.stringify(record, null, 2) + '\n')
console.log(`Real browser journeys: ${record.status} (${passed}/5 passed)`)
process.exitCode = record.status === 'PASS' ? 0 : 1
