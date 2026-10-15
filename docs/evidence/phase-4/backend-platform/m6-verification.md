# M6 Phase 4 验证记录

日期：2026-10-15；作者自测，非团队签字。
任务：BP4-03、BP4-04、BP4-05、BP4-06、M5交接H4-02。
基线提交：`9ceddb1cc2d90f9f587b88017e92b043630e0f1d`。
分支：`task/m6-p4-ai-orchestration` → `phase4/backend-integration`。
本地工作目录：`C:\Users\12512\Desktop\软工\CampusLoop-M6-P4`。
实现文件及SHA256见同目录 `evidence/m6-source-sha256.json`；本记录对应该文件列出的内容。
最终评审提交号由提交者在PR记录，合并后由M5登记冻结SHA。

## 环境和实际结果

Windows / PowerShell，Python 3.13.7，独立 `.venv`，依赖来自 `backend/requirements.txt`；
项目CI仍使用仓库规定的环境，本机结果不替代CI。未检测到可用Docker和PostgreSQL。

| 检查 | 实际结果 | 证据边界 |
|---|---|---|
| 后端全量 pytest | **36 passed / 42 skipped / 1 warning**，22.48秒 | 42项因PostgreSQL不可达跳过；不能当作通过 |
| M6编排单元/RPC故障 | 27项通过，计入上行36 | 包含真实loopback HTTP非JSON、1.5秒阻塞超时，以及假的DB会话下五次终止 |
| 后端 ruff check / format | 通过；77 files already formatted | 静态检查 |
| H4-02专项契约回归 | 7项通过 | note/键空白、覆盖终态/带时区时间、管理员相对证据、普通DTO、SDK入口、价格状态 |
| 统一契约结构检查 | 64 operations / 9 enum-contracts / 16 schema-examples，通过 | 不等同于实际接口授权测试 |
| M7 baseline unittest | 31项通过 | 已合入规则基线，不是Phase4语义模型 |
| M8 baseline unittest | 17项通过 | 冻结规则服务 |
| M8 phase4 unittest | 17项通过 | 不代表价格模型准入通过，现有NO_GO继续有效 |
| 前端 sdk:check | 通过 | 生成SDK及TypeScript编译 |
| 前端 test:transaction | 8个Mock场景通过 | 不是真实浏览器E2E |
| 前端 lint / build | 通过 | 构建有既有大于500kB包体提示，无构建失败 |

机器报告：`evidence/m6-backend-tests.xml`，保存实际逐项通过/跳过结果。
唯一warning来自Starlette/AnyIO弃用提示。

## 复验命令

仓库根目录，已安装Python、Node/npm：

```powershell
python -m venv .venv
./.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
./.venv/Scripts/python.exe -m unittest discover -s scripts/m6_phase4 -v
./.venv/Scripts/python.exe scripts/m6_phase2/check_contract.py
./.venv/Scripts/python.exe -m unittest discover -s services/m7_baseline/tests -v
./.venv/Scripts/python.exe -m unittest discover -s services/m8_baseline/tests -v
./.venv/Scripts/python.exe -m unittest discover -s services/m8_phase4/tests -v
cd backend
../.venv/Scripts/ruff.exe check .
../.venv/Scripts/ruff.exe format --check .
../.venv/Scripts/python.exe -m pytest -ra --junitxml=../docs/evidence/phase-4/backend-platform/evidence/m6-backend-tests.xml
cd ../frontend
npm ci
npm run sdk:check
git diff --exit-code HEAD -- src/sdk/generated/
npm run test:transaction
npm run lint
npm run build
```

SDK漂移比较须在已提交的最终PR检出上运行；未提交版本与HEAD不同是预期。
上面完整安装命令仅供干净检出，已有依赖可直接执行检查。
PyYAML随当前uvicorn[standard]依赖安装；结构脚本另依赖已锁定jsonschema。

## 尚未完成的外部验收

1. M9提供独立PostgreSQL/Redis/MinIO，按 `.github/workflows/ci.yml` 的测试服务与迁移设置，复跑42项DB测试，必须观察真实执行而非skip。
2. M9验证多Worker锁、崩溃重投、结果/通知原子性、升级回滚；本机没有对应真实环境证据。
3. M7/M8确认字段、版本和降级语义；M2/M3验证新SDK可消费。
4. M10从阶段集成SHA执行正常/重复/乱序/超时/越权及关闭模型后的真实MVP浏览器E2E。
5. 至少一名M5/M9交叉评审；M5补小组交付记录，M1确认冻结范围。

上述接收动作、Owner及核对时间见 `m6-handoff.md`。当前只能认定本地实现及已执行检查完成，不能关闭Phase4 Issue。
