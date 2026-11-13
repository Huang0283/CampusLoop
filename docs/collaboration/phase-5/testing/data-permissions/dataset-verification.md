# 数据包核验结果

本轮针对 PR #142 应用软件 `3b0b333af6ae5a26272ef62b3954f14e293b56d6`，不以日常 main 代码替代被测软件。测试/脚本与文档修复在 `fix/pr142-runtime`；未合并。

| 范围 | 实际结果 | 证据 |
|---|---|---|
| 九类 JSON 数量/字段/配额/引用 | 通过 | verify_data.py 静态报告 |
| 8 个正常图与 12 定义清单 | MIME/尺寸/许可/源 SHA256 通过 | media-manifest.csv |
| 20 个模拟响应 | OpenAPI DTO/分页/错误信封通过 | response-contract.json；MOCK_RESPONSE 标签 |
| 24 价格、12 信誉风险 | 直接规则检查通过 | 明确 M8 输入映射和依据；不是独立模型评估 |
| 24 非法请求定义 | 22 个由 Pydantic 拒绝；2 个仅定义语义前置 | 未伪称 24 个真实 API 拒绝 |
| 真实导入 | 每空间 8/60/12，拒绝 0，阻塞 0 | runtime-evidence.json |
| 两次 setup | 对应表行数与 ID 不变 | runtime-evidence.json idempotency |
| 真实回读/30 关键词查询 | 通过 | runtime-evidence.json stages |
| 复位/隔离 | 默认预览不改；apply 仅处理本空间；另一空间哈希不变 | runtime-evidence.json resetIsolation |
| 36 权限用例 | 未执行 | execution-log.csv 保留原状态 |
| 3 个服务不可用传输场景 | 未执行 | trust-risk-checks.json 标注 transport |

复位保留账号、已上传对象和审计/幂等历史；这是显式部分清理，exit 2。独立成员复核、T2 前置配方及 browser desktop/mobile/刷新持久化授权旅程仍待交接。缺图/改图、错误枚举、遗漏数据族、日常环境和跨环境 manifest 的拒绝由 test_package.py 验证。只在新变更影响这些内容时扩大测试，不把构建通过当作业务通过。

缺少管理员的降级导入亦已实测：6 个普通账号、60 件商品、12 条求购，setup/verify 均明确列出 R/S 和 Z 禁用阻塞并 exit 2。首次遇到 429 的失败及随后仅重置独立审计 Redis auth 计数的恢复记录保留于 runtime-evidence-blocked.json；脚本不绕过限流。最终 9 项单元检查和统一 Ruff 检查通过，摘要见 package-execution-log.csv。
