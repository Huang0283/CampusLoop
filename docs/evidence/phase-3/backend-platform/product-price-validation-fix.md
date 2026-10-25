# 商品发布原价校验修复（2026-10-15）

## 触发和原因

人工验收输入售价 2 元、原价 0.5 元，`POST /products` 返回了 503 `SERVICE_UNAVAILABLE` / `Database unavailable.`。数据库当时健康，真正原因是初始迁移已有的 `ck_products_original_price_order` 约束要求原价为空或不低于售价，而前端和请求模型没有对应校验。通用数据库异常处理误把约束拒绝显示成数据库不可用。

该缺陷属于前三阶段已有商品发布/编辑路径，与 M8 候选服务无关。修复分支从 `main` 的 `829ffbfc7f5c310917b2ff7c9627fe98b117824a` 创建；不带入第四阶段代码，不更改数据库规则或迁移。

## 修复行为

- `backend/app/schemas/business.py`：在 ProductWrite 的 originalPrice 字段校验原价与售价关系；发布和编辑共用此模型。非法请求现在返回 422 `VALIDATION_ERROR`，字段位置为 `body.originalPrice`，不会进入数据库写入。
- `frontend/src/live/MarketPages.tsx`：原价字段显示“可留空、填写时不能低于售价”的提示。校验依赖售价，售价修改后重新校验；非法表单不发发布请求，表单和上传图片保持可修改。
- `openapi/campusloop.v1.yaml` 和重新生成的 SDK：补齐原价约束说明，不新增字段、不改接口地址或响应类型。

## 实际验证

隔离环境使用 PostgreSQL、Redis DB15 和 MinIO，Python 3.12.15；前端 Node 24.21.0。未回滚或清空人工验收账户和商品。

- `python -m pytest tests/test_input_logging_contract.py tests/test_transaction_api.py -ra -o cache_dir=/tmp/product-price-pytest`：14 项通过、零跳过。新增测试覆盖原价为空/等于/高于售价、低于售价时字段校验拒绝、发布拒绝后同幂等键和图片可重试、编辑拒绝不改变原商品、修正后编辑成功。
- `CAMPUSLOOP_UI_URL=http://localhost:5184 npm run test:live`：6 项真实浏览器流程通过。新增用例验证低原价不发送 POST、修改售价重新校验、清空原价发布成功以及等价原价编辑成功。其余五项累计交易/登录/游客/移动/跨标签页回归通过。
- `npm run sdk:check`、`npm run lint`、`npm run build`：通过。构建保留原有大 chunk 提示。
- 在 Linux 容器使用 `RUFF_CACHE_DIR=/tmp/ruff-product-validation` 执行 `python -m ruff format --check .`、`python -m ruff check .`：通过。缓存路径单独设置，避免只读源码挂载导致工具缓存失败。
- `/ready` 显示数据库和 Redis 均为 `ok`。现有本地验收 API 已重启加载修复，前端由 Vite 更新。

## 人工复验

在 <http://localhost:5184/market> 登录后点击“发布商品”，填写名称、图片、售价 2 元、原价 0.5 元和地点，点击保存应出现原价字段的中文提示。将原价清空或改为不低于 2 元后保存，应进入商品详情。若不了解原价，保留为空即可。
