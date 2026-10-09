# FE3-07 会话、消息和连接

`TransactionPages.tsx/useChat.ts`从真实会话读取历史，向后端提交TEXT/IMAGE并对账。初始最近100条、历史分页及afterId增量各有服务端ID；只由HTTP补拉推进HTTP游标，WS或单条发送响应不能跨过未读消息造成漏拉。

WS /ws首帧AUTH，不将token放URL；鉴权后订阅参与会话，组件卸载关闭连接。消息写入数据库后ACK/推送，用户只能读参与会话。私聊图片通过受保护media API读取Blob，不直接公开桶地址。

浏览器两个独立context实际收发文字和私有图片；后端WS用例独立验证真正事件/ACK、重复消息、旁观者拒绝、会话撤销，不用HTTP轮询冒充WS验收。
