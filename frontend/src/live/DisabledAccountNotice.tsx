import { Alert, Button, Modal, Space } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { localize } from '../i18n/Localize'
import { useLanguage } from '../i18n/language'
import { data, listAccountDecisions, logout } from '../sdk'
import type { AccountDecisionRecord } from '../sdk'
import { CatalogText } from '../i18n/CatalogText'
import { displayDate } from './display'
import { useSession } from './session'

export function DisabledAccountNotice() {
  useLanguage()
  const navigate = useNavigate()
  const open = useSession(state => state.disabledNotice)
  const token = useSession(state => state.appealToken)
  const [decision, setDecision] = useState<AccountDecisionRecord>()
  useEffect(() => {
    if (!open || !token) return
    const controller = new AbortController()
    void data(listAccountDecisions({ signal: controller.signal, headers: { Authorization: `Bearer ${token}` }, query: { pageSize: 1 } })).then(result => {
      if (!controller.signal.aborted) setDecision(result.items[0])
    }).catch(() => undefined)
    return () => controller.abort()
  }, [open, token])
  return localize(<Modal title="账号已被禁用" open={open} closable={false} maskClosable={false} keyboard={false} centered footer={null} width={540}>
    <Alert type="warning" showIcon title="当前账号暂时无法使用交易功能。" description="你可以查看处理时间、原因和证据，并提交申诉；申诉不会恢复交易权限。" />
    {decision?.action === 'DISABLE' && <><p>禁用时间：{displayDate(decision.createdAt)}</p><p style={{ overflowWrap: 'anywhere' }}>禁用原因：<CatalogText text={decision.reason} /></p></>}
    <Space wrap style={{ marginTop: 24 }}>
      <Button onClick={() => {
        useSession.getState().clear()
        navigate('/login', { replace: true })
        void logout().catch(() => undefined)
      }}>返回登录</Button>
      <Button type="primary" aria-label="申诉" onClick={() => { useSession.getState().dismissDisabledNotice(); navigate('/account/decisions', { replace: true }) }}>申诉</Button>
    </Space>
  </Modal>)
}
