import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/variables.css'
import './styles/global.css'
import { SessionBootstrap } from './live/SessionBootstrap'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionBootstrap />
  </StrictMode>
)
