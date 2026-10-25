# AI5-08 联合复现环境与资产清理

## 2026-10-25 当前复现补充

本轮使用 Python 3.12.14 / Windows AMD64 的两个隔离环境：基线环境按 `scripts/m7_phase2/requirements.txt` 安装，候选环境按 `services/m7_semantic/requirements.windows-cpu.lock.txt` 安装；两者 `pip check` 通过。候选模型继续使用缓存目录中的已核验固定 revision，不把缓存当作本次重新下载。基线完整复现、M7 真实模型复现、M8 14/31/29 项回归和 12 场景联合部署均通过。新建环境没有预装 pip，因此复现记录使用 `importlib.metadata` 生成等价的安装分布快照，不改变运行依赖。

Windows 本机对新 Python 可执行文件的回环访问最初被防火墙拦截；仅在验收期间为该 Python 3.12 路径增加了 127.0.0.1 入站临时规则，重跑成功后已删除规则。M8 仍为 `NO_GO`，M7 仍为 `DIAGNOSTIC_ONLY / NO_GO`；正式发布环境、M10/M1 签署和 M8 互审未完成。

2026-10-17；整理人 M7；本次真实代码提交 `45acf879bf41c18baae4f89584c9e1732f848c97`。技术环境核对通过，发布环境接收待 M9，组内互审待 M8。不是 Phase 5 冻结清单。

## 两个环境分别锁定

| 环境 | 依赖与本次事实 | 使用范围 |
| --- | --- | --- |
| 基线 | Python 3.12.14 / Windows AMD64；新建 venv，从官方 PyPI 安装 `scripts/m7_phase2/requirements.txt` 六个精确版本，pip check 与逐项比对通过 | M7 数据/基线/RPC；M8 基线、价格/信誉/风险；没有 PyTorch |
| 实验候选 | 原有隔离 venv，32 个版本匹配 `services/m7_semantic/requirements.windows-cpu.lock.txt`，pip check 通过 | CPU PyTorch 2.8.0+cpu、Transformers 4.57.6、真实 BGE 推理；没有声称本次重新安装候选环境 |
| 后端/前端/基础设施 | `backend/requirements.txt`、`frontend/package-lock.json`、`docker-compose.yml` 和现有 CI 文件已登记 Git blob 哈希 | 本机没有 Docker/PostgreSQL/Redis，发布环境安装与镜像 digest 待 M9；已有 CI 的 Ubuntu latest/容器 tag 不能当永久锁定 digest |

两个 Python profile 的 jsonschema / rpds-py 等版本不同，不能混装后声称同时匹配两份锁。完整记录见 [环境审计](evidence/joint-v1/environment-audit.json) 和两个 freeze 文件。候选 Windows CPU 锁不保证其他平台可装，M9 必须记录实际平台、安装输出、pip check、容器 digest、Node/npm 版本与 npm ci 输出。

## 参数、种子与版本

- M7 BGE 固定 `BAAI/bge-small-zh-v1.5@7999e1d3359715c523056ef9478215996d62a620`；CPU float32，512 维，CLS，单位化，最大 512 tokens，batch 16，单线程，seed=0；RRF k=60，keyword/vector 权重各 1，深度 100。完整参数原样记录在 [release-manifest.json](joint-delivery/release-manifest.json)。
- M7 索引为私有 SQLite exact cosine；公开服务保留 `m7-keyword-v0` / `m7-match-v0`。候选未上线，不把向量相似度写成成交概率。
- M8 规则确定性执行，无随机训练，seed=null；价格 `m8-price-rule-v1`、信誉 `m8-trust-rule-v1`、风险 `m8-risk-clue-rule-v1`。候选路由超时 300ms，不改变数据/审批门禁；fixture 的 candidateEnabled=true 仅验证 NO_GO 安全回退，不是发布开关。
- 保持数据、划分、标签、字典、规则与门槛原版本；双方候选 NO_GO。没有继续调参或换测试集。

## 清理与来源审计

本次扫描 Git 跟踪文件 1643 项，登记 154 项源资产哈希，七个模型来源文件 SHA256/字节数通过。未发现被跟踪的模型权重、SQLite、虚拟环境、node_modules、pyc/cache 或高置信真实凭据匹配。原本没有这些禁止资产，因此没有删除用户文件。模型、临时库、venv 与生成索引放源码外；打包只使用 Git 源码与已登记文本证据。

[资产扫描](evidence/joint-v1/asset-audit.json) 只覆盖当时跟踪文件与有限高置信模式，不是完整历史安全/隐私审计。M7 为既有合成诊断资产，许可与标签正式接收仍待确认。M8 已提交 12 条团队合成 L0 样本有 PDS-03 来源登记，外部未批准来源只保留登记，不抓取或附带新原始数据。BGE 文件来源/许可说明保留，95MiB 级权重不进 Git/交付 ZIP。

首轮未设置可写 TEMP 的两次 verify 超时退出，原始失败保留；本轮设置源码外同一可写目录到 TEMP/TMP/TMPDIR 后，全部原命令通过，没有扩大超时、跳过测试或改生产代码。

复现命令见 [联合指南](joint-delivery/reproduction-guide.md)。M9 发布环境确认和 M8 互审尚未签署，AI5-08 不能标记为正式验收完成。
