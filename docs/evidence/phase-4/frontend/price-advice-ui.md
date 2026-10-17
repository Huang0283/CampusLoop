# 价格建议 UI（FE4-06）

## 功能说明

- PricePage 调用 `api.getPriceAdvice` 获取规则价格建议。
- 展示价格区间 `lower` / `upper`、免责声明 `disclaimer`、`factors`、`resultVersion` 与 `degradationReason`。
- 按 `result.status` 区分三种状态：
  - `AVAILABLE`：展示规则参考区间。
  - `INSUFFICIENT_DATA`：提示样本不足，有区间时展示「样本不足，以下为规则区间参考」并附区间；无区间时提示「样本不足，请手动定价」。
  - `UNAVAILABLE`：提示「暂不可用，请手动定价」。
  - `status` 未定义：退回原有的 `result.lower === null` 兜底逻辑。
- `sampleSize` 存在且展示区间时，追加「基于 N 个样本」。

## 对应代码路径

文件：`frontend/src/live/MarketPages.tsx`

- `api.getPriceAdvice` 调用：第 263 行。
- `status` 三态分支：第 234–260 行。
- 价格区间 `lower` / `upper`：第 242–243 行。
- `sampleSize` 样本数展示：第 244 行。
- 免责声明 `disclaimer` 展示：第 269 行。

## 验收标准达成情况

- FE4-06 样本不足：达成。已区分 `AVAILABLE` / `INSUFFICIENT_DATA` / `UNAVAILABLE` 三种状态，`INSUFFICIENT_DATA` 有专门的样本不足提示与区间展示，`UNAVAILABLE` 明确提示手动定价。
- 免责声明保留展示：达成。

