# 独立评估数据登记（2026-11-17）

本轮没有进行合格模型效果评估；状态保持NOT_EVALUATED/NO_GO。API功能、Mock、合成五商品样例均不计为模型准确率。

| 资产 | 版本及来源 | 复现入口 | 限制 |
|---|---|---|---|
| M7搜索/匹配 | 原报告c775ccc5729bd73c438ec7bd95a1cc0f25dba7ec；[go/no-go](../../../../evidence/phase-4/intelligence/go-no-go.md) | [联合复现/版本清单](../../../../evidence/phase-4/intelligence/joint-delivery/README.md)、[评估工具验证](../../../../evidence/m7-evaluation/verification.md) | 历史test_candidate仅12请求，未完成正式封存/独立标注；不能推断当前模型效果 |
| M8价格/风险 | 原复验f1b9b7519b51d896c09d36e391632d9460da1940；[M8收尾](../../../../evidence/phase-4/intelligence/m8-closeout.md) | [原独立复核](../../../../evidence/phase-4/intelligence/independent-review.md)、联合交付README中的复现命令/版本 | 无获准L3成交标签，L0合成仅回退测试；MAE/MAPE/覆盖率NOT_EVALUATED；规则风险不等于欺诈识别 |

以上是现有负责人材料索引，未执行或代签原M7/M8独立评估。当前软件9713c8cc1adcf23b8214a29128ef00ca3362332c的本机BGE运行环境/权重缺失，语义效果未验证。等待原负责人接收和提供符合门禁的数据。
