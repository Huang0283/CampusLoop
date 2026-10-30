# T1 缺陷与修复登记

| ID | 原始问题 | 本轮修复/状态 |
|---|---|---|
| T1-PKG-01 | setup/reset 仅打印，默认指向日常 8001 | 已实现独立 Docker 配置校验、真实 API、映射/幂等、默认 dry-run；专用环境验证 |
| T1-PKG-02 | CLOTHING/OTHER 不合法；图片配额不符 | 改 clothing/other，校验全部配额和引用 |
| T1-PKG-03 | 图片与清单缺失 | 8 个原始 CC0 几何图 + 4 个本地拒绝定义；源/存储哈希 |
| T1-PKG-04 | verify 只计数，失败仍 exit 0 | 全数据族字段/引用/哈希/规则/OpenAPI 校验；失败 exit 1、阻塞 exit 2；加入 CI |
| T1-PKG-05 | mock 缺完整 DTO、分页/错误信封不符 | 按同版 OpenAPI 提取验证；标明人工 MOCK_RESPONSE，不用于生产 |
| T1-PKG-06 | 无交易被写低信誉；M8 输入未映射 | events/risk 输入；无有效交易 NEW_USER_NEUTRAL/3.5；不做处罚结论 |
| T1-PKG-07 | 文档覆盖器和不实完成状态 | 删除覆盖脚本；保留 36 未执行记录；修正 422/423 和会话预期 |
| T1-BLOCK-01 | 无账号/媒体/关联历史安全删除 API | 未解决，显式部分清理/新 runId；交 M10 |
| T1-BLOCK-02 | T2 前置/36 权限用例与独立签收未完成 | 未执行，保留交接事项，不冒充业务验收 |

审查补正：PENDING_CONFIRM 在该版本 OrderStatus 中合法。修复 mock 采用完整 BOOKED DTO，是为了提供真实可达状态及必填字段；不再把该枚举本身登记为缺陷。
