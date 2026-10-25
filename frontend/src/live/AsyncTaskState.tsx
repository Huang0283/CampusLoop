import { Alert, Button, Space, Spin } from 'antd'

// Presentation state only. Producers must map a confirmed backend task contract.
export type TaskPhase = 'queued' | 'running' | 'completed' | 'failed' | 'timeout' | 'expired'

const descriptions: Record<TaskPhase, string> = {
  queued: '任务正在排队，请稍后刷新状态。',
  running: '任务正在运行，请稍后刷新状态。',
  completed: '任务已完成。',
  failed: '任务失败，请检查输入后重试。',
  timeout: '等待已超时。请先刷新确认处理结果，再决定是否重试。',
  expired: '结果已过期，请刷新当前事实后重新计算。',
}

export function AsyncTaskState({ phase, retry, refresh, retrying = false }: {
  phase: TaskPhase; retry?: () => void; refresh?: () => void; retrying?: boolean
}) {
  const busy = phase === 'queued' || phase === 'running'
  const recoverable = phase === 'failed' || phase === 'timeout' || phase === 'expired'
  return <div role="status" aria-live="polite" aria-busy={busy || retrying} data-task-phase={phase}>
    <Alert type={phase === 'completed' ? 'success' : recoverable ? 'warning' : 'info'}
      title={descriptions[phase]} icon={busy ? <Spin size="small" /> : undefined} showIcon
      action={<Space wrap>
        {refresh && phase !== 'completed' && <Button onClick={refresh}>刷新状态</Button>}
        {recoverable && retry && <Button loading={retrying} onClick={retry}>重试任务</Button>}
      </Space>} />
  </div>
}
