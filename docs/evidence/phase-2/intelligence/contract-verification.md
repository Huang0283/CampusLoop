# AI2-04/05 验证记录

v1.1 补充：后续修复了数据重建的换行问题，原数据语义与本契约保持不变；当前回归日志见 evidence/portability-v1.1/，历史 evidence/contracts-v1/ 中“资产未变”只适用于当时 v1 的交付。见 [portability-review.md](portability-review.md)。

日期：2026-09-28。性质：本会话的本地合成样例/可执行规格校验，不是 M8 互审、M10 独立运行、HTTP 联调或数据库并发测试。

## 1. 运行方法

在仓库或导出包根目录执行，Python 3.12；复用前三项的固定依赖文件，不更改数据 manifest：

```text
python -m pip install -r scripts/m7_phase2/requirements.txt
python scripts/m7_phase2/contract_check.py
python -m unittest discover -s scripts/m7_phase2 -p test_contracts.py -v
python -m unittest discover -s scripts/m7_phase2 -p test_pipeline.py -v
python scripts/m7_phase2/pipeline.py verify --bundle-dir data/m7-phase2/derived
```

本机默认 Python 没有 pip，因此使用 Codex 附带 Python 3.12 与工作区独立依赖目录；具体路径、OS、执行时间、基准提交、命令、返回码和日志在交付包 evidence/contracts-v1/run-record.json。该文件记录实际结果，不由本文提前宣布通过。

## 2. 证据索引

| 证据（导出包根目录下） | 内容 |
| --- | --- |
| evidence/contracts-v1/examples.log | 逐个样例的结构、状态码及跨字段校验 |
| evidence/contracts-v1/tests.log | test_contracts.py 的错误输入与生命周期顺序模拟结果 |
| evidence/contracts-v1/data-regression.log | 原 test_pipeline.py 的回归结果 |
| evidence/contracts-v1/data-verify.log | 原始/处理数据/schema/pipeline/依赖哈希及重建一致性 |
| evidence/contracts-v1/preservation.json | 与此前 AI2-01—03 导出包对比，确认数据及旧代码未改 |
| evidence/contracts-v1/negative-cli.log | 注入缺时区样例后的真实非零退出与拒绝信息 |
| evidence/contracts-v1/export-examples.log、export-tests.log | 从导出目录重新运行样例和契约测试 |
| evidence/contracts-v1/run-record.json | 环境/时间/提交及所有退出码 |
| FILES.sha256.json | 本次导出文件逐项 SHA256；不含自身与外层 ZIP |

原数据交付 evidence/tests.log、build.log 等保留原始内容，其日期为 2026-09-26，不能混作本次新契约测试。历史运行记录使用 d6e61b6 作为生成时基准；当前交付已在 40173f8 基线上通过 PR #71 提交，以文件清单哈希绑定当前内容。

## 3. 覆盖和限制

样例覆盖：搜索/匹配成功、合法空结果、模型超时回退、仅硬条件匹配、422/401/403/404/409/429/503、待更新 202，以及事件/任务/结果/通知记录。解释贡献、金额单位、公开白名单、分页总数、版本/时效、任务/通知内容摘要由代码检查。

错误注入覆盖：未知/敏感字段、伪造 ownerId、空白查询、预算倒置、超出 JS 安全范围的 ID、无快照续页、错误码错配、静默降级、基线假报模型、100 分制误入 API、空分数类型、虚假预算解释、解释贡献错和、已售商品、到期等值、缺时区/非法日期、混合版本、错误商品解释、内容篡改。

生命周期用受控时序模拟重复/乱序/租约/旧 worker、输入修订变化、策略回滚、资格周期和通知复核。传入权限布尔值不等于真的执行认证；内存集合去重不等于数据库唯一约束已部署；顺序调用模拟不等于并发测试。

第一轮发现：当前 jsonschema 安装没有可选的 date-time 解析依赖，缺时区输入没有被格式检查阻止，随后触发 naive/aware 时间比较异常。已在校验器显式注册日期校验，验证时区和真实日历日期，不改动原依赖锁或数据 manifest；最终日志应显示该负例作为预期拒绝通过。

未执行：真实 HTTP/SDK 编译与页面改造、实际模型超时、业务库事务回滚、消息队列并发/恢复、真实通知或独立人员复现。开发超时配置不是实测 SLA；formal freeze 必须由 [contract-handoff.md](contract-handoff.md) 的真实接收人完成。
