# 第三阶段集中实现候选

关联Issue #24、#25、#26、#27，不使用自动关闭关键词，正式验收后由阶段收口PR关闭。

## 任务与范围

- FE3-01—12：真实SDK、安全cookie恢复、权限路由、市场/上传/求购、聊天恢复、报价/订单/约定/双方完成、评价举报通知、Mock隔离及页面状态。
- BP3-01—12：Argon2/JWT/族撤销、对象权限与审计、真实市场交易API、WS/私图、原子接受/确认/评价、索引/批量查询、迁移0008、Docker/seed/日志与测试环境。
- AI3-01—10：M7/M8规则服务及权威业务适配、PostgreSQL outbox/current/通知去重与恢复、规则价格/中性信誉/缺失风险解释、固定评估与复现。
- MQ3-01—08：需求追踪、里程碑/风险、双账号/并发/权限/恢复测试、缺陷与演示、候选发布及人工验收文档。

用户批准浏览器HttpOnly安全恢复（短access仅内存、Origin+CSRF、七天绝对期限、生产Secure/__Host-）及first-pair-v1（仅求购发布者，同wanted/product一次，失效不新增）。原Phase2设计增加明确修订，不重写历史测试。用户集中实施，原成员任务ID保留，不伪造成员PR或Review。

## 验证

后端37实际测试（无skip）、ruff格式/静态检查；M7 31/M8 17；规则9/9和字节一致；OpenAPI61操作/16样例及生成SDK无drift；frontend lint/build；历史Mock8场景单列；真实浏览器5场景29.2秒，含私图、失败重试、离线恢复、安全重载/退出、短令牌自动恢复与跨标签切换账号拒绝旧操作重试；独立空库upgrade0008→downgradebase→upgrade0008→seed两遍幂等；最终Docker源码镜像复验。

cb07c47远端CI的后端/智能/迁移/SDK/lint/build成功，浏览器刷新检查因UI127.0.0.1与APIlocalhost跨站导致Strict Cookie无法恢复；a24bbef已统一CI测试域名。最新远端成功与否以Checks实际结果为准；本机通过不替代远端结果。

精确代码提交与实际结果：docs/evidence/phase-3/management-quality/verification.md。启动与手动地址：start-phase3.md；用户本人M10陈梓弘验收清单：m10-manual-acceptance.md。

## 未关闭门禁

用户尚未完成独立验收签字；M7已获用户228对标签正确的确认，但实际逐条复核CSV尚未归档，fixed38查询仍DIAGNOSTIC_ONLY，不作为正式封存模型效果；课程实际汇报日和前置阶段/正式阶段发布需M1确认。

没有压力测试/SLA结论、真实学籍/线上支付/设备指纹；规则风险不自动处罚。旧部署公开chat/evidence如存在须迁私桶清公共副本；本机新演示库通过不代表旧部署安全。包体积warning已登记，未伪称全部优化。

先供技术审查，不提前合main/创建正式标签。GitHub Checks通过也不替代真人验收。
