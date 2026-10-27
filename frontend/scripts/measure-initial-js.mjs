import process from 'node:process'
import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { preview } from 'vite'
import { chromium } from '@playwright/test'

const beforeDirectory = process.argv[2]
if (!beforeDirectory) {
  throw new Error('Usage: node scripts/measure-initial-js.mjs <before-build-directory>')
}

const root = resolve(import.meta.dirname, '..')
const apiOrigin = new URL(process.env.VITE_API_BASE_URL || 'http://localhost:8001').origin
const builds = [
  { label: 'before', directory: resolve(beforeDirectory), port: 5175 },
  { label: 'after', directory: resolve(root, 'dist'), port: 5176 },
]

for (const build of builds) {
  await access(resolve(build.directory, 'index.html'))
}

const browser = await chromium.launch()
const servers = []
const results = []

try {
  for (const build of builds) {
    const server = await preview({
      root,
      configFile: false,
      build: { outDir: build.directory },
      preview: { host: '127.0.0.1', port: build.port, strictPort: true },
    })
    servers.push(server)

    for (const path of ['/market', '/login']) {
      const context = await browser.newContext()
      const errors = []

      try {
        await context.route(url => url.origin === apiOrigin, route => {
          const request = route.request()
          const pathname = new URL(request.url()).pathname

          if (request.method() === 'OPTIONS') {
            return route.fulfill({ status: 204 })
          }
          if (pathname === '/auth/browser-session' && request.method() === 'POST') {
            return route.fulfill({
              status: 401,
              json: { code: 'AUTH_UNAUTHORIZED', message: 'Guest fixture' },
            })
          }
          if (pathname === '/products' && request.method() === 'GET') {
            return route.fulfill({
              json: {
                data: {
                  items: [],
                  pagination: { page: 1, pageSize: 12, total: 0 },
                },
              },
            })
          }

          errors.push(`Unexpected API request: ${request.method()} ${pathname}`)
          return route.abort()
        })

        const page = await context.newPage()
        page.on('pageerror', error => errors.push(error.message))
        await page.goto(`http://127.0.0.1:${build.port}${path}`)

        if (path === '/market') {
          await page.getByRole('heading', { name: '校园市场', exact: true }).waitFor()
        } else {
          await page.getByLabel('校园邮箱', { exact: true }).waitFor()
        }

        const resources = await page.evaluate(() =>
          performance.getEntriesByType('resource')
            .filter(entry => new URL(entry.name).pathname.endsWith('.js'))
            .map(entry => ({
              file: new URL(entry.name).pathname,
              bytes: entry.decodedBodySize,
            })),
        )

        const uniqueFiles = new Map()
        for (const resource of resources) {
          const previous = uniqueFiles.get(resource.file)
          if (!previous || resource.bytes > previous.bytes) {
            uniqueFiles.set(resource.file, resource)
          }
        }

        const files = [...uniqueFiles.values()].sort((a, b) => a.file.localeCompare(b.file))
        if (!files.length || files.some(file => file.bytes <= 0)) {
          throw new Error(`${build.label} ${path}: incomplete JS resource measurements`)
        }
        if (errors.length) {
          throw new Error(errors.join('\n'))
        }

        results.push({
          build: build.label,
          route: path,
          jsFiles: files.length,
          decodedKB: Number((files.reduce((sum, file) => sum + file.bytes, 0) / 1000).toFixed(2)),
          files,
        })
      } finally {
        await context.close()
      }
    }
  }

  console.table(results.map(({ build, route, jsFiles, decodedKB }) => ({
    build, route, jsFiles, decodedKB,
  })))

  for (const result of results) {
    console.log(`\n${result.build} ${result.route}`)
    for (const file of result.files) {
      console.log(`${file.file}: ${file.bytes} bytes`)
    }
  }
} finally {
  await browser.close()
  await Promise.all(servers.map(server =>
    new Promise(resolveClose => server.httpServer.close(() => resolveClose())),
  ))
}
