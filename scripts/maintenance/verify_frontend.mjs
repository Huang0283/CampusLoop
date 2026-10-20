// Record front-end checks against an explicitly supplied source checkout.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const [repo, output, commit] = process.argv.slice(2)
if (!repo || !output || !commit) throw new Error('Usage: node verify_frontend.mjs REPO OUTPUT SOURCE_COMMIT')
mkdirSync(output, { recursive: false })
const frontend = path.join(repo, 'frontend')
const results = []
const commands = [
  ['transaction-prototype', 'npm', ['run', 'test:transaction']],
  ['frontend-lint', 'npm', ['run', 'lint']],
  ['frontend-build', 'npm', ['run', 'build']],
  ['sdk-check', 'npm', ['run', 'sdk:check']],
  ['sdk-drift', 'git', ['diff', '--exit-code', '--', 'src/sdk/generated/']],
]
for (const [name, command, args] of commands) {
  const win = process.platform === 'win32' && command === 'npm'
  // Arguments are fixed above; no user text is executed through the shell.
  const result = spawnSync(win ? 'cmd.exe' : command, win ? ['/d', '/s', '/c', 'npm', ...args] : args,
    { cwd: frontend, encoding: 'utf8', timeout: 180000, env: process.env })
  const log = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? String(result.error) : ''}`
  const filename = `${name}.txt`
  writeFileSync(path.join(output, filename), log)
  results.push({ name, command: [command, ...args], exitCode: result.status,
    status: result.status === 0 ? 'PASS' : 'FAIL', log: filename,
    sha256: createHash('sha256').update(readFileSync(path.join(output, filename))).digest('hex') })
  console.log(`${name}: ${results.at(-1).status}`)
}
const record = { sourceCommit: commit, testedAtUtc: new Date().toISOString(), environment: { node: process.version, platform: process.platform },
  checks: results, status: results.every(result => result.status === 'PASS') ? 'PASS' : 'FAIL' }
writeFileSync(path.join(output, 'run-record.json'), JSON.stringify(record, null, 2) + '\n')
process.exitCode = record.status === 'PASS' ? 0 : 1
