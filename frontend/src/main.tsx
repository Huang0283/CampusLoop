import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { SessionBootstrap } from './live/SessionBootstrap'
import { AppErrorBoundary } from './live/ErrorBoundary'
import { AppTheme } from './theme/AppTheme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppTheme><AppErrorBoundary><SessionBootstrap /></AppErrorBoundary></AppTheme>
  </StrictMode>
)
