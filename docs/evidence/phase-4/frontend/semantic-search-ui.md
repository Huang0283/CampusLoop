# M3 智能搜索 UI（FE4-04）

## 交付与行为

- 页面：`/market?query=教材&searchMode=hybrid`；实现：`frontend/src/live/MarketPages.tsx` 的 `CatalogPage`。
- 仅通过统一生成 SDK 的 `searchProducts` 请求业务 API，不新建手写智能 DTO。
- 下拉框及 URL 保存 keyword/hybrid/semantic 请求模式；实际使用模式以响应 `mode` 为准，不能以用户选择冒充语义模型已经运行。
- 展示实际模式、`resultVersion`、检索模式说明、`degraded` 和 `degradationReason`。缺少版本明确写“后端未提供”。
- 非关键词请求遇到 HTTP 503，仅自动关键词重试一次。前端保留该次降级事实和原因，即使关键词响应 `degraded=false` 也会提示。
- 自动重试保留 query、category、condition、sort、page、pageSize。关键词也失败时进入错误态，不无限循环。
- 网络/超时和其他 5xx 提供“改用关键词搜索”；401/403/422 不通过降级绕过鉴权或输入校验。
- 空结果显示调整筛选条件提示。没有搜索词时继续使用商品列表接口，游客仍可浏览。

## 验收

在 frontend 目录执行：

```powershell
$env:CAMPUSLOOP_UI_URL='http://127.0.0.1:5184'
npx playwright test m3-phase4.spec.ts
```

用例验证 503 后的真实降级提示、版本、筛选保留、500/超时手动恢复、关键词再次失败不循环、403 不降级和游客搜索。

## 契约边界

当前生成的 SearchResult 只有商品列表和模式/版本/降级元数据，没有逐商品解释字段。页面的“检索说明”解释响应模式，不冒充模型逐商品解释。M7/M6 需确认是否为 FE4-04 补充逐商品解释并生成 SDK，M3 再消费。

检查的后端组分支仍返回 keyword 基线模式。真实语义/混合模型、结果持久化及跨组正常/关闭验收未由此 UI 测试证明。详见 `m3-acceptance.md`。

