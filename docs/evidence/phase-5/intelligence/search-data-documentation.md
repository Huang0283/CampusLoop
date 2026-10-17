> 2026-10-17 共同交付续版：当前准备技术基点为 `45acf879bf41c18baae4f89584c9e1732f848c97`，已整合未合并的 Phase4 PR #107。最新环境、联合命令、运行结果与接收状态以 [共同交付入口](joint-delivery/README.md) 为准；下方原个人基点与结果保留为历史，不是新冻结版本。原“坏响应统一降级未覆盖”问题已在该 P4 修复并由本轮诊断重放通过，正式阶段仍待接收。

# AI5-02 数据来源、许可与重建说明

日期：2026-10-17。统一处理数据版本为 `m7-synthetic-p2-v1.1`；旧原始 assetId `m7-synthetic-p2-v1` / version `2026-09-26-v1` 表示来源谱系，保留原始字节，不改名重写。
完整文件清单、SHA256、生产脚本/依赖/schema 哈希见 [data-hashes.json](data-hashes.json)。

## 1. 来源与许可边界

| 资产 | 来源和可分发边界 |
| --- | --- |
| `data/m7-phase2/raw/*` | 本项目会话生成的原创合成 fixture，未爬取、未导入第三方数据集，不包含真实个人资料；原声明为 `project reuse candidate pending team acceptance`。不是已获团队签署的数据许可，不另行编造 CC/MIT 授权 |
| `data/m7-phase2/derived/*` | 由已提交 raw 和锁定 pipeline 确定性生成；用于 schema、硬边界、标注工作流和划分复现，不适合作生产效果或上线依据 |
| 真实业务数据库 | 不随本次交付导出；没有真实私有数据就运行上述完整合成样本替代路径，不要求提供账户/交易隐私 |
| BGE 模型 | 官方固定 revision 的 MIT 模型卡；来源记录及逐文件哈希在 `source-snapshots/m7-source-provenance.json`；通过锁定下载程序单独获取，不把模型权重塞进数据包 |

团队接收许可、替代真实数据及最终冻结由 M7/M1 确认；现有来源声明不等同于法律上的开放数据许可。未发现需要分发的外部私有数据；若后续换入新来源，必须另做许可/脱敏/版本审批，不能覆写本次基准。

## 2. Schema 与生产链

raw schema 为 `m7-raw-v1`，处理 schema 为 `m7-processed-v1`，定义在 `schemas/m7-phase2/dataset.schema.json`。
入口 `scripts/m7_phase2/pipeline.py`；词典 `m7-fixture-dictionary-v1`；固定 asOf=`2026-09-26T00:00:00Z`，seed=`20260926`。

生产链：已提交的 84 条商品快照 → 选取 asOf 有效快照（12 条旧版本被审计排除）→ 72 商品与 38 请求 → 228 商品/请求标签草稿 → 连通分量划分 → 10 个派生文件 + manifest。
六个 raw 文件包括 asset-manifest、dictionary、products、requests、scenario-cards、semantic-drafts。脚本从这些原始 fixture 重建派生资产；不宣称存在从零自动创造原始事实的生成器。

| 字段/规则 | 说明 |
| --- | --- |
| 商品身份与事实 | productId、catalogId、ownerId、校区/类别/地点、priceFen、condition、状态/可见性、实体版本与快照时间；priceFen 为整数分 |
| 请求 | search/matching、queryText、filters、context；matching 包含 wanted 发布者、状态与有效期，卖家 ownerId 与 wanted.ownerId 不是同一角色 |
| 标签 | `0/1/2/U`，约束 fail/unknown 与语义草稿组合；U 不能当负例；`labelVersion=m7-label-draft-v1` |
| 字节 | raw 按原始字节保留；derived UTF-8/LF；review CSV UTF-8 BOM/LF；`.gitattributes` 防止 autocrlf 改变哈希 |

## 3. 固定划分和泄漏检查

| 划分 | catalog / 商品 / 请求 / 标签对 | split SHA256 |
| --- | --- | --- |
| dev | 8 / 48 / 26 / 156 | `9529901750ebd5c2a1a1c445cfb59bd8799244d421005315eee3836336927d2f` |
| test_candidate | 4 / 24 / 12 / 72 | `5aa1c152145270acb148d8795ea1c3545513a9de222e403e06a877d46f7687a5` |

划分按 catalog、实体、模板和近重复关系形成 12 个连通分量，固定种子排序按 2:1 分配；不是对 228 对逐行随机拆分。
`leakage-report.json` 保存关系及违规检查，当前没有报告跨 split 违规。近重复使用 NFKC/casefold/字母数字归一与阈值 0.9 的启发式；这不能证明无语义泄漏或预训练语料重叠。
作者已看过标签，`test_candidate` 未封存，不能改称独立测试集。

## 4. 标注、人工复核与可选空栏

标签草稿分布：0=117、1=24、2=85、U=2。用户已确认 228/228 人工复核且全对，原标签不变；本次收到的现存 CSV 逐条记录仍未归档。这两件事分别记录，不把结构化计数 0 表述成人未复核。

机器评估目前仍为 `humanReviewedPairs=0`、`labelSource=PENDING_HUMAN_REVIEW`、`testSetSealed=false`。实际表检查与 SHA256 见本次 evidence；没有代填人员、理由或时间。
归档必需 reviewer/reviewLabel/reviewReason/reviewedAt，时间需有时区；无争议时 dispute/adjudicator/finalLabel/adjudicatedAt 按现有校验规则允许空，不要求八栏全填。

待实际记录提供后，使用 [复现指南](search-reproduction-guide.md) 的 review_archive 命令检查并生成独立的新 labelVersion，保留原始 draft 和评估。即使标签数值不变，也必须经校验归档才能将新评估标为已归档人工标签；归档本身仍不等于测试集封存。

未决边界保留：lamp-matching、tablet-matching 的 U 请求整条排除主比较；tennis-matching-expired 为过期求购边界，不作相关性 benchmark；camera-matching-no-answer 保留空答案测试。当前主可比较请求为 35，不删除失败样例来提高数字。

## 5. 可执行替代/重建

不需要数据库导出或真实用户资料。干净检出固定集成提交，安装 `scripts/m7_phase2/requirements.txt`，执行：

```powershell
python scripts/m7_phase2/pipeline.py verify
python scripts/m7_phase2/pipeline.py build --output-dir ../m7-p5-data-rebuilt
python scripts/m7_phase2/pipeline.py verify --bundle-dir ../m7-p5-data-rebuilt
```

输出目录必须是新空目录，位于源码外；verify 核对 raw/derived/schema/生产脚本/锁依赖哈希，再临时重建并比对 manifest 字节。完整环境、基线和候选步骤见 AI5-03。本次不重新标注、不更换划分、不加入新样本追逐门槛。
