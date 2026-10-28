# BP5-01 安全回归报告：认证、权限、限流与敏感日志

Owner：M5 胡可铭。任务来源：[Issue #35](https://github.com/Huang0283/CampusLoop/issues/35)。

| 项目 | 值 |
|---|---|
| 个人分支 | `task/m5-p5-security` |
| 目标分支 | `phase5/backend-release` |
| Phase 5 基线 | `ccba7ba39b85de72be7138f9bc0b6eabb50dd030` |
| M5 实现提交 | `59108202148004fb501910e17c8936b38be77b49` |
| 证据摘要 | [`evidence/m5-security-results.json`](evidence/m5-security-results.json) |
| 原始测试清单 | [`evidence/m5-p5-focused-tests.xml`](evidence/m5-p5-focused-tests.xml)、[`evidence/m5-p5-backend-tests.xml`](evidence/m5-p5-backend-tests.xml) |

## 范围

本报告只覆盖 BP5-01：密码/令牌、禁用账号、角色与对象权限、认证限流以及
敏感日志回归。本次没有新增接口、数据库表、迁移或 OpenAPI/SDK 内容。

代码变更是发布边界加固：结构化日志的敏感键匹配先做大小写和分隔符归一化，
并覆盖 cookie、authorization、browser/session token、token hash、API key、
email、content 和 evidence 等派生字段。HTTP 请求日志只记录路由模板、状态和耗时，
不记录请求体、Authorization、cookie 或响应令牌。

## 回归矩阵

| 场景 | 断言 |
|---|---|
| 已存在账号与未知账号使用错误密码 | 均返回 `401 AUTH_INVALID_CREDENTIALS`，不泄露账号是否存在 |
| 同一账号连续错误登录 | 前 5 次为 401，第 6 次为 429，并返回 `Retry-After` |
| 同一来源连续注册请求 | 10 次达到注册窗口后，第 11 次为 429，并返回 `Retry-After` |
| refresh 轮换、重放和并发请求 | 令牌族按数据库锁序列化；重放使族失效，只有一个并发轮换成功 |
| 浏览器会话、CSRF、生产 cookie | 不受信任 Origin 拒绝；生产 cookie 为 HttpOnly、Secure、Host-only |
| 账号禁用 | 现有访问/刷新返回 423；管理员禁用会撤销会话；禁用用户的公开对象不可见 |
| 角色和对象权限 | 普通用户不能访问管理员队列、管理员信誉或证据；对象关系之外的私有媒体返回 404 |
| 日志字段 | JSON/Text formatter 对嵌套敏感字段统一打码；真实 HTTP 登录访问日志不含邮箱、密码、access/refresh token |

## 实际验证

在专用 PostgreSQL、Redis DB15 和 MinIO 双桶环境中，从空库迁移到 `0010` 后执行：

```powershell
.venv/Scripts/python.exe -m pytest backend/tests -q --junitxml=.codex-tmp/m5-p5-backend-full-postcommit.xml
.venv/Scripts/python.exe -m ruff format --check backend
.venv/Scripts/python.exe -m ruff check backend
git diff --check
```

结果：**177 passed，0 failed，0 errors，0 skipped**；Ruff 格式、静态检查和
`git diff --check` 通过。M5 安全聚焦集合（认证、浏览器会话、治理、媒体、日志及
`test_m5_phase5_security.py`）为 **38 passed**。第三方弃用警告来自 Starlette/AnyIO
和 Botocore，没有屏蔽或当作业务失败。JUnit 仅保留测试用例和结果，已移除本机主机名。

环境版本：Windows Docker Engine 29.8.2；PostgreSQL 16.15；Redis 7.4.11；
仓库固定源码构建的 MinIO；Python 3.12.10；pytest 8.3.4；Ruff 0.8.4。
测试账号、令牌、对象和密钥只写入本次专用容器，不进入提交包。

## 接收边界

M5 自检证明当前提交中的认证、权限、限流和日志行为。M6/M9 需要在同组分支合并后
交叉复核；M10 需要从阶段集成提交独立重跑；M1 负责范围、遗留项和最终发布包确认。
本报告不代替这些签字，也不宣称整个 Phase 5 已完成。
