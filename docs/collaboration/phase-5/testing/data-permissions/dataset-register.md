# T1 数据资产登记

数据包：`cl-functional-v1`。全部为明确标识的虚构功能输入，未作为真实商城商品、实际交易结果或正式模型评估数据。

| 文件 | 输入数量 | 定义与来源 |
|---|---:|---|
| accounts.json | 8 | A/B/C/D/E/Z 为 USER；R/S 为外部初始化 ADMIN；无提交凭据 |
| products.json | 60 | 六类各 8 个基础输入，成色各 2；价格 0.01/10/25/50/100/200/500/1000；每类 4 件单图、4 件双图；另 12 件交易前置 |
| wanted.json | 12 | 8 OPEN/4 通过关闭接口变 CLOSED；+7d 运行时转换 |
| invalid-inputs.json | 24 | 22 个模型拒绝定义，2 个语义拒绝定义；有字段、依据、前置及用例映射 |
| mock-responses.json | 20 | MOCK_RESPONSE；完整 DTO/错误信封；OpenAPI 快照验证 |
| search-checks.json | 30 | 六类各精确/同义/用途/过滤/无答案；区分关键词预期与语义候选 |
| price-checks.json | 24 | 每类正常/边界/不足/非法；映射 M8 分类、成色、整数分 |
| trust-risk-checks.json | 12 | 四组各 3；M8 events/risk 输入；无有效交易中立 3.5 |
| scenario-inputs.json | 12 | S01–S12 对应 P049–P060；T2 创建真实业务前置 |
| media-manifest.csv | 12 | 8 张 CC0 自制图（4 JPEG/4 PNG）；4 个本地生成拒绝文件定义 |

图片源代码与许可见测试目录 `generate_media.py`、`media/LICENSE.md`；不是外部照片。源图 SHA256/MIME/字节数逐个登记；API 归一化后的 JPEG 哈希另存私有运行清单。地点统一为“校内”。

软件 SHA：`3b0b333af6ae5a26272ef62b3954f14e293b56d6`。实际导入/拒绝/阻塞数量以 `runtime-evidence.json` 为准，静态行数不代表执行成功数。对应 PR #142，目标 `team/testing`，未合并 main。
