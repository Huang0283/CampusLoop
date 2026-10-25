# 字段示例与成员填写要求

以下仅是 **Codex 提供的格式草稿（AI_ASSISTED_DRAFT）**，不计入成员独立编写数量；不得照抄后假称未见人工 test。
实际提交须使用成员自己编写的查询、真实身份、时间和证据。尖括号内容均须替换。

## 场景覆盖建议

成员根据项目真实需求约定覆盖比例，建议包含：标题关键词、口语描述、用途替代表达、简称/同义表达、多条件筛选、明确无答案。
求购还需覆盖预算、成色、型号、交易地点、自卖排除、失效求购及权限边界。
失效/权限拒绝类另列边界检查，不靠它们凑有效质量查询数。每个正式报告切片需符合原数量门槛。
编写时仅看商品事实与任务说明，不看算法结果。别只围绕模型可能占优的同义词采样。
无答案不强行安排正例；信息缺失不要猜；不能为了 GO 删掉基线表现好的查询。

## requests.jsonl 每行结构

沿用现有 processed request schema（包括 queryText、filters、context、wanted），外围补来源。
完整 request 字段可参考 `data/m7-phase2/derived/requests.jsonl` 的格式，但不得把旧查询直接当新测试。

```json
{
  "request": "替换为完整的 m7-processed-v1 request 对象，不是这个字符串",
  "sourceId": "member-scenarios-v1",
  "author": "<实际编写成员>",
  "authoredAt": "<实际时间，例如 YYYY-MM-DDTHH:mm:ss+08:00>",
  "intentGroup": "<独立需求组，同一意图改写使用同一组>",
  "slices": ["<预先约定的主要切片>"]
}
```

## sources.json

```json
[
  {"sourceId":"member-scenarios-v1","kind":"HUMAN_AUTHORED_SCENARIO","licenseStatus":"APPROVED","evidence":"<成员编写及同意用于本次评估的真实记录>"},
  {"sourceId":"catalog-v1","kind":"TEAM_SYNTHETIC_CATALOG","licenseStatus":"APPROVED","evidence":"<完整商品快照的来源、提交和使用确认>"}
]
```

真实商品授权快照用 AUTHORIZED_CATALOG_EXPORT；原合成样例用 TEAM_SYNTHETIC_CATALOG，不能写成真实交易/真实用户导出。
policy.catalogSourceId 指向覆盖整个快照的来源条目；细分来源应在其 evidence 指向的说明中逐条登记。

## 单份盲审记录

prepare-reviews 会按查询×完整商品库生成空行。两位成员各收一份，不互看初审标签。

```json
{"requestId":"<查询ID>","productId":"<商品ID>","reviewer":"<实际复核人>","reviewedAt":"<真实时间及+08:00时区>","label":2,"reason":"<为什么符合或不符合，引用商品和请求事实>","evidence":"<原始审核记录位置/提交/可追溯事实页>"}
```

2=相关且符合条件；1=弱相关但不够符合；0=不相关或不满足硬约束；"U"=关键信息不足。
标签必须与预算、状态、可见性等硬约束一致。不能把确认不符合的商品标成正例提高召回。
reviewedAt 记录实际审核时间，批量确认时间要在原始证据里注明精度，不能伪造逐条耗时。

## 分歧裁决

merge-reviews 保留两份原标签；有分歧时，最终 annotations 中添加 adjudication：

```json
{"reviewer":"<实际裁决人>","reviewedAt":"<晚于双方初审的真实时间>","label":0,"reason":"<讨论后采用该标签的事实依据>","evidence":"<实际裁决记录>"}
```

无分歧时 adjudication 为 null。不得由工具自动选择多数、默认同意或代填 M8 确认。
