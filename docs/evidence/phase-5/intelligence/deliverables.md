# AI5-08～10 共同交付清单（作者准备稿）

2026-10-17。技术版本与哈希：[release-manifest](joint-delivery/release-manifest.json)。正式提交/tag 为空，不以准备包代替最终阶段版本。

- AI5-08：[环境与资产清理](reproducibility-environment.md)、两 profile freeze、模型/源资产审计；必要源代码/参数/索引/规则沿用本仓库对应目录。
- AI5-09：[最终集成报告](final-integration-report.md)、可执行联合复现步骤、12 服务检查和 18 故障观察；发布接收模板为 NOT_RUN，需真实执行后附日志。
- AI5-10：[验证记录](verification.md)、[审阅输入](joint-delivery/review-input.json)、[限制表述](joint-delivery/report-wording.md)、[交接与原负责人状态](handoff.md)。M10/M1 未签名。
- [原始文本证据及 SHA256](evidence/joint-v1/FILES.sha256.json) 包含首轮失败和续验成功，不附运行时 SQLite/权重/缓存/凭据。
- 数据/许可/划分/失败样例：原 M7 四份文档、data-hashes.json 与 M8 来源登记/价格规则/信誉风险资产保留；不虚报 M8 AI5-05～07 专项完成。

最终包需保留代码 Git SHA、包 SHA256、已知限制、当前确认状态；无 .git 的 ZIP 供阅读和转交，独立验收必须从 Git 检出。只有实际阶段版本经 M8/M9/M6/M3/M10/M1 依任务确认后才可称正式最终交付。

---

## 原 M7 个人交付清单（历史原文）

# 本次个人任务交付清单

范围：AI5-01、AI5-02、AI5-03、AI5-04；日期 2026-10-17；准备分支 `prep/m7-p5-search-reproducibility`。

| 任务 | 交付物 | 支持材料 | 当前结论 |
| --- | --- | --- | --- |
| AI5-01 | search-release-manifest.md | release-inventory.json、上游固定快照 | 版本与消费者出处已整理；正式页面/服务版本核对待完成 |
| AI5-02 | search-data-documentation.md | data-hashes.json、实际复核表检查 | 可从合成 raw 重建；许可团队接收、逐条复核归档及封存待完成 |
| AI5-03 | search-reproduction-guide.md | verification.md、evidence/author-reproduction-v1～v3 | 分步命令与作者实跑；M10 最终干净安装/阶段复现待完成 |
| AI5-04 | search-limitations.md | limitations-audit.json、首次编码实测、完整候选回归 | 原始失败与 NO_GO 保留；评分不是成交概率；正式接收待完成 |

仓库中基线与候选来自不同完整提交，不能将准备代码或导出 ZIP 称为最终已验收版本。数据/模型/测试集/权重/门槛未更改。AI5-04 已交付；没有替 M8 或共同任务签署完成。

2026-10-17 续验：网络权限恢复后，v3 基线完整 verify 和真实服务 smoke 均 PASS；limitations-v1 完整候选 verify PASS。前三项原有失败记录保留，正式 M10/M1 验收状态不变。
