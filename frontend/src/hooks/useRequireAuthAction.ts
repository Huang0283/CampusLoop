import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Protects an interactive action without blocking public browsing pages.
 * The login page receives the exact source location so the action can resume later.
 */
export function useRequireAuthAction() {
  const navigate = useNavigate()
  const location = useLocation()

  return () => {
    if (localStorage.getItem('token')) return true

    navigate('/login', {
      state: {
        from: {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
      },
      replace: true,
    })
    return false
  }
}
