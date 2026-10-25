# BP4-05：M6 智能业务 API 与契约交接

实现：`backend/app/api/routes/intelligence.py`、`backend/app/services/intelligence.py`、
`backend/app/services/ai_adapters.py`。统一契约：`openapi/campusloop.v1.yaml`；
生成 SDK：`frontend/src/sdk/generated/`。

| API | 谁可调用 | 输入/结果与有效性 |
|---|---|---|
| GET /search | 游客/登录用户 | query 必填且1–200字符；mode、类别、成色、价格、排序、分页；只输出当前 ON_SALE、未删除、有效卖家、版本一致商品 |
| GET /wanted/{wantedId}/matches | 该求购所有者 | 他人403、未登录401；关闭/过期409 WANTED_INACTIVE；商品仍需通过实时可见性与版本检查 |
| POST /price-advice | 登录且账号有效 | category、condition、可选 originalPrice；返回人民币区间或显式不可用；只读，不自动修改商品售价 |

匹配包含 product、relevanceScore、reasons、constraints、resultVersion、expiresAt；
搜索包含 items、pagination、mode、degraded、degradationReason、resultVersion。
价格包含 lower/upper、currency、status、factors、method、sampleSize、
degraded/degradationReason、disclaimer、resultVersion。
价格请求是发布表单咨询，没有 productId，不存在“将下架商品的历史价格当成当前结果”的读取路径。
内置数据集上限5000，超过返回503 SEARCH_CAPACITY_EXCEEDED，不伪造完整搜索结果。

## 上游版本与门禁

消费已合入基线的 M7 `m7-baseline-rpc-v1` / `m7-baseline-result-v1`，
`m7-keyword-v0` / `m7-match-v0`，M8 `m8-baseline-rpc-v1` / `m8-price-rule-v1`。
请求与返回字段沿用现有契约；不自行猜测尚未集成的语义模型字段。
semantic/hybrid 请求目前走显式 keyword/rule 降级，不能宣称语义模型上线。
M8 Phase4 数据准入文档结论 NO_GO，因此不启用价格候选，也不自动批准训练数据。
M7/M8 的独立字段确认与 M2/M3 消费签字仍待团队完成。

## 已接收 M5 的契约同步任务 H4-02

统一 OpenAPI 补充本人/管理员信誉、人工覆盖举报、敏感读取 reason、
处理 note 必填非空、处理/覆盖幂等头，以及相关失败响应。
新增 AdminReport/AdminReportResponse/AdminReportListResponse，
管理员 evidence 使用受保护相对路径 uri-reference，handledBy/handledAt 可空。
普通举报返回继续使用原 Report schema，不能将管理员字段推广给普通举报人。
TrustSummary 增加 visibility/explanation，PUBLIC 缺省 smoothing/ignoredEventCount。
使用生成器更新 SDK，不手写生成文件。

## 手工联调顺序（测试账号、独立测试环境）

1. 卖家发布在售商品；买家创建未过期且预算覆盖商品的求购，保存两者 ID。
2. 游客搜索确认能看到商品；买家读取 matches，其他账号读取应403，未登录应401。
3. 卖家下架商品；重新搜索/匹配不能包含它。
4. 买家关闭或令测试求购到期，matches 应409，不返回历史有效结果。
5. 将模型服务关闭，再发布商品/求购并浏览；价格提示不可用，不提供0元假价格。
6. M9 启动 Worker，重复事件后检查数据库每个键只有一条任务、每对只有一次通知。
7. M10 记录阶段提交 SHA、账号角色、命令、实际响应和失败日志；作者自测不替代联合签字。
