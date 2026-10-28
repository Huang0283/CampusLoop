import type { Page, Route } from '@playwright/test'

// Match application requests, independent of the API port baked into Vite.
// Handlers reject unexpected endpoints; documents/assets still use the real UI.
export async function routeApiFixture(page: Page, handler: (route: Route) => unknown) {
  await page.route('**/*', route => {
    if (!['fetch', 'xhr'].includes(route.request().resourceType())) return route.continue()
    return handler(route)
  })
}
