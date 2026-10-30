# T1 数据与权限测试包（Phase 5）

## 1. 数据包标识

- 名称：`cl-functional-v1`
- 阶段：Phase 5
- 负责人：T1
- 软件 SHA：待 M10 通知后补全

## 2. 目录与文件说明

本目录包含系统测试所需的全部虚构数据：

- `accounts.json`：8 个账号配置（6 普通用户，2 管理员）。
- `products.json`：60 条商品输入数据，覆盖 6 个分类和各类边界。
- `wanted.json`：12 条求购数据，包含 OPEN 和 CLOSED 状态。
- `invalid-inputs.json`：24 条非法或边界输入，用于测试系统防御。
- `mock-responses.json`：20 份 HTTP 模拟响应（待补充）。
- `search-checks.json`：30 条搜索查询及预期匹配的商品。
- `price-checks.json`：24 条价格建议输入的预期行为。
- `trust-risk-checks.json`：12 条信誉与风险事实样例。
- `media/`：12 个媒体文件（包含正常与非法文件）。
- `media-manifest.csv`：媒体文件清单与说明。
- `generate_invalid_media.py`：生成本地非法媒体文件的脚本。
- `setup_data.py`：导入数据到测试库。
- `reset_data.py`：清理本次导入的数据。
- `verify_data.py`：核对导入结果与完整性。
- `scenario-inputs.json`：12 个业务场景（S01-S12）所需的前置输入。

## 3. 使用前提

在执行脚本前，需确保：
1. 后端 API 已启动（本地通常为 `http://127.0.0.1:8001`）。
2. 测试库已就绪（切勿写入每日日常库 `campusloop-local`）。
3. 具有管理员权限的初始化账号或 Token（向 M10 获取）。
4. 普通测试账号的密码在运行时由脚本随机生成，不写入文件，不提交到 Git。

## 4. 运行命令

### 4.1 导入数据

运行：
```powershell
python tests/collaboration/phase-5/data-permissions/setup_data.py --namespace permission