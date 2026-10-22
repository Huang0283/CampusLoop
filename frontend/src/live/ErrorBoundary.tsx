import { Component } from 'react'
import type { ReactNode } from 'react'
import { Button, Result } from 'antd'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <main><Result status="error" title="页面暂时无法显示"
      subTitle="请刷新重试。若刚刚提交了操作，请先查看记录，确认结果后再操作。"
      extra={<Button onClick={() => window.location.reload()}>刷新页面</Button>} /></main>
    return this.props.children
  }
}

export function RouteFailure() {
  const error = useRouteError()
  const status = isRouteErrorResponse(error) && (error.status === 403 || error.status === 404) ? error.status : 'error'
  return <Result status={status} title={status === 403 ? '无权访问' : status === 404 ? '页面不存在' : '页面暂时无法显示'}
    subTitle="可返回首页；若刚刚提交了操作，请先确认记录。"
    extra={<Link to="/market">返回首页</Link>} />
}
