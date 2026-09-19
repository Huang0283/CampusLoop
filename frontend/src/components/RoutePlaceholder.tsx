import PageContainer from './PageContainer'

interface RoutePlaceholderProps {
  name: string
}

export default function RoutePlaceholder({ name }: RoutePlaceholderProps) {
  return (
    <PageContainer title={name}>
      <div>{name} page placeholder</div>
    </PageContainer>
  )
}
