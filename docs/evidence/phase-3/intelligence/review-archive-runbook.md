# AI3-04 复核记录检查与报告更新

用户已确认 228 对人工复核全部正确；已收到的辅助 CSV 有完整编号，但复核栏仍为空。这份表目前不能生成有效归档。本工具检查填写后的实际记录，不代填真实复核者、理由、时间或裁决，不把用户确认自动转换成 228 条结构化凭证。

## 1. 检查填写后的表

在真实 Git 项目根目录、Python 3.12 的锁定依赖环境执行：

```text
python -m services.m7_baseline.review_archive --review-sheet <填写后的CSV> --check-only
```

支持当前辅助表的 `reviewLabel(2/1/0/U)` 列和原队列的 `reviewLabel` 列。CSV 必须有 228 个唯一 labelId，完整对应原草稿；至少逐行填写真实 reviewer、reviewLabel、reviewReason、带时区的 ISO reviewedAt（如 `2026-10-08T09:00:00+08:00`，这是格式例子）。有争议或裁决时必须填完整 adjudicator/finalLabel/adjudicatedAt，裁决时间不能早于复核时间。

结果列出编号遗漏/重复/未知、逐行字段错误、最终标签与原候选的差异。失败退出 2，成功退出 0。当前实际空表应失败；测试中临时生成的 fixture-only 记录仅供程序测试，不能作为真实人工复核证据。

## 2. 在独立空目录归档

```text
python -m services.m7_baseline.review_archive --review-sheet <填写后的CSV> --output-dir <独立空归档目录> --label-version m7-label-reviewed-v1
```

新 labelVersion 必须与原 `m7-label-draft-v1` 不同。输出保留原字节的 review-records.csv、另存 labels.reviewed.jsonl、完整 review-check.json 与绑定来源和文件哈希的 manifest.json。不会覆盖冻结原资产或已有非空目录。

此次流程只支持用户已确认的“所有原标签正确，无标签改动”。若真实记录出现最终标签差异，先按业务事实裁决并另行版本化数据，工具不会悄悄修改标签或硬条件。`U` 的原语义、整请求排除规则和候选 split 保留。程序只能验证记录结构与一致性，实际人身份及正式批准仍需接收人核验。

## 3. 从归档生成新报告

```text
python -m services.m7_baseline.evaluate --review-archive <归档目录> --output-dir <新的空评估目录>
python -m services.m7_baseline.verify --review-archive <归档目录> --output-dir <新的空验证目录>
```

读取时重新检查 CSV、来源版本、原草稿 SHA256、归档文件哈希、复核标签与记录对应关系；不能只修改 manifest 计数就获通过。有效归档更新 labelVersion、humanReviewedPairs、labelSource 与归档 manifest 哈希。共享指标计算接受 `HUMAN_REVIEWED_UNSEALED`，仍返回 DIAGNOSTIC_ONLY、modelEffectEvaluated=false；不接受将 `HUMAN_REVIEWED` 冒充已批准标签。

不提供 `--review-archive` 时继续使用原草稿，humanReviewedPairs=0、labelSource=PENDING_HUMAN_REVIEW，并明确 status=STRUCTURED_RECORDS_PENDING。这是尚无逐条归档记录的机器计数，不否认用户已完成的人工工作。历史评估目录不覆盖，封存、模型门槛和跨组签字独立保留。

## 4. M10 正式验收来源

导出 ZIP 不含 .git，执行 verify 可能得到 codeCommit=null，只能做本地技术复现。M10 必须从 M1 确认的正式阶段集成提交进行真实 Git 干净检出，输出写在检出外；检查 codeCommit 非空且对应验收提交、workingTreeDirty=false、环境、命令、完整日志和本人结论。不要用导出包替代正式阶段集成提交，也不要用准备分支的作者验证代替 M10 独立验收。
