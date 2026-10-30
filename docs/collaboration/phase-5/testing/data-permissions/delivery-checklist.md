# T1 交付清单

| 交付项 | 当前状态 | 证据/未完成原因 | 接收方 |
|---|---|---|---|
| 九类 JSON / 图片 / 哈希许可清单 | 静态验证通过 | tests/collaboration/phase-5/data-permissions；软件 SHA 见 runtime-evidence.json | T2/T3 |
| setup / verify | 独立环境实测通过 | 每空间 8/60/12；两次无重复；owner 上传；真实回读 | T2/T3 |
| reset | 支持部分操作；关联清理阻塞 | 默认 dry-run；账号/媒体/history 无安全删除 API，exit 2 | M10/T3 |
| 36 权限用例 | 定义修正；执行未完成 | execution-log.csv 仍 36 条未执行；部分需 T2 前置 | T1/T2 |
| 22 模型拒绝 / 2 语义拒绝定义 | 模型检查通过；语义 API 未执行 | 不把 schema 校验计成真实 API 拒绝 | T1 |
| 不可用服务 / 浏览器完整旅程 | 未执行 | 需受控环境与 desktop/mobile 检查 | T1/M10 |
| 静态校验 CI | 已接入本 PR | GitHub T1 fixture package 状态以 PR checks 为准 | M10 |
| 独立成员 Review / T2 独立导入 | 待接收人执行 | 本轮自动化不能冒充成员签收 | M10/T2/T3 |
| 合并 | 未合并 | PR #142 base 为 team/testing；未合入 main | M10 |
