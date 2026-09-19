import { Result, Button } from 'antd'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export default function ErrorState({
  message = 'Failed to load, please try again later',
  onRetry,
}: ErrorStateProps) {
  return (
    <Result
      status="error"
      title="Something went wrong"
      subTitle={message}
      extra={
        onRetry ? (
          <Button type="primary" onClick={onRetry}>
            重试
          </Button>
        ) : null
      }
    />
  )
}