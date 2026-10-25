# M3 供需匹配 UI（FE4-05）

## 交付与行为

- 页面：`/wanted/{wantedId}/matches`；实现：`frontend/src/live/MarketPages.tsx` 的 `MatchesPage`。
- 通过统一生成 SDK 的 `listWantedMatches` 获取结果，普通用户守卫保留；业务 API 返回 403 时不显示匹配数据。
- 展示商品、后端匹配原因、硬约束 `constraints`、相关度、`resultVersion` 和有效期；明确“不是成交概率”。
- 每秒更新时间，并在窗口重新获得焦点时重算过期状态；到期即显示“已过期”及刷新提示。
- 缺失/无效 expiresAt 显示“有效期未知，请刷新确认”，不冒充仍有效。
- 页首提供“刷新匹配”和“查看匹配通知”入口，后者进入现有 `/notifications`。
- 展示降级原因，刷新只调用读取接口，不在页面重复生成通知或执行业务写入。

## 验收

`frontend/tests/live/m3-phase4.spec.ts` 验证硬约束、版本、相关度语义、通知链接、停留跨过到期点、无效时间刷新恢复，以及后端 403。

## 尚不能签署的部分

当前 listWantedMatches 是同步结果接口。生成 SDK 没有供页面消费的排队、运行、失败、超时、过期、重试任务查询/操作契约；页面没有伪造 taskId 或任务状态。

接收人：M6/M9 确认任务查询/重试契约并由 M6 生成 SDK，M3 接公共异步组件；M4 与 M10 验证实际任务通知幂等和已读同步。现有结果展示的浏览器测试不替代真实匹配任务、持久化和通知端到端验收。见 `m3-acceptance.md`。

