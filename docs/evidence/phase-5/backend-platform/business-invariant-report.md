# BP5-03：M6 业务不变量回归报告

日期：2026-10-23。作者角色：M6。状态：本地实现和检查完成，真实数据库验收待执行。
基线：phase5/backend-release，2eb166897fa1953b4514eef72b6d06baa869cf34。
个人分支：task/m6-p5-business-hardening。本报告不代表全组验收或 M10 签字。

## 本次交付

- 拒绝纯空白 Idempotency-Key，保留原有 1～64 字符、用户/操作域/键隔离、请求体指纹比对及事务提交机制。
- 新增真实 PostgreSQL 并发测试：两个买家争抢同一商品、双方同时确认完成、同一用户并发评价。
- 新增内存替身实现的幂等重放/冲突单元测试，只验证控制流，不能证明数据库隔离正确。
- 保留既有交易锁、数据库约束、订单事件及权限实现，不新增业务表或接口。

## 状态机与不变量

| 操作 | 前置条件 | 成功后事实 | 非法/重复请求 |
| --- | --- | --- | --- |
| 接受报价 | PENDING 报价，商品 ON_SALE，有权限接收方 | 报价 ACCEPTED，商品 RESERVED，一个 PENDING_CONFIRM 订单及创建事件 | 状态冲突 409；同键同体重放既有结果 |
| 修改见面安排 | 订单未 COMPLETED/CANCELLED/DISPUTED，时间有效 | 安排 PROPOSED、版本增加、双方确认清零，订单 PENDING_CONFIRM | 无效时间 422；终态 409 |
| 确认见面 | meetupId/version 与当前安排一致 | 双方同版确认后 MEETUP_ARRANGED | 旧版本 409；同方重复不追加事件 |
| 确认交易完成 | 双方已确认当前见面版本 | 单方不售出；双方完成后订单 COMPLETED、商品 SOLD | 非法阶段/旧版本 409；重复不增加事实 |
| 取消订单 | 未终态且无人确认完成；有原因 | 订单 CANCELLED，商品 ON_SALE，安排取消 | 空原因 422；非法状态 409 |
| 评价 | 订单 COMPLETED，用户是参与方 | 每个订单/评价者最多一条评价 | 未完成或重复评价 409 |

BOOKED、DISPUTED 是保留枚举，不虚构为当前正常流程必经步骤。商品 HIDDEN、求购 CLOSED/EXPIRED 的过滤和权限沿用既有实现。
业务写入、事件及幂等记录由既有数据库事务提交；失败回滚沿用会话管理。本次未用内存锁替代数据库锁。

## 测试映射

| 文件（仓库相对路径） | 内容 | 本机结果 |
| --- | --- | --- |
| backend/tests/test_p5_business_contract.py | 键边界、重放/冲突、游标、WS 边界 | 单元/ASGI 通过，部分鉴权使用替身 |
| backend/tests/test_p5_integration.py | 不同买家并发接受 200/409，数据库仅一个订单/创建事件 | 需要数据库，跳过 |
| 同上 | 双方并发完成、重试事件不增长；并发评价 201/409，只有一条记录 | 需要数据库，跳过 |
| backend/tests/test_transaction_api.py 等原有测试 | 既有交易、权限、事务 | 数据库用例跳过，逐条见 JUnit |

完整后端：82 passed、37 skipped、1 xfailed。证据：evidence/m6-backend.log、evidence/m6-backend-tests.xml。不能据此声称真实并发通过。

## 复验与关闭条件

按 verification.md 准备专用服务并运行严格检查；在实际合并提交执行测试，确认无 skip/xfail，核对记录与事件数量。M5/M9 交叉评审、M10 独立复验后才可签收。缺少的输入见 handoff.md。
