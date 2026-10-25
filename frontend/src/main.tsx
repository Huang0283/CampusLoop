import { StrictMode } from 'react'
import { ConfigProvider } from 'antd'
import { createRoot } from 'react-dom/client'
import './styles/variables.css'
import './styles/global.css'
import { SessionBootstrap } from './live/SessionBootstrap'
import { AppErrorBoundary } from './live/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={{
      token: {
        colorPrimary: '#2458cf',
        colorPrimaryHover: '#1d46a6',
        colorPrimaryActive: '#173b8f',
        colorLink: '#2458cf',
        colorLinkHover: '#1d46a6',
        colorLinkActive: '#173b8f',
        colorTextSecondary: '#59636f',
        colorTextTertiary: '#59636f',
        colorTextDescription: '#59636f',
        colorTextPlaceholder: '#59636f',
      },
    }}>
      <AppErrorBoundary><SessionBootstrap /></AppErrorBoundary>
    </ConfigProvider>
  </StrictMode>
)
