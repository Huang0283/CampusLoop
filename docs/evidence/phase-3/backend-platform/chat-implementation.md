# BP3-05 持久聊天与实时恢复

会话按真实商品/求购及参与者创建或复用；文本/私有图片先提交 PostgreSQL，再 HTTP 返回或 WS ACK。clientMsgId 为 UUID，数据库保护发送者＋UUID 唯一，同 UUID 不同内容拒绝。历史支持 beforeId/afterId；已读游标单调推进并校验消息所属会话。

WS /ws：5 秒内 AUTH 首帧，禁止 query 凭据，Origin 白名单，8KiB 帧限制，每连接每分钟最多 120 帧，每次输入/输出重新确认会话撤销和账号状态。PostgreSQL 增量扫描提供跨进程推送，不以 Redis 或内存作为消息事实。

前端 live/useChat.ts 将 HTTP 补拉游标与已展示消息分离，服务端 ID 和临时 UUID 对账，自动重连 1–30 秒退避，5 秒 HTTP 恢复；失败保留原 UUID 重试。每条私有图片走授权 API，Blob URL 卸载撤销。测试：test_realtime_media.py；浏览器验证双账号实时、私图、失败重试、离线重连与不重复显示。

