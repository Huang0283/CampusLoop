import type { ReactNode } from 'react'

interface PageContainerProps {
  title?: string
  extra?: ReactNode
  children: ReactNode
}

export default function PageContainer({
  title,
  extra,
  children,
}: PageContainerProps) {
  return (
    <div style={{ padding: 24 }}>
      {(title || extra) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          {title && <h2 style={{ margin: 0 }}>{title}</h2>}
          {extra}
        </div>
      )}
      {children}
    </div>
  )
}