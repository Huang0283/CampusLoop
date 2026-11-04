# PR #148：T1 搜索与后台场景交接

本次只补测试输入、执行配方和校验，不改网站，也不替 T2 填“业务通过”。个人 PR 目标仍为 `team/testing`，不是 `main`。已有 C01–C36 的执行声明保持原样；其证据由原执行人负责。本次 C37–C48、Q31–Q42、AL01–AL08、AS01–AS08 均未执行。

## 先拿哪几个文件

| 文件 | 装的内容 | 给谁、作用 |
|---|---|---|
| `admin-search-products.json` | 10 件 AP001–AP010：两台笔记本电脑、纸质笔记本、台式电脑、山地/公路车、雨伞/摄影伞、充电宝、电脑包 | T2 用来产生可判断对错的搜索结果；原 60 件商品和编号不改 |
| `search-checks-admin-v2.json` | Q31–Q42 共 12 条市场关键词用例、分类过滤、分页及清空步骤 | T2 对市场的真实结果逐项比对；虽然沿用旧文件名，这些不是后台用例 |
| `admin-list-checks.json` | AL01–AL08 共 8 条用户管理、商品治理、举报搜索配方 | T2 检查实时输入、数字片段、精确编号、跨页、状态组合及清空 |
| `admin-scenario-inputs.json` | AS01–AS08：四类举报、禁用/恢复、下架/恢复 | T2 按合法业务流程建立前置，再供 T1 检查权限和 T2 检查管理流程 |
| `execution-log.csv` | C01–C48 的执行记录，统一十列 | 每条真实执行填响应、状态、证据及缺陷；未执行不填执行时间 |

路径均相对 `tests/collaboration/phase-5/data-permissions/`，CSV 在本说明所在目录。测试图片沿用自制 M01 等几何图，只供隔离测试，不上传日常商城。

## T1 → T2：先验证，再导入

1. 记录**软件完整 SHA**与**数据包 commit**，两者分开。后台搜索和治理配方对照 `main@2e58e7314be84bccb5806b01320e2c36438e8f55` 的页面/接口编写；实际运行要用 M10 确认的同等或更新版本。组分支里没有对应新功能时记“软件版本阻塞”，不要在日常 API 8001 上试写。
2. 使用 Python 3.12 和锁定的后端依赖，在数据包 checkout 根目录运行：

   ```powershell
   $t1 = 'tests/collaboration/phase-5/data-permissions'
   python "$t1/verify_data.py"
   python -m unittest discover -s $t1 -p test_package.py -v
   ```

3. M10 先提供独立 audit API、Redis 14/15、audit 媒体桶与 R/S 管理员。凭据只放忽略目录的私有文件。沿用 README 的环境检查，不自行提升账号角色。示例端口/容器必须替换为实际批准的 audit 环境。

   ```powershell
   $audit = @('--api', 'http://127.0.0.1:18014', '--container', 'campusloop-pr142-audit-api',
     '--namespace', 'business', '--run-id', 'r148s1', '--state-dir', '.codex-tmp/t1-state')
   python "$t1/setup_data.py" @audit --admins .codex-tmp/admins-business.json --admin-search
   python "$t1/setup_data.py" @audit --admin-search
   python "$t1/verify_data.py" --live @audit
   ```

4. 默认导入仍是 **8 个角色定义/60 件商品/12 条求购**。只有加 `--admin-search` 才是 **70 件商品**；同一个 run 重跑必须继续带该参数。缺管理员时保持已有阻塞退出码，不假报 8 个账号全部就绪。数据 JSON 改动会使旧 manifest 校验失败，必须换 run-id，不能覆盖旧映射。
5. 私有 manifest 中的 `products.AP001.id` 等才是数据库 ID；`AP001`、`P001`、`S08` 都不是接口能接受的数字。上传仍由商品所有者完成，重复运行应复用该 run 的 ID，不重复创建。T2 回读两台电脑和纸本名称后再回复“已接收/部分接收/缺什么”。

## T2：怎样测市场搜索

- 用关键词模式跑 Q31–Q42，查询参数为 `query`，分类等放 `filters`。Q41 仅测 BOOKS 分类；当前 `/products` 没有 `maxPrice` 参数，不能写一个被忽略的参数来证明价格过滤。
- 匹配范围是名称及简介的字面关键词。Q33 搜“电脑”时，AP009 的简介“可以装电脑”也会命中；Q39 则只有该包匹配完整短语。这里验证关键词合同，不把它当“只返回电脑整机”的语义意图测评；混合/语义模式需另外定义候选和排序依据。
- 对所有页取并集，再通过 manifest 过滤为本次 run 的商品，核对 include/exclude，不依赖结果顺序。不要只测第一页就说没有遗漏。Q40 空关键词使用 API `pageSize=20`，70 件样例应跨至少四页；UI 采用自己的页大小，仍须遍历全量且无重复、无遗漏。
- Q42 从第 2 页开始输入，再清空，确认回到第 1 页，全部 70 件本命名空间商品恢复。搜索测试先于订单/下架场景，避免商品状态变化影响结果；已经被业务测试修改的 run 不当作干净搜索基线。

## T2：怎样测后台搜索与治理

R 登录后跑 AL01–AL08，D/游客另外检查拒绝访问。每个页面记录输入、实际请求、所有页的 ID 和刷新结果。

- **用户管理**：当前前端先获取账号页，再按昵称、邮箱、ID 等过滤；不要给 `/admin/users` 发一个接口没支持的 `query` 参数来证明搜索。8 个基础账号不足以跨服务器页时，用另一个专用 run 经注册流程准备超过 20 个账号，单独保存映射，验证后页账号也能搜出；缺前置记阻塞。
- **商品治理**：使用 `/admin/products?query=...`；搜“笔记本电脑”应包含 AP001/AP010，排除 AP002、Kindle 和 iPad。清空与遍历核对 70 件本命名空间商品。
- **举报管理**：先执行 AS01–AS04，记录真实 reportId、描述和状态。`#完整ID` 是精确查询，无 `#` 的数字片段是包含查询；还要检查描述关键词与 PENDING 过滤组合。超过一页的举报必须通过合法目标和创建流程补足，不直接造数据库记录；API 返回列表，遍历到不足 pageSize 的末页，不假设响应有 pagination 对象。
- **禁用/恢复**：状态是 `DISABLED`/`ACTIVE`。AS06 依赖 AS05；保持 E 为可牺牲的隔离账号，不能使用日常账号。禁用后旧会话不得写入；恢复后须重新登录。
- **下架/恢复**：状态是 `HIDDEN`/`ON_SALE`，同时核对 `moderationBlocked=true/false`。AS08 依赖 AS07；每次操作前重新读取 updatedAt，提交 `hidden`、非空 `reason`、`expectedUpdatedAt`，不能沿用第一次快照。
- **四类举报**：ORDER 引用 S08 创建的实际订单；CHAT_MESSAGE 引用 S01 中某条实际消息，不能拿会话 ID 顶替。创建 PENDING 不代表处理完毕，还要由管理员按 C37–C48 检查查看、处理、权限、并发、审计及回看。

## 结果怎么交、怎样清理

T2 将软件 SHA、数据 commit、run-id、用例 ID、真实响应/页面反馈、跨页结果和脱敏证据交给 T1/T3；不发密码、令牌、完整私有 manifest。通过、失败、阻塞、未执行分别记录，CI 的静态通过不能写成真实业务通过。

`verify_data.py --live` 回读基础/扩展商品与原有 30 条关键词 oracle，不自动执行本轮 20 条搜索配方或 8 条治理场景，报告明确列为未执行。C37–C48 仍由实际执行人填写 CSV；本次仅清除未执行行里误填的执行时间，不修改作者已有 C01–C36 的结果声明。

沿用 `reset_data.py` 默认 dry-run；确认实际命名空间后才用 `--apply`，它按私有 manifest 处理本 run 的 60/70 件商品和求购。账号、媒体、历史不能安全清理的部分仍保持阻塞和退出码 2，不能声称全部删除。下架恢复和交易场景结束后先记录结果；被预订/售出对象保留阻塞，不强制删除。
