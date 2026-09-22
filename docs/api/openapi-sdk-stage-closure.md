# OpenAPI SDK 阶段闭环与总闭环

## 固定入口与端口

- OpenAPI 契约源：`openapi/campusloop.v1.yaml`。
- 前端 SDK 稳定入口：`frontend/src/sdk/index.ts`。
- 自动生成目录：`frontend/src/sdk/generated/`，任何成员不得手工修改。
- 前端开发地址：`http://localhost:5173`。
- 后端 HTTP 地址：`http://localhost:8000`，由 `VITE_API_BASE_URL` 覆盖。
- 后端 WebSocket 地址：`ws://localhost:8000/ws`，仅在 Phase 3 真实服务可用后写入 `VITE_WS_URL`。
- Phase 1/2 的 `VITE_WS_URL` 必须留空，使页面继续使用明确标识的 Mock 传输；这不是联调成功证据。

## Phase 1：范围与原型输入

本阶段不交付 OpenAPI SDK，也不要求后端服务运行。已完成的页面旅程、状态、权限候选和异常场景是 Phase 2 契约输入。

关闭口径保持不变：静态或 Mock 页面只能证明范围和交互设计，不能证明接口、持久化或 WebSocket 已实现。前端第一阶段原有未完成协作项仍按 `docs/issues/frontend-phase-1-experience.md` 处理，不能由本 SDK 代签。

## Phase 2：契约与 SDK 小闭环

对应 Issue：BP-P2 的 BP2-01、BP2-03、BP2-04、BP2-05、BP2-11，以及 FE-P2 的 FE2-04、FE2-12。

本周输入是 Phase 1 的页面动作、角色、状态和异常候选。M5 先提交认证字段、权限、错误码和会话规则，M6 在 Review 后作为唯一 Owner 合入 `openapi/campusloop.v1.yaml`，再补齐业务路径、幂等和状态前置；M2/M3/M4 负责确认页面动作均有契约入口；M10 负责把成功、失败、权限和冲突响应转为测试场景。M5 不直接并行修改 canonical OpenAPI，前端不手工修改生成目录。

本周可验收输出：

- `openapi/campusloop.v1.yaml` 能被生成器解析。
- `npm run sdk:generate` 能确定性生成类型、Fetch 客户端和 51 个操作方法。
- `npm run sdk:check`、`npm run lint` 和 `npm run build` 通过。
- 每个写接口明确权限、幂等键、非法状态或校验错误；智能接口明确降级信息。
- OpenAPI 操作通过 `x-campusloop-phase` 关联实现或联调任务。

本阶段只证明契约与 SDK 可消费。没有 FastAPI 响应、数据库结果和跨组签字时，不得勾选真实实现或真实联调任务。

## Phase 3：MVP 实现与真实联调小闭环

对应 Issue：BP-P3 的 BP3-01 至 BP3-12，以及 FE-P3 的 FE3-01 至 FE3-12。

后端先按 Phase 2 契约实现并通过契约测试，再由前端把页面的 Mock 数据源替换为 `frontend/src/sdk/index.ts`。页面不得同时维护另一套手写字段或自行兼容未知响应；契约差异由 M5/M6 修改 OpenAPI 后重新生成 SDK。

本周关闭必须同时具备：真实 HTTP/WebSocket 响应、前端真实调用、数据库持久化结果、成功/失败/权限/冲突场景和 M10 双账号 E2E。仅生成 SDK、仅后端单测或仅页面 Mock 均不能关闭 Phase 3。

## Phase 4：智能与治理扩展小闭环

对应 Issue：AI-P4、BP-P4 和 FE-P4。

混合搜索、求购匹配、价格建议、管理员举报处理等操作继续修改同一份 OpenAPI，不创建第二份智能接口规格。`searchProducts`、`listWantedMatches`、`getPriceAdvice` 和管理端操作必须包含结果版本、解释/因素、降级或权限边界，再重新生成 SDK。

本周关闭必须证明至少两个智能功能真实可用，智能服务关闭时关键词搜索和基础交易仍可运行，普通用户无法读取管理员证据或内部风险依据。

## Phase 5：冻结与发布小闭环

对应 Issue：BP5-05、BP5-10、FE5-03、FE5-10 和 MQ-P5。

发布候选冻结 `info.version`、OpenAPI、生成 SDK、后端实现和部署端口。任何契约修改都必须重新生成 SDK，并在同一提交执行：

```bash
cd frontend
npm ci
npm run sdk:generate
npm run sdk:check
npm run lint
npm run build
```

最终关闭必须由非作者从干净检出复现，确认生成后 Git 无漂移、前后端版本一致、P0/P1 为零，并由 M10/M1 对同一发布提交验收。

## 项目总闭环

总链路是：Phase 1 页面和规则候选 -> Phase 2 单一 OpenAPI 与可生成 SDK -> Phase 3 FastAPI/数据库实现和前端真实联调 -> Phase 4 智能与治理扩展且保留降级 -> Phase 5 契约冻结、干净部署和最终回归。

总闭环完成条件：

- OpenAPI 是 HTTP 契约唯一来源，生成目录无手工补丁。
- 前端页面、SDK、后端路由、数据库状态和测试场景使用相同字段、枚举和错误语义。
- WebSocket 只负责低延迟；HTTP 历史和 `afterId` 补拉负责完整性。
- 报价接受与订单创建原子且幂等；约定按版本确认；双方确认同一版本后才完成；完成后才能评价。
- 智能结果可解释、可版本化、可降级，不被描述为成交概率或保证价格。
- 每周只按当周 Issue 的证据关闭，不用后续代码倒签前一阶段，也不用生成 SDK冒充真实联调。
