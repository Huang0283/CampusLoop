# Phase3 技术候选验收记录

2026-10-09更新：PR92已合phase2/integration，提交8853338的完整CI成功（run37920440816）。用户后续授权技术检查后进入main，见[main-integration-authorization.md](main-integration-authorization.md)；本文原候选/未合main状态为授权前的证据截止记录，不代签真人验收。

日期2026-10-09，当前代码基准`a24bbef99a32d93f28a93529cd8c10f0f0a6fb46`，后端镜像复验基准`74d8c0c`（后续提交未改后端源码），工作分支`task/solo-p3-mvp`；输入`d16ea06`，此前main为`93339da`。本记录是作者/自动化实际执行，独立验收者是用户本人M10陈梓弘；尚未收到其实际复测结论，不代签。

## 实际结果

- Docker Linux Python3.12.15、PostgreSQL16/pgvector、Redis7.4、真实MinIO：后端完整37测试通过（无skip），ruff format/check通过。最终代码镜像无源码bind mount复跑37/37，78.85秒；不会将本机Windows Python3.13 socket错误当业务通过证据。
- M7基线31测试通过，M8基线17测试通过；M8固定规则9/9、重复运行字节一致，resultHash为aa7374f747edffa7c2794b0240d0bd9e1be50f81efac203716e5d5b9f813b14f。真实loopback RPC+权威数据库调用另由backend/tests/test_live_intelligence.py执行。
- canonical OpenAPI结构校验61操作、9枚举、16schema样例通过；生成SDK再生成无git drift；前端lint/build通过。bundle约1.2MB、gzip379KB，体积warning非阻塞但未做性能优化承诺。
- 当前代码真实Playwright五场景通过，29.2秒：双账号发布/上传/图片加载/搜索/私图聊天/失败重试/断线恢复/报价/约定/双方完成/评价/举报/通知；求购/规则价格；游客/网络恢复/刷新安全恢复及退出/固定侧栏/模拟短令牌失效后的真实cookie恢复；移动导航/筛选空态；另一标签切换账号后禁止旧请求自动以新身份重试。此前74d8c0c的四旅程25.3秒为历史记录。历史原型8场景仅Mock回归，不能代替真实E2E。
- 人工检查桌面1440与移动390宽的游客截图；三张有效商品图片均加载成功，无图商品明确显示“暂无商品图片”，移动文档宽375不超视口390。蓝色小图是实际测试上传图片，不用假商品照片替换。
- 远端cb07c47的CI后端37测试、智能基线、迁移/seed、SDK/lint/build均通过，浏览器3/4；失败是测试UI使用127.0.0.1而API使用localhost，Strict Cookie按跨站规则未恢复。a24bbef统一测试为localhost；最新远端结果另以PR92 Checks为准，不能将本机5/5当作远端已通过。
- 独立migration_audit库head0008→downgrade base→upgrade0008成功；seed --check连续两次数量相同，第二遍所有表新增0。回滚不触碰demo或用户业务库。最终镜像构建成功，演示/test容器使用镜像源码而不是未提交bind mount。
- Cookie测试验证HttpOnly/Strict/host-only、生产Secure/__Host-、CSRF精确Origin/头、账号禁用、绝对期限不延长、两标签并发恢复与退出撤销。JSON客户端旋转refresh旧通路独立保留，不混用browser族。
- 匹配测试验证真实outbox/结果/通知原子性、同wanted/product一次、收件人为wanted owner、隐藏再恢复不重复、关闭不current、版本变更不发布旧结果、SKIP LOCKED回滚释放、五次异常终止失败。用户已批准first-pair-v1默认启用。

## 运行与复测命令

完整端口/启动见start-phase3.md。本机手动演示UI http://localhost:5176/market →API8003/demo库/Redis13，真实浏览器测试UI5174→API8002/verify库/Redis14。存储15432/16379/19000/19001，未修改OceanScope8000/4173。两API使用独立cookie名，避免localhost不同端口共享Cookie覆盖。

```text
# 独立Linux测试容器：真实测试DB与Redis14/15，无同库后台API/worker
python -m ruff format --check .
python -m ruff check .
python -m pytest -v
# 仓库根
python -m unittest discover -s services/m7_baseline/tests -q
python -m unittest discover -s services/m8_baseline/tests -q
python scripts/m6_phase2/check_contract.py
# frontend目录，真实API已经启动
npm ci
npm run sdk:check
git diff --exit-code -- src/sdk/generated
npm run lint
npm run build
npm run test:live
```

pytest与真实浏览器必须依次执行，不能同测试库worker并发抢任务/清限流。只允许reset_test_limiter.py清APP_ENV test/ci的Redis14/15 auth:*计数，不降低正式限流，不修改交易事实完成旅程。

## 尚不能宣称的结论

M7固定38查询可重算，但评估状态仍DIAGNOSTIC_ONLY/PENDING_HUMAN_REVIEW，因用户已经审阅228对且确认正确，真实逐条记录仍未归档；humanReviewedPairs=0表示结构化记录缺失，不表示用户没有看。保留原标签和历史日志，不编造reviewer/time。Phase4正式基线冻结需完成review-archive-runbook.md。

没有压力测试/SLA证明，不声称最大吞吐；无真实学籍/支付/设备数据，不包装规则分数为概率。旧部署历史公开私图如存在须迁私桶清公共副本，新库通过不能证明旧部署安全。

GitHub CI结果与候选PR以mvp-release-record.md及远端Checks为准，本机PASS不等于远端CI。独立验收、真实复核归档、Phase2→main与正式阶段收口尚未闭合；不关闭#24/#25/#26/#27，不提前合main或创建正式标签。
