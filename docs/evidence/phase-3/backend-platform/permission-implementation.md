# BP3-02 / BP3-03 对象权限与审计

私有资料只返回当前用户白名单；用户公开资料严格五字段：id/nickname/avatar/rating/transactionCount。评分和交易量通过有效 COMPLETED 订单聚合，不使用种子中的演示冗余评分。普通用户无权读取他人会话/订单/举报证据或修改他人商品；隐藏商品仅作者带有效认证可读取。认证响应及带授权请求 no-store。

管理员最小操作为用户列表、禁用/恢复，必须提交理由；不得自改或修改其他管理员。审计含操作者、目标、事件、requestId 和必要上下文，不复制令牌、邮箱、私聊或证据。举报证据只由管理员在明确 reportId/imageIndex 上下文读取并留审计。

聊天图片在私有 MinIO 桶；`GET /chat/messages/{messageId}/image` 只允许会话参与者。举报图片为私有引用，`GET /admin/reports/{reportId}/evidence/{imageIndex}` 不公开存储密钥。测试：test_auth.py、test_realtime_media.py。旧准备版本若曾把聊天图放进公共桶，需部署前审查旧对象并迁移；本次新演示库没有该历史对象，不宣称自动修复旧库图片。

