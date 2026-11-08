import { create } from 'zustand'
import type { AuthResult, BrowserAuthResult, UserProfile } from '../sdk/generated/types.gen'
import { ApiError, clearTokens, restoreIdentity, setTokens } from '../sdk'

interface SessionState {
  user: UserProfile | null
  ready: boolean
  bootstrapError: unknown
  appealToken: string | null
  disabledNotice: boolean
  dismissDisabledNotice: () => void
  bootstrap: () => Promise<void>
  accept: (result: AuthResult | BrowserAuthResult) => void
  update: (user: UserProfile) => void
  clear: () => void
}

let bootstrapFlight: Promise<void> | null = null
export const useSession = create<SessionState>((set, get) => ({
  user: null,
  ready: false,
  bootstrapError: null,
  appealToken: null,
  disabledNotice: false,
  dismissDisabledNotice: () => set({ disabledNotice: false }),
  bootstrap: () => {
    if (get().ready) return Promise.resolve()
    if (bootstrapFlight) return bootstrapFlight
    set({ bootstrapError: null })
    bootstrapFlight = (async () => {
      try { get().accept(await restoreIdentity()); set({ ready: true }) }
      catch (error) {
        if (error instanceof ApiError && [401, 423].includes(error.status)) set({ user: null, ready: true })
        else set({ bootstrapError: error })
      } finally { bootstrapFlight = null }
    })()
    return bootstrapFlight
  },
  accept: (result) => { setTokens(result); set({ user: result.user, appealToken: null, disabledNotice: false }) },
  update: (user) => set({ user }),
  clear: () => { clearTokens(); set({ user: null, appealToken: null, disabledNotice: false }) },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('campusloop-account-disabled', (event) => {
    const details = (event as CustomEvent<{ appealToken: string }>).detail
    useSession.setState({ user: null, appealToken: details.appealToken, disabledNotice: true })
  })
  window.addEventListener('campusloop-session-expired', () => useSession.getState().clear())
  for (const key of ['token', 'role', 'userId', 'nickname', 'avatar', 'campusVerified', 'school', 'college', 'major', 'bio']) {
    localStorage.removeItem(key)
  }
}
