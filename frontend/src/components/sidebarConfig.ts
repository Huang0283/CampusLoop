export const BRAND_COLOR = '#1677ff'
export const SIDEBAR_WIDTH = 220

export function resolveActiveKey(pathname: string): string[] {
  if (pathname.startsWith('/chat')) return ['chat']
  if (pathname.startsWith('/wanted')) return ['wanted']
  if (
    pathname.startsWith('/transactions') ||
    pathname.startsWith('/profile/transactions') ||
    pathname.includes('/review') ||
    pathname.includes('/meetup')
  ) {
    return ['transaction']
  }
  if (pathname === '/' || pathname.startsWith('/market') || pathname.startsWith('/product')) {
    return ['market']
  }
  return []
}
