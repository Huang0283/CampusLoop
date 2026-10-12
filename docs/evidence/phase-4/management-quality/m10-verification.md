# M10 Phase4 验证索引
独立搜索+匹配38请求两次真实模型推理、全/开发/候选测试三套指标重算及独立公式复核PASS；正式结论NO_GO。
M7候选单元33/33通过；Windows完整verify失败，Linux候选基线31/31通过。当前main M8规则17/17、固定9/9且重复一致（m8-rule-verification）。
后端37/37通过；模型关闭8/8通过；M2 PR94 UI5+6通过且CI已通过。
RPC真实故障诊断18项13PASS/5FAIL；报告与原始JSON不允许修改成伪PASS。M7/M8坏结构/JSON缺陷是P1，最终冻结阻塞。
脚本：archive_evaluation.py、check_archived_evidence.py、probe_rpc_degradation.py；文档：independent-ai-evaluation.md、ai-degradation-test-report.md、mvp-regression-report.md。
共用冻结计划、演示、接收清单由M1任务分支另交付；M10 PR不关闭#33，不代签M1/同组Review/真实汇报。这里只提交合成模型评估与脱敏故障结果，不提交SQLdump、私密图片或模型权重。
当前GitHub OAuth凭证没有workflow scope，不能新增证据CI工作流；不修改账号授权。本PR保留离线证据核对命令，现有CI仍检查原有后端/SDK/前端与旅程。手动证据核对已通过，不能声称新增自动门禁已经上线。
