# 规则匹配结果 UI（FE4-05 与匹配接入）

## 功能说明

- MatchesPage 调用 `api.listWantedMatches` 获取某条求购信息的规则匹配结果。
- 每条匹配展示 `relevanceScore` 相关度（百分比），并明确标注该分值不是成交概率。
- 读取 `MatchResult.expiresAt`，当匹配结果已过期时渲染「已过期」Tag（`color="warning"`），未过期时正常展示。

## 对应代码路径

文件：`frontend/src/live/MarketPages.tsx`

- `api.listWantedMatches` 调用：第 213 行。
- 关键词/规则降级提示：第 217 行。
- 过期标识：第 220–225 行（`expiresAt` 读取在第 221 行，`isExpired` 判断在第 222 行，「已过期」Tag 渲染在第 225 行）。
- 相关度展示：第 224 行。

## 验收标准达成情况

- FE4-05 过期标识：达成。`expiresAt` 为 ISO 时间字符串，缺失或解析失败时按未过期处理；过期项展示 warning 样式的「已过期」Tag。
- 匹配结果接入：达成，使用 `api.listWantedMatches`。
- 相关度分展示：达成，`relevanceScore` 以百分比展示，并注明「不是成交概率」。

