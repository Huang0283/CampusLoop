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
  // 市场域（含商品详情、发布商品、我的发布、我的收藏）高亮「首页」：
  // 市场项已移除，其跳转与高亮职责整体移交给首页
  if (
    pathname === '/' ||
    pathname.startsWith('/market') ||
    pathname.startsWith('/product') ||
    pathname.startsWith('/publish') ||
    pathname.startsWith('/my-products') ||
    pathname.startsWith('/favorites')
  ) {
    return ['home']
  }
  return []
}
