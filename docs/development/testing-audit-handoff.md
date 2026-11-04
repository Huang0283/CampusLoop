# 给 T1 / T2 / T3 的独立测试环境

这是各组员在自己电脑启动的环境，不是让别人访问 M10 电脑的 `127.0.0.1`。每人需要 Docker Desktop/Engine、Compose 2.24.4+、Python 3.12；网页另需 Node.js 22+。第一次构建需联网获取镜像/依赖。Windows 使用 PowerShell，命令在源码根目录执行；收到压缩包先完整解压，进入 `source/`。

## T2 先这样开始

```powershell
py -3.12 -m venv .codex-tmp/runner
& ./.codex-tmp/runner/Scripts/Activate.ps1
python -m pip install -r backend/requirements.txt
python scripts/audit_env.py start --namespace business --run-id run1
npm ci --prefix frontend
python scripts/audit_env.py ui --namespace business --run-id run1
```

最后一条会持续运行，在第二个终端执行，保持窗口开启。浏览器打开 `http://127.0.0.1:5184/login`，R/S 登录后进入 `/admin`；普通买家卖家由 T1 数据脚本注册。后台页面、订单、举报和商品都来自真实 API，没有 Mock。

| 接收人 | namespace | API | 网页 | 公共图片端口 |
|---|---|---|---|---|
| T2 业务测试 | `business` | `http://127.0.0.1:18024` | `http://127.0.0.1:5184` | `19024` |
| T1 权限测试 | `permission` | `http://127.0.0.1:18025` | `http://127.0.0.1:5185` | `19027` |
| T3 环境恢复 | `environment` | `http://127.0.0.1:18026` | `http://127.0.0.1:5186` | `19026` |

T1/T3 把命令中的 `business` 换为自己的 namespace。不同 namespace 有独立 Docker 网络、PostgreSQL、Redis 实例、媒体桶及卷。Redis 均使用各自实例的 DB15；数据库/Redis 不发布宿主端口。API/媒体只绑定 `127.0.0.1`。

## 账号密码在哪里

首次启动自动生成两个不同的真实管理员 R/S，只在受审种子脚本中初始化，不通过注册接口提升角色。启动结束同时验证两个账号可以真实登录并读取管理 API。

以 T2 为例，私有文件在：

- `.codex-tmp/audit/business/run1/admins.json`：R/S 的邮箱、随机密码；只在本机打开，不上传 GitHub、群聊、CSV、截图或执行日志。
- `.codex-tmp/audit/business/run1/connection.json`：实际 API/网页、容器名、数据库名、Redis DB、两个媒体桶、R/S 真实 ID、软件 SHA。交接环境信息以此文件为准。
- 同目录 `private-config.json`、`.env.audit`：仅本环境的数据库、存储和签名密钥，不能分享。

R 的邮箱形如 `t1-business-run1-r@example.invalid`，S 为同前缀的 `-s@example.invalid`，密码以本机 `admins.json` 为准。它们不是文书组 R1/R2 的账号。已有账号若角色、状态或密码不匹配，脚本拒绝继续，不重置密码或把普通用户升成管理员。重复启动不会换密码、重建业务数据或清空卷。

## 接 T1 的数据包

T1 数据材料采用 `work/testing/data-permissions` 的文件；本环境不替代其用例和执行证据。交接包的 `source/` 中已叠加注明来源的 T1 数据目录及执行日志模板，从 `source/` 执行下面命令。单独使用本环境分支时，还需接收 T1 对应文件，不能把缺材料记成环境通过。

```powershell
$t1 = 'tests/collaboration/phase-5/data-permissions'
$runtime = '.codex-tmp/audit/business/run1'
$envInfo = Get-Content "$runtime/connection.json" -Raw | ConvertFrom-Json
$target = @('--api', $envInfo.api, '--container', $envInfo.container,
            '--namespace', 'business', '--run-id', 'run1',
            '--state-dir', "$runtime/data-state")
python "$t1/setup_data.py" @target --admins "$runtime/admins.json" --admin-search
python "$t1/setup_data.py" @target --admin-search
python "$t1/verify_data.py" --live @target
```

数据脚本需要 Python 3.12 及 `backend/requirements.txt` 中的依赖。新终端要再次激活上述虚拟环境。若 PowerShell 不允许激活，可直接用 `./.codex-tmp/runner/Scripts/python.exe` 替代命令中的 `python`，不需要修改执行策略。Linux/macOS 用 `python3.12 -m venv .codex-tmp/runner` 和 `source .codex-tmp/runner/bin/activate`。

`--admin-search` 使用 PR #148 增补版；该版本为 70 件商品（原 60 + 10 件搜索边界商品），仍为 8 个账号和 12 条求购。不用该参数则为 60 件；同一批次不能中途切换该参数。随包 `response-contract.json` 按 main 的 OpenAPI 重新生成并校验；已核对的字段变化是面交时间从通用 `time` 改为校内本地时间 `HH:MM` 格式约束。T1 脚本另补 Windows 状态文件短暂占用时的有限重试，不改变业务数据和预期结果；准确提交和适配差异见包清单。

首次导入应无 R/S 或 Z 禁用阻塞。第二次导入应保持实际 ID 和数量不变，验证写明真实结果。T1 的静态校验要在包含源码和材料的完整检出目录执行；不要把移动目录造成的找不到源码当成应用缺陷。随包材料保留原提交和目录，具体来源见包的交接清单。

数据脚本会检查容器实际配置、软件 SHA 标签、审计数据库、Redis DB15、媒体桶和管理员前缀。不能借用其他 namespace 的账号，也不能把 API 地址改成日常 8001。R/S 初始化由 M10 脚本负责，T1 脚本继续只用正常 API 创建商品、求购、举报和交易前置。

## 停止、重启与新批次

```powershell
python scripts/audit_env.py status --namespace business --run-id run1
python scripts/audit_env.py stop --namespace business --run-id run1
python scripts/audit_env.py start --namespace business --run-id run1
```

`stop` 只停止本批次容器，保留所有卷。启动脚本没有删卷、清库或“重置全部”选项；日常 `campusloop-local` 项目不受影响。T3 的破坏性恢复测试使用自己的 `environment`，不要停别人的服务。

`status` 会检查容器、初始化缺失的 R/S，并实际登录/退出确认权限，因此会产生本测试环境的认证记录。它不会重置既有账号或重建商品。

代码版本改变、数据被交易流程修改、或已执行过有状态清理时，保留旧记录并用新的 `--run-id run2`；同 namespace 默认端口相同，先停止旧批次和旧网页终端。新批次会生成新的 R/S，不能继续借用 run1 的凭据。启动脚本拒绝用脏工作目录冒充原 SHA；源码包则核验清单哈希后启动。

## 组员怎么交回结果

回复 M10/T2：岗位、软件 SHA（`connection.json`）、T1 材料 commit、namespace/runId、环境信息文件、导入及二次导入结果、通过/失败/阻塞/未执行，以及失败用例与脱敏证据链接。密码和令牌留在本机。环境启动成功不代表 T1/T2 的全部用例通过；原先阻塞的后台用例需要各自真正执行。

新增通知/警告/禁用/申诉流程参考 `docs/development/account-moderation.md`；T1 测受限身份与越权，T2 测通知→申诉→复核→结果回看，T3 测断网重试及重启后记录保留。此说明不把新增测试算进旧的通过数量。
