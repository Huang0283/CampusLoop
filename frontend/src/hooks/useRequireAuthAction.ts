import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export interface ReturnLocation {
  pathname: string
  search: string
  hash: string
}

export function toReturnPath(location?: Partial<ReturnLocation>): string | undefined {
  if (!location?.pathname || !location.pathname.startsWith('/')) return undefined
  return `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`
}

/**
 * Guards an action on a public page without making the whole page private.
 * Returns true when the action ran and false when the user was sent to login.
 */
export function useRequireAuthAction() {
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(
    (action: () => void): boolean => {
      if (localStorage.getItem('token')) {
        action()
        return true
      }

      const from: ReturnLocation = {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      }
      navigate('/login', { state: { from } })
      return false
    },
    [location.hash, location.pathname, location.search, navigate],
  )
}
