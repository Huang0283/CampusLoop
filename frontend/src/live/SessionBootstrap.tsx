import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '../router'
import { useSession } from './session'

export function SessionBootstrap() {
  const ready = useSession((state) => state.ready)
  const error = useSession((state) => state.bootstrapError)
  useEffect(() => { void useSession.getState().bootstrap() }, [])
  if (!ready) return <div style={{ padding: 32 }}>
    {error ? <><p>暂时无法恢复登录，请检查网络后重试。</p><button onClick={() => void useSession.getState().bootstrap()}>重试恢复</button></> : <p>正在安全恢复登录…</p>}
  </div>
  return <RouterProvider router={router} />
}
