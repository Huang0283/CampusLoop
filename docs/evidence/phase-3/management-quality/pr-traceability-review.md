# MQ3-02 实现到需求追踪

原编号责任保留；集中代码分支task/solo-p3-mvp。138fb29实现基础认证/市场/交易，8fda472接入M7/M8准备服务；当前最后代码提交见verification。GitHub候选PR在mvp-release-record登记。

FE3-01/02/03/12 → live/AccountPages、common、session、SDK/router → auth/API权限、Playwright游客/重载；FE3-01按获批cookie恢复实现，browser-session-contract记录新通路。
FE3-04/05/06 → MarketPages/ImageQueue → API商品/求购、真实上传搜索、浏览器规则价格。
FE3-07/08/09/10 → TransactionPages/useChat/PrivateImage/ReportButton → WS权限/去重、事务与浏览器双账号主链路。
FE3-11 → prototype独立路由、mock-inventory与page-state证据 → build和四真实浏览器旅程。

BP3-01/02/03 → services/auth、core/security、auth routes/serializers → test_auth、test_realtime_media、有效完成评价聚合。
BP3-04/05 → market/transactions/realtime/media → transaction、WS/私有媒体测试。
BP3-06/07/08 → 事务、订单事件/约定、评价/举报/通知 → 并发接受唯一、回滚、确认版本、评价资格/去重。
BP3-09/10/11/12 → migrations0002—0008、batch serializers、storage、logging、serve/seed/Docker → migration roundtrip、seed幂等、query预算及环境文档。

AI3-01/02/03/04 → M7 engine/service、业务intelligence/matching_jobs → M7单测、fixed evaluation、PostgreSQL事件去重/版本。
AI3-05/06/07/08/09 → M8 engine/client/service、intelligence routes → M8固定规则/边界和live测试，关闭服务明确降级。
AI3-10 → 各规则README/verification/handoff → 作者可复现，正式独立复验/封存签字仍待真人。

MQ3-01—08 → 本目录里程碑/追踪/演示/测试/缺陷/发布记录。自动化不代签M10陈梓弘；测试提交与最后代码提交必须一致，远程CI单独记录，不拿本机PASS冒充CI。
