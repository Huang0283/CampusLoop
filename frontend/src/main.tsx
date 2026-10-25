import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/variables.css'
import './styles/global.css'
import { SessionBootstrap } from './live/SessionBootstrap'
import { AppErrorBoundary } from './live/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary><SessionBootstrap /></AppErrorBoundary>
  </StrictMode>
)
