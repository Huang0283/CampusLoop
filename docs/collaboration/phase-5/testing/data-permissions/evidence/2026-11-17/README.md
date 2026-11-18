# 2026-11-17 T1 收尾执行证据

执行者：Codex，受用户明确委托执行；不冒充T2/T3/M10独立签收。软件 `9713c8cc1adcf23b8214a29128ef00ca3362332c`；源码为项目主工作区main；材料为项目内 `.codex-tmp/t1-closeout` 的 `work/testing/data-permissions`。API http://127.0.0.1:18025，UI http://127.0.0.1:5185。数据库 campusloop_audit_permission_run2，独立Redis DB15和独立媒体桶。执行日期2026-11-17（Asia/Shanghai），JSON时间为UTC。

## 证据与边界

- [真实HTTP结果](direct-results.json)：62检查点，包括测试前置；不是62个用例。10组API补测，含C47部分；对象ID、状态码、错误码、订单金额已脱敏记录。凭证/密码不入文件。
- [浏览器结果](browser-results.json)：13项通过，无跳过，1440/390px凭证、私有媒体、双账号真实交易、游客、刷新和共享标签切换。共享标签测试明确注入过期401；不将该注入作为真实后端拒绝证据。
- [集成回归](integration.log)：42项通过；真实专用PostgreSQL/Redis/MinIO，FastAPI TestClient应用集成；与经HTTP网络的direct-results区分。
- [搜索结果及实际ID](search-results.json)：复用AP001/AP002/AP003/AP009/AP010定义，通过真实API创建五件隔离样例并以pageSize=2遍历全部页，验证五种查询。仅验证这些样例，不声称导入470件或完成语义模型评估。
- [历史53条证据梳理](historical-evidence-audit.csv)：45条空路径，8条为缺前置说明，均不作为已核验通过；旧原文保留。11月初原始48条另存[历史快照](execution-history-b2af182.csv)，防止之前覆盖式修改丢失历史。
- 可复核请求逻辑：[HTTP脚本](direct-runner.py)、[搜索脚本](search-runner.py)。在同版审计API容器运行，脚本防止使用日常库，管理员私有JSON仅留本机。每次创建独立测试对象；不要对日常库运行。

## 初跑问题与处理

首次HTTP脚本预期未包含管理员对另一管理员的404，按auth.py现有契约修正；第二次读取订单DTO误用productId，按实际product.id修正。这两次不是产品缺陷。最终62检查通过，金额增加明确断言。
首次9项浏览器因5185连接超时未执行到业务；释放沙箱进程后用本机隐藏Vite重新启动，最终13项通过，未用初跑失败冒充产品失败。
现有依赖缺exceljs，安装遇本项目Vite占用原生模块；确认进程后短暂停止前端，npm ci恢复成功。日常网站经scripts/start-local.ps1恢复，原数据卷保留。

## 仍未完成与接收

1. C36：现有reset只有部分清理能力；本机没有已接收的完整基础包manifest和第二隔离空间，未执行reset。T3提供两空间/前后快照/授权清理范围，M10确认；T1核对另一空间不变。不能写完全清空成功。
2. C47：API商品/报价/订单归属及金额和D拒绝通过；新增真实浏览器专项两次在选择第二商品时超时，提示“共2项”区域拦截点击/选项不可见，未绕过点击强制通过。[最终失败证据](chat-ui-results.json)、[复现脚本](chat-ui-runner.cjs)。联系人只有一个的断言已通过，但逐商品切换/刷新/切账号段未跑完，保持部分通过，交M10区分页面交互与自动化时序问题；中间一次429是连续注册限流，清除审计限流后仍复现选择超时。
3. 历史无证据项目保持待验证；C29“可以”与拒绝预期矛盾未消除。没有批量把旧通过变成已验收。
4. 本机没有BGE模型runtime/权重，启动器旧PowerShell还出现Get-FileHash不可用；语义模型和470件整套基线未验收。关键词样例成功不代表模型成功。
5. 本机没有T2环境。本次未声称日常/T1/T2全部同版可用；日常与T1软件使用同一main源码，日常没有执行写入权限测试。
6. T2接收本次权限/搜索证据、T3接收C36、M10复核缺陷与剩余风险；非作者接收和PR合并待完成。不得代签或自动关闭#160。

## 材料门禁

个人分支原契约快照与本次软件的差异仅OpenAPI文件哈希，所选响应Schema内容不变；同步哈希并将T1 CI只读软件基线固定到9713c8c。最终静态包校验通过，见package-check.json；初次stale snapshot仅为旧材料基线问题。

脚本复现位置：将本目录HTTP脚本复制到审计容器/tmp，并仅在该容器提供私有/tmp/closeout-admins.json；脚本只输出脱敏结果。chat-ui-runner.cjs原运行于主源码的.codex-tmp/closeout-20261117，使用主源码frontend依赖；不得直接在不含实际软件的旧材料分支启动网站。

现有包完整性 unittest：18项通过，见 [运行日志](package-tests.log)。
