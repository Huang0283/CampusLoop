# 阶段 5 前端页面与接口矩阵

> 2026-10-25 PR #120 ????????????????????????? [M2 ??????](m2-pr120-acceptance.md)???????????????????????

更新日期：2026-10-23
代码基线：7d16270
工作分支：prep/m2-p5-main-alignment
汇总负责人：M2

本矩阵记录当前实现、接口及已有验证范围。
正式发布候选、交叉评审和 M10 复验尚未完成，
本文件不代表最终验收签字。

## 身份与公共行为

游客可浏览市场、商品和求购内容。
受保护业务页面要求 USER，管理后台要求 ADMIN。
USER 页面不因管理员已登录而自动开放。
商品、求购、聊天和订单的对象权限还需由服务端校验。

页面按需加载期间显示加载提示。
公共资源组件处理失败、超时、403 和 404；
具体空状态、重试和业务限制见各页面。
外壳提供离线提示、退出登录及路由切换后的主内容聚焦。

## 页面与接口

下表接口均相对于 API 基础地址；{id} 等表示资源编号。
接口列包含主要读取及页面触发的操作，不表示打开页面就执行写入。

| 页面与路由 | 身份及对象限制 | 主要接口与操作 | 状态与已有验证 |
| --- | --- | --- | --- |
| 登录 /login | 公共 | POST /auth/login；恢复会话 POST /auth/browser-session | 字段校验、失败提示；深链接和查询参数返回、恢复失败重试已有浏览器模拟回归 |
| 注册 /register | 公共 | POST /auth/register | 测试邮箱说明、昵称及密码校验；真实旅程包含注册，服务端限流仍生效 |
| 个人资料 /profile | USER | GET、PATCH /users/me | 资料概览、编辑与保存；桌面和移动宽度已有界面回归 |
| 校园市场 /market | 公共 | GET /products、GET /search | 筛选、排序、分页、空结果；检索模式、降级和失败恢复已有专项回归 |
| 商品详情 /product/:id | 公共；操作按身份和归属限制 | GET /products/{id}；GET /favorites；PUT、DELETE /favorites/{id}；POST /chat/sessions | 图集、卖家和地点；收藏恢复、游客操作保护、不可见内容已有回归 |
| 我的发布 /my-products | USER，本人商品 | GET /products/mine；PATCH /products/{id}/status；DELETE /products/{id} | 编辑、上下架、删除；已预订或已售商品的相关操作受限 |
| 我的收藏 /favorites | USER | GET /favorites；DELETE /favorites/{id} | 收藏列表、分页、取消收藏及空状态 |
| 发布商品 /publish | USER | POST /uploads/images、POST /products | 必填字段、图片、原价与售价校验；上传键盘及真实发布已有回归 |
| 编辑商品 /product/:id/edit | USER，归属由服务端校验 | GET、PATCH /products/{id}；POST /uploads/images | 数据回填、校验及保存；非法原价恢复已有真实回归 |
| 价格建议 /publish/price-advice | USER | POST /price-advice | 模型或规则、低置信度、样本不足、不可用、降级、版本及输入变化清理旧结果已有回归 |
| 求购广场 /wanted | 公共 | GET /wanted | 搜索、分页、预算及成色卡片；桌面与移动界面已有回归 |
| 求购详情 /wanted/:id | 公共；本人管理 | GET、DELETE /wanted/{id}；POST /chat/sessions | 本人编辑、关闭及匹配入口；其他用户联系发布者；关闭状态限制操作 |
| 发布求购 /wanted/publish | USER | POST /wanted | 标题、预算、成色、地点和到期时间；约束已有真实服务回归 |
| 编辑求购 /wanted/:id/edit | USER，归属由服务端校验 | GET、PATCH /wanted/{id} | 数据回填和保存；具体权限由 API 判定 |
| 规则匹配 /wanted/:wantedId/matches | USER，求购对象权限由服务端校验 | GET /wanted/{id}/matches | 原因、相关度、硬约束、版本、有效期和降级；过期、未知有效期及权限拒绝已有专项回归 |
| 聊天列表 /chat | USER | GET /chat/sessions | 搜索会话、未读和手动刷新；会话布局及切换已有回归 |
| 聊天详情 /chat/:id | USER，会话参与者 | GET、POST /chat/sessions/{id}/messages；POST /chat/sessions/{id}/read；GET /chat/messages/{id}/image；WebSocket /ws | 消息、图片、发送中、失败重试和历史消息；界面及真实双账号旅程已有分批回归 |
| 聊天报价区域 | USER，会话及商品状态限制 | GET、POST /chat/sessions/{id}/offers；POST /offers/{id}/accept、reject、counter、cancel | 报价、接受、拒绝、还价、撤回；接受后进入订单 |
| 交易中心 /transactions | USER | GET /orders | 我买到的、我卖出的、状态筛选、分页和空状态；真实旅程及界面回归已执行 |
| 订单详情 /transactions/:id | USER，订单参与者 | GET /orders/{id}、/orders/{id}/events；POST /orders/{id}/meetup/confirm、confirm-complete、cancel | 按订单状态显示操作；完成确认、取消、时间线；双账号旅程及确认框键盘回归已执行 |
| 安排见面 /transactions/:id/meetup | USER，订单参与者 | GET /orders/{id}；POST /orders/{id}/meetup | 北京时间、未来时间及结束时间校验；修改产生新版本，双方需重新确认 |
| 评价交易 /transactions/:id/review | USER，订单参与者 | GET /orders/{id}；POST /reviews | 双方完成后才开放评价；评分、文字和提交状态 |
| 通知 /notifications | USER | GET /notifications；POST /notifications/{id}/read、/notifications/read-all；GET /reports/mine | 分类 tab 支持方向键切换；整行点击进入内容，右侧“标为已读/查看”为辅助；与外壳共享一次轮询，单条和全部已读同步计数已有双浏览器回归 |
| 我的举报 /report | USER | GET /reports/mine（page、pageSize） | 举报记录、状态、提交时间、处理时间与处理说明；上一页/下一页与刷新；商品/订单目标可回详情；本页不是通用举报创建表单 |
| 各业务页面举报弹窗 | USER 业务场景，具体权限由 API 校验 | POST /reports；POST /uploads/images | 原因随举报对象与订单身份变化、说明、最多 5 张私有证据；禁止举报自己；求购详情可举报发布者；处理完成后举报人收到 `REPORT_RESULT` 通知 |
| 管理后台 /admin 用户页签 | ADMIN | GET /admin/users、/admin/users/{id}/risk-clues；PATCH /admin/users/{id}/status | 分页、人工读取风险、禁用或恢复；真实分页和会话撤销、用户抽屉键盘回归已执行 |
| 管理后台 /admin 举报页签 | ADMIN | GET /admin/reports、/admin/reports/{id}/evidence/{index}；POST /admin/reports/{id}/resolve | 主动读取私有证据、处理或驳回及说明；契约回归已执行，不能据此替代真实治理验收 |
| 管理后台 /admin 商品页签 | ADMIN | GET /admin/products、/admin/products/{id}；POST /admin/products/{id}/moderation | 搜索、状态筛选、人工下架与解除；真实隐藏和恢复回归已执行 |
| 未知路径 * | 公共 | 无业务接口 | 显示“页面不存在”和返回首页链接 |

治理接口返回 404 或 501 时，页面明确提示接口尚未接通并允许重新检查。
这是异常兼容行为，不表示当前商品治理功能整体缺失。

## 兼容入口

| 入口 | 当前行为 |
| --- | --- |
| / | 重定向到 /market |
| /orders | 重定向到 /transactions |
| /orders/:id | 复用受保护的订单详情 |
| /orders/:id/review | 复用受保护的订单评价 |
| /profile/transactions | 重定向到 /transactions |

## 证据与接收

- 浏览器与移动宽度：browser-responsive-report.md。
- 键盘与焦点：accessibility-review.md。
- 会话、权限及外壳：shell-defects.md。
- 构建与资源测量：frontend-build-guide.md。
- 依赖及 SDK 检查：dependency-audit.md。
- 请求、控制台及通知同步：request-console-review.md。

上述结果分批执行，包含真实 API、模拟接口及故障注入；
未宣称在 084f025 上完成一次全量最终候选回归。

M3 接收市场、商品、求购及智能结果部分；
M4 接收聊天、交易、通知、举报和治理部分。
M2 维护公共外壳、构建及本矩阵，M6 确认 SDK 和接口契约。
最终字段、权限、异常状态和发布限制仍需对应负责人交叉核对，
由 M10 对统一候选复验、M1 确认收口。

## M4 核对结论（2026-10-26）

分支 `task/m4-p5-transaction-fixes`，基线 `8e42674`。

- 聊天 `/chat`、`/chat/:id`：会话列表、历史分页、发送/重试、报价入口、断线提示与 HTTP 补拉路径一致。
- 交易 `/transactions`、`/transactions/:id`、`/meetup`、`/review`：路径与按钮名称一致；写动作受订单状态与参与关系限制；“我已完成交易”仅在见面确认后出现；评价仅完成订单开放。
- 通知 `/notifications`：分类为“全部/消息/报价/匹配/系统”，默认“全部”；分类为 `role=tab` 按钮组，方向键切换，无文本输入光标；整行点击进入内容，右侧按钮不触发行跳转。
- 我的举报 `/report`：字段增加 `handledAt`、`resolutionNote`；分页 20 条/页；刷新按钮；商品与订单目标可点击回详情，用户与聊天消息保持文本。
- 举报弹窗：商品/订单/聊天/用户入口与原因过滤一致；证据上限 5 张；卖家自己的商品不显示举报入口；求购详情新增“举报发布者”；后端拒绝自举报。
- 管理员举报页签：列表分页、状态筛选、处理说明、私密证据读取与审计一致；处理完成后举报人收到 `REPORT_RESULT`。
- 未关闭：见面确认并发死锁仍未复现与修复，见 `verification.md`；历史举报无处理说明属于数据差异，不回填内部审计。

以上为 M4 字段与路径核对，最终发布限制和异常口径仍由 M10/M1 确认。
