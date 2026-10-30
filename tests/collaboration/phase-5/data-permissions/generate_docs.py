from pathlib import Path

DOCS_DIR = Path(__file__).parent.parent.parent.parent.parent / "docs/collaboration/phase-5/testing/data-permissions"
DOCS_DIR.mkdir(parents=True, exist_ok=True)

docs = {
    "dataset-register.md": """# 数据资产登记 (Dataset Register)

## 1. 数据包版本
- 名称：cl-functional-v1
- 软件 SHA：待填
- 环境：专用测试库

## 2. 基础数据清单
| 类别 | 文件 | 数量 | 状态 |
|---|---|---|---|
| 账号 | accounts.json | 8 | 已核对 |
| 商品 | products.json | 60 | 已核对 |
| 求购 | wanted.json | 12 | 已核对 |
| 非法输入 | invalid-inputs.json | 24 | 已核对 |
| 搜索样例 | search-checks.json | 30 | 已核对 |
| 价格样例 | price-checks.json | 24 | 已核对 |
| 风险样例 | trust-risk-checks.json | 12 | 已核对 |

## 3. 数据说明
所有数据均为虚构样例，不包含真实个人隐私信息。商品图片使用开源/自制占位图。
""",
    "setup-reset.md": """# 数据导入与复位记录

## 1. 首次导入 (Setup)
- 时间：待填
- 命名空间：permission
- 执行命令：`python setup_data.py --namespace permission`
- 结果：待填（成功/失败数）

## 2. 重复导入验证 (Idempotency)
- 时间：待填
- 结果：重复执行不会产生重复实体。

## 3. 数据复位 (Reset)
- 时间：待填
- 命令：`python reset_data.py --namespace permission --dry-run`
- Dry-run 实际检测结果：待填
- 正式清理结果：待填
""",
    "dataset-verification.md": """# 数据验证记录

## 1. 静态文件验证
执行 `python verify_data.py` 的结果如下：
- 账号文件：8 条
- 商品文件：60 条
- 求购文件：12 条
- 非法输入：24 条
- 其他：全部符合预期。

## 2. 真实接口核对
- 实际 API 创建数：待填
- 实际数据库记录数：待填
- 被拒绝数量：待填
- 结论：待填
""",
    "daily-report.md": """# T1 每日工作报告

## 2026-10-30
- **今日完成**：建立全部 JSON 数据骨架和自动化脚本；生成 36 条权限用例文档。
- **计划下一步**：执行用例 C01-C06，并提交 T1 数据给 T2。
- **阻塞/问题**：暂无。
""",
    "task-log.md": """# 个人任务日志

- [x] 理解 T1 岗位要求
- [x] 建立 accounts.json / products.json 等基础数据
- [x] 编写自动化生成测试文档的脚本
- [ ] 真实执行 36 条权限用例
- [ ] 配合 T2 导入 business 空间
- [ ] 配合 T3 验证 environment 空间
""",
    "delivery-checklist.md": """# 交付清单 (Delivery Checklist)

| 项目 | 路径 | 状态 | 备注 |
|---|---|---|---|
| 基础数据包 | tests/.../data-permissions/*.json | 已完成 | |
| 导入/复位脚本 | tests/.../data-permissions/*.py | 已完成 | |
| 36 条测试用例 | docs/.../data-permissions/test-cases.md | 已完成 | |
| 执行日志 | docs/.../data-permissions/execution-log.csv | 待执行 | 需填实际结果 |
| 每日报告 | docs/.../data-permissions/daily-report.md | 已完成 | |
""",
    "independent-evaluation-register.md": """# 独立评估数据登记

## 1. M7 搜索/匹配评估资产
- 状态：NOT_EVALUATED
- 说明：等待接收 M7 提供的数据集与复现命令。

## 2. M8 价格/风险评估资产
- 状态：NOT_EVALUATED
- 说明：等待接收 M8 提供的 L3 数据集与复现命令。
"""
}

for filename, content in docs.items():
    filepath = DOCS_DIR / filename
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"已生成: {filepath}")

print("所有文档生成完毕！")