# 2026-10-09 集中收尾与阶段关闭审计

## 提交与范围

- 前端输入 `013b829`、后端输入 `2c176af`/M9 `88cc2f8`、智能输入 `15da18e`、质量输入 `3837d3c`。
- 本轮实现：端口 `58920ba`；交易原型 `f267725`；平台修复 `56ed7df`；M6 契约 `d0a8169`；CI 门禁 `71172bf`。
- 收尾 PR：[#91](https://github.com/Huang0283/CampusLoop/pull/91)，目标 `phase2/integration`。任务书 [#90](https://github.com/Huang0283/CampusLoop/pull/90) 已合入 main `93339da`，参考 DOCX 原件保留。
- 集中接手不会修改历史贡献，也不会把 AI/自动化运行写成组员签字、另一成员 Review 或人工标注。

## 实际通过的技术检查

- 前端：SDK 生成/类型检查、lint、build、SDK 内容漂移检查通过；`npm run test:transaction` 的 8 个实际 store 场景通过。构建有现存大包 warning，没有构建失败。
- M6：54 个 operation 唯一、路径参数绑定、本地 $ref、4 个匿名公开 GET、受保护写入、9 类后端枚举及 16 个请求/响应正反 schema 样例通过。命令 `python scripts/m6_phase2/check_contract.py`。
- 管理质量：`python scripts/mq_phase2/self_check.py` 通过 12 文件/32 需求，输出仍为 candidate-not-frozen，不把文件齐全当作阶段验收完成。
- 智能：`scripts/intelligence_phase2/run_all.py` 11 步通过且资产哈希未变；运行记录在 `.codex-tmp/solo-p2-intelligence-run/`，可按脚本在新空输出目录重跑。模型效果 NOT_EVALUATED、上线 NO_GO，不是上线批准。
- 正式 Docker/Python 3.12：API、MinIO 与 mc 构建成功；db/redis/minio/api 均 healthy，minio-init 正常退出 0；8 个真实 PostgreSQL 后端测试、ruff lint/format 均通过。
- 宿主机 `8001:8000`，`/health` 与 `/ready` 返回 `status=ok`、database/redis=ok；MinIO 独立探针 healthy，不冒充由 `/ready` 检查了对象存储。
- 为回退验收单独创建 `campusloop_phase2_migration_verify` 空库（不是服务中的 campusloop 库），执行 upgrade→downgrade base→upgrade，随后种子首遍按真实数量插入、第二遍均 +0，8 项测试通过；未回退正在服务的数据库。
- 对两个桶写入 24 字节虚构 probe：public 匿名 GET 为 200，private 匿名 GET 为 403 AccessDenied。两个 probe 只在验收项目内，不包含真人数据。
- #91 的 push/PR CI 三个门禁均通过：后端格式、迁移/种子/测试、前端 SDK/构建；没有手动绕过失败状态。

## 本机启动与限制

- 前端正在 `http://localhost:5173/market`；后端 `http://localhost:8001/docs`；MinIO 控制台 `http://localhost:19001`。
- 本机验收项目名 `campusloop-p2-acceptance`，为避免其他项目冲突，数据库/Redis/MinIO 宿主端口为 15432/16379/19000/19001，API 为用户要求的 8001。容器网络依然使用标准内部端口。
- 先前 Docker Hub token 网络超时，通过缓存镜像拉取并本地加标签完成构建；未修改全局 daemon，也未重启 OceanScope。
- 本机正式 Compose 已执行，不等于“另一名组员在另一电脑从零复现”；独立验收留给八人任务包。
- 业务 /auth、/products、/orders 等尚未实现；前端交易仍是明确 Mock，API 文档/SDK 不代表已经持久化业务闭环。

## 尚未满足的 Phase 2 门禁

- #18 前端：M4 技术收尾和三份产物/五态已补；浏览器完整旅程、上传和断线场景、非作者验收/对签仍待记录。页面局部可点击不冒充完整真实接口联调。
- #21 后端：M6 三份产物已补，核心认证 schema 已吸收；认证各操作 headers/examples、家族会话/资料字段的迁移落点、私有证据上传、事件分页、后台商品动作细节还需完成。此时不能称为全部契约冻结。
- #22 智能：228 条相关性标注对仍为未人工复核；数据冻结、门槛与资源环境确认/真实签收未完成。挂牌价/合成数据不当真实成交标签，不填写虚假 MAE/MAPE。
- #23 质量：需求与计划文档检查通过，但当前不是已冻结基线；第二次汇报、成员验收、范围确认与下一阶段接收仍需实际交付。

## 全阶段 Issue 关闭顺序

- Phase 1 已有收口；本次不重复关闭或改写历史。
- Phase 2：#18/#21/#22/#23，先冻结原型/契约/数据/测试输入并完成本阶段门禁，再发 `phase2/integration -> main` 收口 PR，由该 PR 统一关闭四个 Issue。
- Phase 3：#24/#25/#26/#27，必须实现真实认证、市场、聊天报价、约定完成/评价和持久化的双账号 MVP，再实际验收后关闭；当前骨架和 Mock 不能代替它们。
- Phase 4：#29/#30/#31/#33，必须实现并验证智能/降级、管理员治理/审计、实时恢复和功能冻结；无可信标签时保持相应模型 no-go，不下调门槛掩盖缺口。
- Phase 5：#34/#35/#36/#37，必须完成干净部署、功能/权限/非功能/恢复、真实复现、手册报告与演示/提交包；这些是八人文书与独立测试任务的重要输入，不能现在全部关闭。
- 用户要求“做完关闭并合入 main”已纳入收尾流程，但当前未完成任务保持 open。技术修复先进入阶段集成，main 只接收满足阶段门禁的收口版本。
