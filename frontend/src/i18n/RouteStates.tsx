import { Link } from 'react-router-dom'
import { Result } from 'antd'
import { localize } from './Localize'
import { useLanguage } from './language'

export function LoadingPage() {
  useLanguage()
  return localize(<div role="status" style={{ padding: 24 }}>正在加载页面…</div>)
}

export function MissingPage() {
  useLanguage()
  return localize(<Result status="404" title="页面不存在" extra={<Link to="/market">返回首页</Link>} />)
}
