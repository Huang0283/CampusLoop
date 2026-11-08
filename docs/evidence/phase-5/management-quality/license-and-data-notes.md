# 依赖、数据和许可说明

日期 2026-10-25，候选源码 `50108a3`。`licenses/npm-installed-inventory.json` 是 302 项已安装 npm 包的元数据；`licenses/python-installed-inventory.json` 是后端镜像 importlib.metadata 采集结果。许可证字段缺失、复合表达式和截断说明必须回到上游原文确认，清单不是法律审核或自动授权。

代码来源以 Git 历史、锁文件、各模块文档及原始许可证为准。Docker 基础镜像与固定 MinIO 源码 tag 见 Dockerfile/Compose；第三方组件分发应保留对应许可和署名，不能用本项目未来许可覆盖第三方许可。

本次没有找到根 LICENSE，不自行替团队选开源协议；未经确认不能承诺可以任意分发。M1 需确认团队代码许可及课程/公开提交范围。模型权重不打入候选包，模型/数据来源及限制见智能组 data-documentation、release-manifest 与 human-review 资料。

M7 测试候选不是封存独立测试；M8 只有 L0 合成演示数据，0 条 L3 真实完成交易。合成数据不能表述成真实用户交易。后续采集须经同意，去标识化并确认用途和再分发权限；禁止把真实邮箱、私聊、见面和举报证据打包。

本组运行使用独立数据库和虚构账号；不提交 .env、数据库 dump、运行媒体、模型缓存/权重和 node_modules。候选打包仅进行常见密钥模式扫描及白名单排除，不能替代团队人工隐私/许可审核。审批未提供，licenses_reviewed 保持 false。
