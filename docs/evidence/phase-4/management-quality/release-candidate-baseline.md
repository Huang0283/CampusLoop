# MQ4-08 发布候选基线与Phase5起点
当前只是候选清单，不是正式RC：业务main829ffbfc7f5c310917b2ff7c9627fe98b117824a；M2实现8803e639302324e13183af336431dbbb550aea2f及文档7f96a09/PR94；M10证据07b2922a4c7b2029ab2512e340f5e551883a25fa/PR95；M7实验e4dc076d7a589f41b3d8cd61c246dabe67e9c39d（不进生产）。
尚无唯一合并Phase4提交；绝不能把以上几个分支拼成“已发布”。Phase3正式标签也没有新建，M1核对原授权后处理输入记录。

## 固定回归集
后端现有37测试：认证/浏览器会话/交易状态/权限/隐私/幂等/outbox旧结果等。BASELINE_SERVICES_ENABLED=false下交易+实时媒体8项。
前端journey5项和M2新增6项；M3/M4完成后加入正常/超时/关闭/旧版本/重复通知/私密治理场景。不能仅凭当前11项宣称新增消费页面全验收。
独立候选搜索+匹配38请求，两次执行和输入/指标/源码/模型哈希；仅诊断NO_GO，不会把未seal数据当正式测试集。
RPC故障探针18项修复后必须18PASS；当前13/18。M8规则17单测+9固定样例。每次换代码更新记录并保留历史失败证据。

## 最终固定流程
各个人PR经同组Review→四组汇总phase4/integration→M10从该唯一提交跑全部回归→M1批准范围/P0P1零→真实汇报记录→唯一阶段PR合main→M1记录合法tag与合并hash。
然后四组Phase5从同一冻结hash建分支，各自只接feature-freeze-register已批准事项。未完成功能仍留Phase4阻塞或经M1正式范围变更，不自动塞给下一周。
freeze-candidate.json记录当前门禁，`python scripts/quality_phase4/check_freeze_gate.py`应退出2。它检查状态证据，不能替代成员Review和真正签署。没有通过就不能生成正式freeze/tag或关闭#33。
