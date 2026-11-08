import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'campusloop-theme-mode'
const darkQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : undefined

function readMode(): ThemeMode {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
}
const resolve = (mode: ThemeMode): ResolvedTheme => mode === 'system' ? (darkQuery?.matches ? 'dark' : 'light') : mode

function paint(theme: ResolvedTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

interface ThemeState { mode: ThemeMode; theme: ResolvedTheme; setMode: (mode: ThemeMode) => void; cycle: () => void }

const initialMode = readMode()
paint(resolve(initialMode))

export const useTheme = create<ThemeState>((set, get) => ({
  mode: initialMode,
  theme: resolve(initialMode),
  setMode: (mode) => {
    localStorage.setItem(STORAGE_KEY, mode)
    const theme = resolve(mode)
    const apply = () => { paint(theme); set({ mode, theme }) }
    // View transitions give the cross-fade from the prototype; fall back silently.
    const doc = document as Document & { startViewTransition?: (callback: () => void) => unknown }
    if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(apply)
    else apply()
  },
  cycle: () => {
    const order: ThemeMode[] = ['light', 'dark', 'system']
    get().setMode(order[(order.indexOf(get().mode) + 1) % order.length])
  },
}))

darkQuery?.addEventListener('change', () => {
  const { mode } = useTheme.getState()
  if (mode !== 'system') return
  const theme = resolve(mode)
  paint(theme)
  useTheme.setState({ theme })
})
