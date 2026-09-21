# Frontend-01 核心用户旅程（第一阶段）

| 旅程 | 页面路径 | 当前证据 | 后端依赖 |
|---|---|---|---|
| 身份与资料 | `/login` → `/profile` | 学生/管理员 Mock 身份、权限守卫、资料静态原型 | M5 认证、资料和隐私字段 |
| 商品浏览与发布 | `/market` → `/product/:id`；`/publish` → `/publish/price-advice` → `/my-products` | 可点击静态 Mock 页面 | M6 商品、收藏、上传接口；M8 价格建议 |
| 求购与匹配 | `/wanted` → `/wanted/:id`；`/wanted/publish` → `/wanted/matches` | 可点击静态 Mock 页面 | M6 求购接口；M7 匹配接口 |
| 交易闭环 | `/chat` → `/transactions/:id` → `/transactions/:id/meetup` | M4 Mock Store 与交易页面 | M6 交易状态机；M10 双账号验收 |
| 评价与治理 | 已完成订单 → `/transactions/:id/review`；商品、用户、订单、聊天消息上下文 → `ReportModal`；处理结果 → `/notifications` | 评价资格原型、四类举报入口和通知 Mock | M5/M6 举报权限与处理；M10 越权验收 |

这些路径证明页面之间不存在静态原型断裂，不代表真实接口、数据库或智能服务已经联调。
