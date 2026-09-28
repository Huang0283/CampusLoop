# M6 第一阶段文档复核记录

> 日期：2026-09-27；版本：0.2；范围：BP1-04～07 与 BP1-11 个人输入。
> 性质：AI 辅助的本地文档复核与纸面走查；不是 M10 独立验收、队友签字或后端运行测试。

## 1. 输入、环境与版本

- 原始分支：`task/m6-p1-domain-rules`；原始基线：`e1fe4810740b1ab53f2f8d14bd2fd178829f6b37`。
- 收口分支：`fix/m6-p1-clean-closeout`；基线：`b5c9a23f3746c8915a5b397185089ccc188aeb4c`。
- 依据：[BP-P1](../../../issues/backend-platform-phase-1-domain-architecture.md)、[需求表](../../../management/m1/requirements-traceability.md)、[M4 状态机](../../../frontend/m4/01-transaction-state-machine.md)、[M9 ER](er-candidate.md)。
- 环境：Windows、PowerShell 7.6.5、Git 2.55.0.windows.5、Python 3.13.7。
- 2026-09-28 已重新 fetch 并确认后端组远端基线；原分支还包含提案、其他组文档和根目录副本，因此未整支合并，只迁入 7 份 M6 证据文件。

## 2. 发现与修订

| 发现 | 原问题与影响 | 修订结果 |
|---|---|---|
| C01 删除与售出混用 | SOLD→DELETED 混在同一生命周期，与已售事实冲突 | 商品生命周期/展示分开；逻辑删除保留 SOLD；INV-08、S15 |
| C02 争议后旧确认 | 同一约定恢复时，旧请求可能被误当新确认 | 新确认轮次隔离；旧结果仅历史重放；INV-05、S13、R19 |
| C03 历史约定恢复 | 一律拒绝过去约定，导致面交后争议无法正常恢复 | 仅有审计的恢复上下文允许核对指定历史约定；普通新预约仍要求未来；Q03 待批准 |
| C04 旧报价复活 | 改价或重新上架后可能沿用旧条款 | 报价绑定商品版本及快照，接受时锁内核对；INV-16、S14、R20 |
| C05 并发确认误拒绝 | 第二方可能因第一方合法确认导致的订单版本变化而失败 | 确认检查约定 v/轮次 r，锁内重算双方结果；S16、R04 |
| C06 能力映射不足 | 未集中说明关键词、收藏、公开读等动作归属 | 实体字典新增 8 行 MVP 动作映射及失效收藏/私密占位规则 |
| C07 缺交错证据 | 只有风险列表，没有锁与提交次序 | 并发文档增加 R01/R04/R06/R07/R11/R19 六组推演 |
| C08 提交说明不完整 | 教学说明、填写占位和过时数量不利评审 | 改为正式个人清单/交接，增加本记录和可复制 PR 正文 |

外部草案中的管理员直接判完成、临近见面状态、自动超时取消、单行约定、事件级联删除等差异已登记 Q01～Q12；未修改其他成员文件，未声称已由团队决议解决。

## 3. 任务标准覆盖

| 标准 | 核对内容 | 文档复核结果 |
|---|---|---|
| BP1-04 每实体有 Owner/参与者/生命周期/事实来源 | 九类核心实体逐行核对，支撑实体另列 | 已覆盖；模型差异待 M9 接收 |
| BP1-05 每转换有角色/前置/结果/事件/拒绝原因 | 五类图配动作表和非法例；初始化、修改、终态、恢复均有解释 | 已覆盖；新增规则仍候选 |
| BP1-06 单方确认、非法评价、非参与者拒绝 | INV-01～16；S01～16，重点 S03～08、S13～16 | 纸面结果一致；没有真实 API 执行 |
| BP1-07 并发接受、重复完成/评价 | 事务/幂等/唯一性/锁/游标/不可变事件，R01～20 和交错推演 | 控制方案已形成；需后续实测 |
| BP1-11 共同风险 | 20 项含触发、保护和建议设计/测试 Owner | M6 输入齐全，不代替小组汇总/独立验收 |

## 4. 关键场景纸面走查

使用虚构 A 卖家、B 买家、C 第三方、D 授权审核者；按文档转移规则推演，不启动应用。

| 走查 | 动作序列 | 推演结果 |
|---|---|---|
| 正常交易 | 发布→B 报价→A 接受→双方确认 v1/r1→B 完成→A 完成→双方评价 | 建单一次；B 单独完成时仍 BOOKED；A 完成后 COMPLETED/SOLD；各一评 |
| 约定变更 | 已预约且无完成确认→改 v2/r2→B 用旧版确认 | 新版待确认，旧版拒绝；历史只读，不能跨版拼接 |
| 争议恢复 | B 在 r1 已确认完成→争议→解除到 r2→重放 r1→双方新确认 | r1 不写 r2；必须双方重确认；历史约定例外须有治理上下文 |
| 旧报价 | p1 报价→商品业务变更 p2→接受旧报价 | 拒绝且不建单，重新报价才继续 |
| 双方并发确认 | 两请求均带 v1/r1，依订单锁串行提交 | 第一方记录确认；第二方重算后完成，不因无害版本变化误拒绝 |
| 删除已售商品 | COMPLETED/SOLD→逻辑删除 | 展示 DELETED，生命周期 SOLD；保留快照和评价资格，不能重售 |
| 非法评价/证据 | C 评价别人订单或读其消息/举报证据 | 授权拒绝，不泄露正文，不新增评价 |
| 消息晚提交 | T1 持会话锁写 n，T2 等待后写 n+1 | 不发生先看见 n+1 而永久漏掉 n；具体实现仍需数据库验证 |

## 5. 可复现结构检查

在仓库根目录 PowerShell 执行。检查文档完整性、UTF-8、链接、围栏、表格、空白字符和编号，不是服务测试。

2026-09-28 在干净收口分支复跑结果：`files=7 links=46 mermaid=5 invariants=16 scenarios=16 risks=20`，`M6 structure checks: PASS`，`git diff --check` 通过。

```powershell
@'
from pathlib import Path
import re
import subprocess
import sys

root = Path('docs/evidence/phase-1/backend-platform')
names = ['domain-entity-catalog.md', 'state-machines.md',
         'transaction-invariants.md', 'transaction-concurrency-risks.md',
         'm6-phase1-workbook.md', 'm6-review-record.md', 'm6-pr-body.md']
texts = {}
links = 0
for name in names:
    path = root / name
    text = path.read_text(encoding='utf-8', errors='strict')
    texts[name] = text
    assert '\ufffd' not in text, (name, 'encoding')
    fenced = False
    previous = 0
    for line in text.splitlines():
        if line.startswith('```'):
            fenced = not fenced
            previous = 0
            continue
        if fenced:
            continue
        if line.startswith('|'):
            cells = line.count('|')
            assert not previous or cells == previous, (name, line)
            previous = cells
        else:
            previous = 0
        for target in re.findall(r'\]\(([^)]+)\)', line):
            if target.startswith(('http://', 'https://', '#')):
                continue
            assert (root / target.split('#')[0]).is_file(), (name, target)
            links += 1
    assert not fenced, (name, 'unclosed code fence')
    result = subprocess.run(['git', '-c', 'core.autocrlf=false', 'diff',
                             '--no-index', '--check', '--', '/dev/null',
                             str(path)], capture_output=True)
    assert result.returncode in (0, 1), (name, result.stderr)
    assert not result.stdout and not result.stderr, (name, result.stdout, result.stderr)
assert len(re.findall(r'^```mermaid$', texts['state-machines.md'], re.M)) == 5
for name, prefix, expected in [('transaction-invariants.md', 'INV-', 16),
                               ('transaction-invariants.md', 'M6-S', 16),
                               ('transaction-concurrency-risks.md', 'M6-R', 20)]:
    ids = re.findall(r'^\| (' + re.escape(prefix) + r'\d+) ', texts[name], re.M)
    assert ids == [f'{prefix}{n:02d}' for n in range(1, expected + 1)], (name, ids)
print('Python', sys.version.split()[0])
print(f'PASS: {len(names)} files; {links} local links; 5 diagrams; 16 invariants; 16 scenarios; 20 risks')
'@ | python -
if ($LASTEXITCODE -ne 0) { throw 'M6 document checks failed' }
git status --short --branch
git diff --name-only
```

2026-09-27 实际执行结果：检查进程退出码 0。输出为 `PASS: 7 files; 46 local links; 5 diagrams; 16 invariants; 16 scenarios; 20 risks`。7 个文件均通过 UTF-8、围栏、表格与空白检查；46 个相对文件链接有效，规则/场景/风险编号连续无重复。`git status --short --branch` 显示当前为 M6 任务分支，仅新增本批 7 个文件；`git diff --name-only` 无输出，既有文件未修改。

Mermaid 仅检查源码结构，未执行图形渲染；五类转换逻辑已纸面核对，共同基线仍须 Q 表 Owner 对签。

## 6. 结论与限制

四份核心材料覆盖 Phase 1 的 M6 文档交付项，可作为设计候选发起评审。没有后端实现，因此未运行 API、数据库、并发、部署或性能测试，也未证明系统功能正确实现。

本记录仅证明文件完整性、文档结构和上述纸面推演。远程最新性、课程日历、跨组决定、独立验收、真实运行结果仍按交接清单完成；不能用作整个 Phase 1 已关闭的证据。
