# T3 独立评估记录

评估对象：智能推荐 / 语义匹配类能力是否达到可报告的效果。

规则：

- 只有存在真实、合格、许可明确的数据时才能给出准确率类结论。
- 没有合格数据时，如实写 `NO_GO` 并说明缺什么，不用合成样例代替真实评估，不为了“有数字”而凑样本。
- 结论由 T1 总登记引用，不复制第二套数据。

## 数据门槛核对

复算执行：2026-11-20，材料检出 `c090ce4db7b5f4f2e6f63be77eedad2b233e937a`，原始输出见 `logs/c30-independent-recompute-20261120.log`。

| 门槛 | 要求 | 实际情况 | 是否满足 |
|---|---|---|---|
| 数据许可 | 允许用于评估与报告 | 数据在 `docs/evidence/phase-5/intelligence` 内声明为合成数据集；媒体为 CC0（`media/LICENSE.md`）。未见禁止用于评估的条款，但也没有一份写明“允许据此对外报告效果”的授权签署 | 部分（未见拒绝，也未见正式授权） |
| 数据封存 | 有固定版本与校验值 | `data-hashes.json` 固定 17 个资产 + 依赖锁/生成器/schema，本次实测 20/20 一致；但 `testSetSealed=false`，标签状态 `HUMAN_REVIEWED_UNSEALED` | 否 |
| 样本规模 | 满足最低样本量 | `test_candidate` 12 个请求（门槛 ≥100）；dev 26、test 切片均 <30 | 否 |
| 标签质量 | 有可信标注或对照 | M7：228/228 对已人工审核（`m7-label-reviewed-20261018-v1`），但未封存；M8：0 条合格 L3 成交标签，仅 12 条 L0 合成样本 | 否（M8）；部分（M7） |
| 可复现性 | 同版本可重复得到同结果 | 基线 `metrics-all/dev/test_candidate` 三份与封存归档**逐字节一致** | 是 |

## 复算脚本与输入

在含 `data/` 与 `docs/evidence/phase-5/intelligence/` 的检出上执行（本目录 `logs/` 内附复核脚本）：

```powershell
# 1. 基线评估重算（--output-dir 必须为空）
python -m services.m7_baseline.evaluate --output-dir .codex-tmp/c30-baseline-reviewed `
  --review-archive docs/evidence/phase-5/intelligence/human-review/20261018-kkkkrui-v1/archive

# 2. 资产哈希 + 指标字节一致性
python logs/c30-recompute-check.py --root . --recomputed .codex-tmp/c30-baseline-reviewed

# 3. 数据/模型门禁
python scripts/intelligence_phase2/gate_check.py       # 退出码 3：存在 NO_GO 原因，不是脚本报错
python scripts/intelligence_phase2/asset_check.py
```

输入：`data/m7-phase2/{raw,derived}`（datasetVersion `m7-synthetic-p2-v1.1`）、`docs/evidence/phase-5/intelligence/human-review/20261018-kkkkrui-v1/`（归档与标签）、`data/m8-phase2`（M8 价格评估）。环境：Windows / Python 3.13.7（非项目锁定 3.12，见「限制」）。

## 运行结果

| 项目 | 内容 |
|---|---|
| 软件 SHA | `c090ce4db7b5f4f2e6f63be77eedad2b233e937a`（含 main 合并内容；PR 分支为 `cb53ce5`，仅测试交付物） |
| 数据集标识与校验值 | M7 `m7-synthetic-p2-v1.1`，`data-hashes.json` 20/20 一致；M8 `m8-price-eval-v1`，12 条记录、`eligibleL3Count=0` |
| 评估方法 | 基线 `services.m7_baseline.evaluate`（`m7-keyword-v0+match-v0`），显式读取人工审核归档，未使用 `PENDING_HUMAN_REVIEW` 草稿标签 |
| 指标与口径 | MRR@k / P@k / R@k，`label>=1` 与 `label>=2` 两档，k=1/5/10，`COMPLETE_CATALOG_POOL` |
| 结果 | `test_candidate`（12 请求）：matching MRR@10=1.0、R@10=1.0；search 严格标签（label≥2）P@5=0.5、宽标签（label≥1）P@5=0.675；hardViolation=0。三份指标与归档逐字节一致 |
| 结论 | **NO_GO** |

与归档 `evaluation-status.json` 的关系：该文件记录的候选（BGE）MRR 相对提升 0.0（要求 ≥10%）、严格标签 P@5=0.5（要求 ≥0.70）、`formalDecision=NO_GO`、`status=DIAGNOSTIC_ONLY`。本轮复算的是**基线**（不含模型/向量索引），候选侧数字沿用归档，未重新推理。

## 若为 NO_GO

| 缺什么 | 影响哪个结论 | 补齐需要谁 | 补齐后如何复评 |
|---|---|---|---|
| `test_candidate` 请求数 ≥100、各切片 ≥30 | 任何 MRR/P@5 的统计意义 | T1（数据扩充与切片重建） | 重建 `data/m7-phase2` 后重跑本页三条命令，比对 `data-hashes.json` 新基线 |
| 测试集正式封存（当前 `testSetSealed=false`） | “未在测试集上调参”的可信度 | T1 + M10 见证 | 封存后重算三档指标，对比本次归档 |
| 许可/授权口径（可否对外报告效果） | 能否把数字写进发布材料 | T1 + M1 | 出具授权说明后，本条门槛由“部分”转“是” |
| M8 合格 L3 成交标签（当前 0 条） | MAE/MAPE/区间覆盖率 | M8 + T2 真实成交数据 | 有 L3 标签后重跑 `asset_check.py`，`predictionMetrics` 从 `NOT_EVALUATED` 转为实算 |
| M1/M10/M7（M8 为 M8）签署 | `gate_check.py` 的 `APPROVAL_MISSING_*` | 对应签署方 | 签署后重跑 `gate_check.py`，三项 `registration` 才可能离开 `NO_GO` |

## 限制

1. 只复算了基线关键字/规则口径，未重跑候选模型的真实推理（BGE 模型与向量索引未在本轮加载）；候选侧结论引用归档，不冒充本轮新结果。
2. 数据为合成数据集，标签由人工审核但未封存；即使指标好看也不等于真实成交场景的效果。
3. 本机 Python 为 3.13.7，项目锁定 3.12；本轮未整套安装 `backend/requirements.txt`，仅补 `jsonschema==4.25.1`。数值与归档逐字节一致，但依赖口径与锁定环境不完全相同，正式复评应在 3.12 锁定环境重跑。
4. 未执行任何写操作：未写库、未上传媒体、未改门禁策略与阈值。

## 与既有结论的一致性

与 `docs/evidence/phase-5/intelligence/verification.md`、`gate_check.py` 输出一致：M7/M8 均维持 `NO_GO`，本记录不构成 M10/M1 签署，也不能用于发布材料。
