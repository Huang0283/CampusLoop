import type { ReactNode } from 'react'
import { App as AntApp, Button, ConfigProvider, Tooltip, theme as antTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import '@fontsource/unbounded/500.css'
import '@fontsource/unbounded/600.css'
import '@fontsource/unbounded/700.css'
import './aurora.css'
import { SpriteDefs } from './brand'
import { useTheme, type ThemeMode } from './themeStore'

const shared = {
  fontFamily: '"PingFang SC", "Microsoft YaHei", system-ui, -apple-system, "Segoe UI", sans-serif',
  borderRadius: 12, borderRadiusLG: 18, controlHeight: 40, colorBgLayout: 'transparent',
}
// antd needs concrete colours; these mirror the CSS tokens in aurora.css.
const tokens = {
  light: { ...shared, colorPrimary: '#5B6BFF', colorLink: '#4351E8', colorSuccess: '#0E9F6E', colorError: '#E5484D', colorWarning: '#E8930C', colorText: '#0B0F1C', colorTextSecondary: '#4A5068', colorBorder: '#0B0F1C1F', colorBorderSecondary: '#0B0F1C12', colorBgContainer: '#FFFFFF', colorBgElevated: '#FFFFFF', colorFillTertiary: '#0B0F1C0A' },
  dark: { ...shared, colorPrimary: '#7C8BFF', colorLink: '#AEB7FF', colorSuccess: '#4ADEAA', colorError: '#FF7A7F', colorWarning: '#F5A524', colorText: '#F2F3F7', colorTextSecondary: '#C4C7D2', colorBorder: '#FFFFFF26', colorBorderSecondary: '#FFFFFF1C', colorBgContainer: '#30343F', colorBgElevated: '#383C48', colorFillTertiary: '#FFFFFF12' },
}

export function AppTheme({ children }: { children: ReactNode }) {
  const resolved = useTheme((state) => state.theme)
  return <ConfigProvider locale={zhCN} theme={{ algorithm: resolved === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm, token: tokens[resolved], components: { Button: { primaryShadow: 'none', fontWeight: 600 }, Card: { borderRadiusLG: 22 }, Menu: { itemBg: 'transparent', horizontalItemSelectedColor: tokens[resolved].colorText } } }}>
    <AntApp component={false}><SpriteDefs />{children}</AntApp>
  </ConfigProvider>
}

const names: Record<ThemeMode, string> = { light: '浅色', dark: '深色', system: '跟随系统' }
const icons: Record<ThemeMode, ReactNode> = {
  light: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  dark: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  system: <><rect x="3" y="4.5" width="18" height="12.5" rx="2" /><path d="M8.5 20.5h7M12 17v3.5" /></>,
}

/** Cycles 浅色 → 深色 → 跟随系统; the tooltip names the current mode. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const mode = useTheme((state) => state.mode)
  return <Tooltip title={names[mode]}>
    <Button type="text" className={`cl-icon-btn ${className}`} aria-label={`外观：${names[mode]}`} onClick={() => useTheme.getState().cycle()}
      icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[mode]}</svg>} />
  </Tooltip>
}
