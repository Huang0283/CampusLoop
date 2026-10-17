# 智能搜索 UI 接入（FE4-04）

## 功能说明

- CatalogPage 在用户输入关键词后调用 `api.searchProducts` 发起智能搜索。
- 支持 `searchMode` 模式选择：`keyword`（关键词）、`hybrid`（混合）、`semantic`（语义），默认值为 `hybrid`，并通过 URL 参数 `searchMode` 保留状态。
- 搜索结果包含 `mode`、`degraded`、`degradationReason` 等元数据，前端据此展示当前检索模式和降级提示。
- 503 降级处理：当搜索请求返回 503 时，前端自动以 `keyword` 模式重试一次；重试仍失败才进入错误态。

## 对应代码路径

文件：`frontend/src/live/MarketPages.tsx`

- 模式选项与文案常量：第 14–15 行（`searchModeOptions` / `searchModeLabel`）。
- `searchMode` 解析与默认值：第 41–42 行。
- `loadCatalog` 请求分流：第 46–57 行。
- `api.searchProducts` 调用与 `mode` 参数：第 50 行。
- 503 重试逻辑：第 51–56 行（`try/catch` 中 `status === 503` 且当前模式非 `keyword` 时用 `keyword` 重试）。
- 搜索模式下拉框：第 66 行。
- `degraded` 降级提示：第 73 行。
- 当前检索模式展示：第 63、74 行。

## 验收标准达成情况

- FE4-04 搜索降级：达成。
- 已接入 `api.searchProducts`，并传入 `mode` 参数（`keyword` / `hybrid` / `semantic`），默认 `hybrid`。
- UI 提供模式下拉框，选择结果写入 URL 参数 `searchMode`，刷新或分享链接后状态可保留。
- `degraded === true` 时展示「搜索正在使用关键词降级结果」警告条。
- 遇到 503 时自动降级为 `keyword` 重试一次，重试仍失败才显示错误。

