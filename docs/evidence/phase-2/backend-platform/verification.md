# BP2 后端平台验证记录

本文件按 M5、M9 分章保留各自交付与证据。个人记录不代表后端小组联合验收完成。

## BP2 M5 文档验证记录

执行人：M5（AI 辅助）｜日期：2026-10-08（Asia/Shanghai）。本文件只记录文档检查，不代表 API、数据库、浏览器或独立安全验收通过。

### 1. 环境与范围

- Windows、PowerShell 7.6.5、Git 2.53.0.windows.2、Python 3.12.10。
- 分支：`task/m5-p2-auth-contracts`；基线：`c3a49290bf29cd54c1b569ed7a08dbd175891913`。
- 输入版本见 [contract-signoff.md](contract-signoff.md)；交付清单见 [deliverables.md](deliverables.md)。
- 实际交付提交：以个人 PR head / `git log -1 --format=%H -- docs/evidence/phase-2/backend-platform` 获取，避免在提交内写自引用的错误 SHA。

### 2. 可复现检查

从仓库根目录 PowerShell 执行。使用标准库，无额外依赖；检查 UTF-8、相对文件链接、表格/围栏、JSON 样例、公开与私有响应白名单、任务/场景编号和改动所有权。外部链接不做网络可达性保证；输入提交已通过 git show 和 GitHub API 读取核对。

```powershell
@'
from pathlib import Path
import json
import re
import subprocess

root = Path('docs/evidence/phase-2/backend-platform')
names = ['auth-contract.md', 'auth-openapi-input.md', 'auth-security-design.md',
         'contract-signoff.md', 'deliverables.md', 'handoff.md', 'verification.md']
texts = {}
links = examples = 0
public = {'id', 'nickname', 'avatar', 'rating', 'transactionCount'}
private = public | {'role', 'status', 'email', 'campusVerified', 'bio', 'school',
                    'college', 'major', 'tradeCount', 'creditLevel'}
for name in names:
    path = root / name
    text = path.read_text(encoding='utf-8', errors='strict')
    texts[name] = text
    assert '\ufffd' not in text, (name, 'invalid encoding')
    fence = None
    columns = 0
    for line in text.splitlines():
        if line.startswith('```'):
            fence = None if fence is not None else line[3:]
            columns = 0
            continue
        if fence is not None:
            continue
        assert line == line.rstrip(), (name, 'trailing whitespace')
        if line.startswith('|'):
            count = line.count('|')
            assert not columns or count == columns, (name, line)
            columns = count
        else:
            columns = 0
        for target in re.findall(r'\]\(([^)]+)\)', line):
            if target.startswith(('http://', 'https://', '#')):
                continue
            assert (path.parent / target.split('#')[0]).is_file(), (name, target)
            links += 1
    assert fence is None, (name, 'unclosed fence')
    for block in re.findall(r'^```json\n(.*?)\n```', text, re.M | re.S):
        item = json.loads(block)
        examples += 1
        assert isinstance(item, dict)
        assert not re.search(r'"(?:password_hash|token_hash|signingKey)"', block)
        if item.get('code') == 0:
            assert set(item) == {'code', 'message', 'data'}
            data = item['data']
            if 'accessToken' in data:
                assert set(data) in ({'accessToken', 'refreshToken', 'expiresIn'},
                    {'accessToken', 'refreshToken', 'expiresIn', 'user'})
                assert 0 < data['expiresIn'] <= 900
                assert data['accessToken'].startswith('EXAMPLE_')
                assert data['refreshToken'].startswith('EXAMPLE_')
                if 'user' in data:
                    assert set(data['user']) == private
                    assert data['user']['tradeCount'] == data['user']['transactionCount']
            else:
                assert set(data) in (public, private)
                if set(data) == private:
                    assert data['tradeCount'] == data['transactionCount']
        elif 'code' in item:
            assert set(item) == {'code', 'message', 'details', 'requestId'}
            assert isinstance(item['code'], str)
            assert 'password' not in block and 'EXAMPLE_' not in block
contract = texts['auth-contract.md']
operations = re.findall(r'^\| (POST|GET|PATCH) (/[^ |]+) \|', contract, re.M)
assert len(operations) == 7 and len(set(operations)) == 7, operations
ids = re.findall(r'^\| (A\d{2}) /', texts['auth-security-design.md'], re.M)
assert ids == [f'A{n:02}' for n in range(1, 19)], ids
assert 'BP2-01' in contract and 'BP2-02' in texts['auth-security-design.md']
assert 'BP2-11' in texts['contract-signoff.md']
# 按已同步的共享基线检查 M5 PR 差异，避免把已合并的 M9 文件误算为 M5 修改。
base = '811e6249c5859f3d894de7014c0536ade73cdc71'
changed = subprocess.check_output(['git', 'diff', '--name-only', base], text=True).splitlines()
allowed = {f'{root.as_posix()}/{name}' for name in names}
assert set(changed) <= allowed, changed
subprocess.run(['git', 'diff', '--check', base], check=True)
print(f'PASS: files={len(names)} local_links={links} json_examples={examples} operations=7 scenarios=18')
print('PASS: changed tracked files are within M5 document ownership')
'@ | python -
if ($LASTEXITCODE -ne 0) { throw 'M5 document validation failed' }
git diff --cached --check
git status --short --branch
```

### 3. 实际结果

2026-10-08 执行上方 Python 检查，退出码 0，实际输出：

```text
PASS: files=7 local_links=24 json_examples=17 operations=7 scenarios=18
PASS: changed tracked files are within M5 document ownership
```

随后暂存相同七个文件并复跑，检查通过；`git diff --cached --check` 无错误输出。暂存范围仅为本目录七个 Markdown 文件，没有 canonical OpenAPI、生成 SDK、后端代码、迁移、种子、Compose 或 CI 变化。

人工文档走查结论：七个操作均有权限/输入/响应/失败分支；成功、校验错、凭据错、过期、禁用、越权均有样例；本人/公开字段集合分开；退出/禁用/轮换/重放的会话范围与 A01～A18 一致。检查时补齐了 415/来源 403 声明、refreshToken 长度及单有效后继部分唯一索引要求。

认证契约中的响应为虚构样例，A01～A18 为待实现后执行的测试预期。没有实际 API 失败日志/截图，因为本次未运行 API；输入与协作差异登记在 contract-signoff.md、handoff.md，未标为通过。

### 4. 检查限制

未启动认证服务、未运行数据库并发/迁移、未验证实际 JWT/密码哈希、未生成 SDK、未执行前端构建。原因是本 PR 只交付 M5 设计文件，canonical/SDK 由 M6 维护，迁移/运行文件由 M9 维护，真实业务属于 Phase 3。

文档检查不能关闭 D01～D09 联合差异或取代 M10 独立验收。提交/推送/PR 及后续 CI 状态在 PR 中记录；尚未取得的同组 Review 不写作通过。

### 5. PR #88 冲突修复验证（2026-10-08）

- 同步 `phase2/backend-foundation` 的 `811e6249c5859f3d894de7014c0536ade73cdc71`，保留 M5 与 M9 的交付、验证和交接章节。
- 所有权检查基线更新为该共享提交；M5 相对基线仍只修改七份 Markdown，没有新增后端、SDK、迁移或运行配置修改。
- 重跑第 2 节文档检查：`PASS: files=7 local_links=24 json_examples=17 operations=7 scenarios=18`，所有权检查通过；`git diff --check` 通过。
- M9 原有记录继续保留，完整 Compose 未通过状态及契约待接收项没有被改成完成。

## BP2 验证记录（verification）

> 证据文件：`docs/evidence/phase-2/backend-platform/verification.md`
> 维护人：M9 ｜ 本文件汇集 M9 交付范围的全部验证证据
> 原则：只记录真实执行过的验证；未执行的项目明确标注"待补"，不编造结果。

### 一、CI 验证（GitHub Actions，真实运行链接）

| 验证项 | 结果 | 证据 |
|---|---|---|
| ruff format + lint（30 文件） | 通过 | run 36379211539 |
| 空库迁移 → 回滚 → 再迁移 | 通过 | 同上（步骤 Verify rollback then re-migrate） |
| 种子两遍幂等 + pytest | 通过 | 同上 |
| 前端 lint + build | 通过 | 同上 |
| PR #76 合并 | 已合并（c3a4929 → phase2/backend-foundation） | https://github.com/Huang0283/CampusLoop/pull/76 |

链接：https://github.com/Huang0283/CampusLoop/actions/runs/36379211539
备份：https://github.com/Huang0283/CampusLoop/actions/runs/36378574253

### 二、本地机器验证（M9 开发机，2026-09-28）

修复"模型/迁移/种子三方不一致"后执行：

| 验证项 | 命令 | 结果 |
|---|---|---|
| 三方列一致性（14 种子表 / 15 模型表） | 脚本化比对 | 5 项检查全部通过（字段⊆模型、模型==迁移、必填覆盖、长度合规、可空性差异单列） |
| ruff 0.8.4 | `ruff format --check . && ruff check .` | 30 文件全过，零告警 |
| 健康接口测试 | `pytest tests/test_health.py -v` | 5/5 通过 |
| SDK 漂移（恢复门禁前预检） | `npm run sdk:generate` + 指纹比对 + `tsc -b` | 生成结果与提交版本一致（无漂移），编译通过 |

### 三、CI 拦截真实缺陷记录（门禁有效性证据）

1. **模型缺列拦截**：`backend / migrations, seed & tests` 红灯，
   `Unconsumed column names: attributes, favorite_count` → 修复 4 处三方不一致后转绿
   （明细见 migration-review.md）。
2. **格式零容忍拦截**：`backend / format & lint` 红灯，网页粘贴引入
   72 处空行尾随空格（4 文件 `Would reformat`）→ 改为拖拽上传原样文件后转绿。

### 四、干净环境完整 Compose 验证（BP2-09 验收口径）

> 状态：**待执行**。CI 不启动 MinIO/完整 Compose，故此节必须单独取证。
> 执行环境：学校机房 / 任何全新机器（无本地镜像缓存、无未提交配置）。
> 操作步骤：startup-guide.md「干净环境标准验收流程」。
> 建议使用 `clean-env-verify.sh` 一键执行并自动留存日志。

| 验证项 | 期望结果 | 实际结果（机房填写） |
|---|---|---|
| `docker compose pull` | 四个固定 tag 镜像全部拉取成功 | 待填 |
| `docker compose up -d --build` | api 构建成功，五服务启动 | 待填 |
| `docker compose ps` | db/redis/minio/api 均 healthy，minio-init exited(0) | 待填 |
| 空库升级（api 启动自动执行） | `alembic upgrade head` 无错误，启动日志可见 | 待填 |
| `docker compose exec api python scripts/seed.py --check` | `[seed][PASS] 两遍执行结果完全一致` | 待填 |
| 回滚再升级 | `alembic downgrade base` 后 `upgrade head` 成功，种子重建仍幂等 | 待填 |
| `curl http://localhost:8000/health` | `{"code":0,...,"status":"ok","dependencies":{"database":"ok","redis":"ok"}}` | 待填 |
| MinIO 双桶 | minio-init 日志出现双桶 ready；`/minio/health/live` 存活 | 待填 |
| 环境记录 | `uname -a`、`docker --version`、`docker compose version` | 待填 |

**执行记录**（执行后填写）：

- 日期：待填
- 执行人：待填（非作者复核人另记）
- 机器/系统：待填
- 检出的分支与提交号：待填
- 日志文件：`clean-env-verify-<日期>.log`（脚本自动生成，建议随证据提交或贴关键输出）

### 五、已知未验证项声明

- 完整 Compose 联调（第四节）在本次提交时尚未执行——不宣称已通过。
- `sdk:check` 门禁恢复后的首次 CI 运行结果：以 Actions 页面为准（本地预检无漂移、编译通过，预期绿）。

### 六、本机验收阻塞记录

- 日期：2026-10-08。
- 环境：Windows、Docker `29.8.0`、Docker Compose `v5.5.1`。
- `docker compose ps` 未能连接 Docker Desktop Linux engine，返回“the system cannot find the file specified”；因此本次不能把本机五服务 Compose 验收记为通过。
- 该环境问题不改变 CI 的迁移/回滚/种子/测试证据；Docker Desktop 启动后仍需按 `startup-guide.md` 重新执行并填写第四节实际结果。
