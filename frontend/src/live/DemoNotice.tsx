import { useLanguage } from '../i18n/language'
import './demo-notice.css'

export function DemoNotice() {
  const language = useLanguage(state => state.language)
  if (import.meta.env.VITE_DEMO_MODE !== 'true') return null
  return <aside className="demo-environment-notice" aria-label={language === 'zh' ? '演示环境说明' : 'Demo environment notice'}>
    {language === 'zh' ? '演示环境：账号、价格、交易和违规记录均为合成数据' : 'Demo environment: accounts, prices, trades and moderation records are synthetic'}
  </aside>
}
