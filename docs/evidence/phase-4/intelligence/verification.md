# Phase 4 M7 前三项验证记录

日期：2026-10-08。候选基准为 M8 新推送分支提交 `762787f14d8bcb009e85548808c4bb34c26eae87`，该提交包含 M7 Phase 3 修订 `df45ebb4fadc330a5ff8a3ffaf8ec59aa8fa5437`。基准引用只表示代码准备，未替代 M1/M10 阶段验收。

已完成只读检查：读取 Phase 4 任务书与 M7 总技术文档；核对远程正式 phase3/phase4 分支尚未建立；发现 M8 新 Phase 3 基线；核验 BAAI 官方模型来源、固定 revision、许可、维度、输入长度和权重 LFS 哈希。

已从官方固定 revision 获取 config、tokenizer、special tokens、词表和模型卡共六个文件并记录各文件 SHA256，配置维度与输入长度均为 512。权重仅核对官方 LFS 哈希，未下载或执行；机器记录见 [source-provenance.json](source-provenance.json)。已执行文档链接、JSON 可解析性、revision/维度一致性和 Git 差异空白检查；本次不改行为代码，按 docs/config-only 范围不新增行为测试，也不声称通过模型或索引测试。

测试流程状态：已读取 [ai-feature-delivery 技能](C:/Users/KkkkRui/.codex/skills/ai-feature-delivery/SKILL.md)，本机未找到其要求的 tdd 技能。已请求用户允许以既有 unittest 执行先失败测试、实现和回归的明确例外；未收到答复前不改行为代码。目前只有设计文档交付，不冒充索引或语义排序已经实现、真实模型已经执行。

后续验证计划：公共编码/索引/排序入口的成功与失败测试，Phase 2/3 回归，实际固定模型重复推理与批量维度/归一化检查，索引逻辑重建比较和增量墓碑测试，硬约束/权限边界及失败降级验证。保存真实提交、完整依赖/模型文件哈希、环境、命令、日志和实际结果；来源或依赖获取失败时如实记录，不用测试向量冒充真实模型输出。
