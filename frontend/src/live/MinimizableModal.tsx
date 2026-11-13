import { ExpandOutlined, MinusOutlined } from '@ant-design/icons'
import { Button, Modal } from 'antd'
import type { ModalProps } from 'antd'
import { useState } from 'react'
import { localize } from '../i18n/Localize'
import { useLanguage } from '../i18n/language'

export function MinimizableModal({ title, open = false, onCancel, children, ...props }: ModalProps) {
  useLanguage()
  const [minimized, setMinimized] = useState(false)
  const cancel: ModalProps['onCancel'] = (event) => { setMinimized(false); onCancel?.(event) }
  return localize(<>
    <Modal {...props} title={title} open={open && !minimized} onCancel={cancel} destroyOnHidden={false}>
      <Button className="minimizable-modal-minimize" type="text" aria-label="最小化窗口" title="最小化窗口" icon={<MinusOutlined />} onClick={() => setMinimized(true)} />
      {children}
    </Modal>
    {open && minimized && <Button className="minimized-modal-restore" icon={<ExpandOutlined />} onClick={() => setMinimized(false)}>恢复未完成的窗口</Button>}
  </>)
}
