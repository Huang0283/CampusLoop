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
