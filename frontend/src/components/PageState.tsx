import type { ReactNode } from 'react'
import EmptyState from './EmptyState'
import ErrorState from './ErrorState'
import Loading from './Loading'
import NoPermission from './NoPermission'

export type PageStatus = 'loading' | 'empty' | 'error' | 'forbidden' | 'ready'

interface PageStateProps {
  status: PageStatus
  children: ReactNode
  loadingTip?: string
  emptyDescription?: string
  errorMessage?: string
  onRetry?: () => void
}

export default function PageState({
  status,
  children,
  loadingTip,
  emptyDescription,
  errorMessage,
  onRetry,
}: PageStateProps) {
  if (status === 'loading') return <Loading tip={loadingTip} />
  if (status === 'empty') return <EmptyState description={emptyDescription} />
  if (status === 'error') return <ErrorState message={errorMessage} onRetry={onRetry} />
  if (status === 'forbidden') return <NoPermission />
  return <>{children}</>
}
