# BP2 M5 文档验证记录

执行人：M5（AI 辅助）｜日期：2026-10-08（Asia/Shanghai）。本文件只记录文档检查，不代表 API、数据库、浏览器或独立安全验收通过。

## 1. 环境与范围

- Windows、PowerShell 7.6.5、Git 2.53.0.windows.2、Python 3.12.10。
- 分支：`task/m5-p2-auth-contracts`；基线：`c3a49290bf29cd54c1b569ed7a08dbd175891913`。
- 输入版本见 [contract-signoff.md](contract-signoff.md)；交付清单见 [deliverables.md](deliverables.md)。
- 实际交付提交：以个人 PR head / `git log -1 --format=%H -- docs/evidence/phase-2/backend-platform` 获取，避免在提交内写自引用的错误 SHA。

## 2. 可复现检查

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
base = 'c3a49290bf29cd54c1b569ed7a08dbd175891913'
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

## 3. 实际结果

2026-10-08 执行上方 Python 检查，退出码 0，实际输出：

```text
PASS: files=7 local_links=24 json_examples=17 operations=7 scenarios=18
PASS: changed tracked files are within M5 document ownership
```

随后暂存相同七个文件并复跑，检查通过；`git diff --cached --check` 无错误输出。暂存范围仅为本目录七个 Markdown 文件，没有 canonical OpenAPI、生成 SDK、后端代码、迁移、种子、Compose 或 CI 变化。

人工文档走查结论：七个操作均有权限/输入/响应/失败分支；成功、校验错、凭据错、过期、禁用、越权均有样例；本人/公开字段集合分开；退出/禁用/轮换/重放的会话范围与 A01～A18 一致。检查时补齐了 415/来源 403 声明、refreshToken 长度及单有效后继部分唯一索引要求。

认证契约中的响应为虚构样例，A01～A18 为待实现后执行的测试预期。没有实际 API 失败日志/截图，因为本次未运行 API；输入与协作差异登记在 contract-signoff.md、handoff.md，未标为通过。

## 4. 检查限制

未启动认证服务、未运行数据库并发/迁移、未验证实际 JWT/密码哈希、未生成 SDK、未执行前端构建。原因是本 PR 只交付 M5 设计文件，canonical/SDK 由 M6 维护，迁移/运行文件由 M9 维护，真实业务属于 Phase 3。

文档检查不能关闭 D01～D09 联合差异或取代 M10 独立验收。提交/推送/PR 及后续 CI 状态在 PR 中记录；尚未取得的同组 Review 不写作通过。
