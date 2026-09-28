# AI2-01 搜索与匹配数据规范

版本：m7-p2-data-v1.1，2026-09-28。状态：本地可执行候选；尚未由 M6/M5/M3 冻结。范围：离线实验数据，不定义或修改线上 API。v1.1 只修复输出换行与跨平台检出，数据语义不变；见 [portability-review.md](portability-review.md)。关联 AI2-02、AI2-03；不宣称 AI2-04/05/09/10 已验收。

## 1. 输入版本与文件入口

工作树基准：phase2/integration 的 d6e61b6806b48ccf67e5ae64b2d36b5f6b7a6548；M7 Phase 1 参考 8d70d78555b7d3534293d35fdccee872d39cd708；接口参考前端小组 ea152239886293e41cfa469070b5c080dd4fe568。因远程智能组 Phase 2 分支尚未建立，本次在独立本地工作树完成候选，没有改动或重置已有 Phase 1 工作区。

| 资产 | 文件 | 用途 |
| --- | --- | --- |
| 可执行 schema | [dataset.schema.json](../../../../schemas/m7-phase2/dataset.schema.json) | JSON Schema Draft 2020-12；六种记录定义，拒绝未知字段 |
| 原始商品快照 | [products.jsonl](../../../../data/m7-phase2/raw/products.jsonl) | 保留原始标题、金额和各版本 |
| 原始请求 | [requests.jsonl](../../../../data/m7-phase2/raw/requests.jsonl) | 查询、筛选、身份上下文与求购状态 |
| 候选字典 | [dictionary.json](../../../../data/m7-phase2/raw/dictionary.json) | 成色等级、分类/地点/校区 ID 和规范化版本 |
| 来源及用途 | [asset-manifest.json](../../../../data/m7-phase2/raw/asset-manifest.json) | 合成来源、规模、许可状态与适用限制 |
| 处理后商品/请求 | [products.jsonl](../../../../data/m7-phase2/derived/products.jsonl)、[requests.jsonl](../../../../data/m7-phase2/derived/requests.jsonl) | 规范字段、整数分、当前快照 |
| 处理与校验程序 | [pipeline.py](../../../../scripts/m7_phase2/pipeline.py) | build/verify；不调用模型或业务服务 |

数据全部由本会话构造，不抓取真实商品，不含真实账号或隐私。schemaVersion 分别为 m7-raw-v1、m7-processed-v1；来源元数据不等于跨组许可签字。

## 2. 原始商品与研究字段

原始商品是实验封装：recordId、sourceProduct、research。sourceProduct 参照接口候选的 id、seller.id、title、description、category、price、condition、campusLocation、status、createdAt、updatedAt；不是完整 Product 响应，未收集与文本实验无关的图片/昵称。

price 在文件中保存为十进制元字符串，避免浮点转换丢失精度；直接从真实 API 导入时须保留原始数值文本或采用十进制解析，不能先经二进制浮点再猜原始金额。本次未实现线上数据导入适配器。

research 显式保存 catalogId、entityId、nearDuplicateGroup、categoryId、campusId、placeIds、visibility、deleted、entityVersion、attributes.model。这些是实验构造字段，不能声称当前后端已提供。seller.id→product.ownerId 仅是离线映射；wanted.ownerId 指求购发布者，本次没有重命名字段或数据库列。

| 处理后字段 | 类型/约束 | 来源/语义 |
| --- | --- | --- |
| productId、ownerId | 正十进制字符串 | 避免把 int64 强行限定为浏览器安全整数；不是真实用户 ID |
| entityId、entityVersion | 非空字符串、正整数 | 同商品版本关系；缺版本不得用 updatedAt 冒充 |
| catalogId、nearDuplicateGroup | 受控实验标识 | 限定评估语料及同族分组 |
| title、description | 字符串；标题规范化后非空 | NFKC、去首尾/折叠空白，保留原始输入文件 |
| priceFen | 0—9,999,999,999 整数 | 精确 Decimal(price)×100；0 不等于未设置 |
| categoryId | 候选字典中的 ID | 不自动由任意展示文案猜测 |
| condition | new/like_new/good/fair/poor 或 null | 映射全新/九成/八成/七成/六成及以下，等级 5/4/3/2/1，仅实验候选 |
| campusId、placeIds | 字典 ID、去重字符串数组 | 校园与面交地点分离；不把学校名等同地点 |
| status、deleted、visibility | 明确枚举/布尔值 | ON_SALE/RESERVED/SOLD/HIDDEN；删除另列；public/campus/private |
| publishedAt、updatedAt | 带时区的时间 | createdAt 暂映射 publishedAt；重上架发布时间语义待 M6 冻结 |
| attributes.model | 非空字符串或 null | 本轮唯一必需属性案例；不声称支持所有规格 |
| sourceRecordId | 原始记录引用 | 用于追溯和清洗审计 |

## 3. 查询与求购数据

每条请求含 requestId、task、catalogId、templateGroup、queryText、filters、context、wanted。task 为 search 或 matching；查询模板/语义家族不同于请求主键。

filters 包含 categoryId、minPriceFen/maxPriceFen、minCondition、requiredPlaceIds、requiredModel。原始文件金额名为 minPriceYuan/maxPriceYuan，处理后转分。null=没有该侧限制，空地点数组=不限制；下限不得大于上限。自然语言不自动覆盖结构化条件。

context 含 viewerId、campusId、asOf。匿名检索 viewerId/campusId 可为空；匹配必须有与 wanted.ownerId 一致的可信测试身份。本轮只覆盖本人匹配权限，不扩展到管理员代理。用户传入任意这些字段不能在生产获得权限；实验里它们是明确的测试条件。

wanted 在 search 中必须为 null；matching 中必须包含 wantedId、ownerId、entityVersion、status、expiresAt。暂将 OPEN 且 expiresAt>asOf 视为有效；到期等值失效。MATCHED 的正式业务语义待 M6 冻结。

固定 asOf=2026-09-26T00:00:00Z，即北京时间 08:00；所有请求与目录采用同一时点。时间必须含 Z 或明确时区，拒绝无时区、日期不存在、创建晚于更新、版本增加却更新时间倒退。

## 4. 清洗、去重和缺失规则

1. 原始记录只读，build 输出必须为空目录，禁止重跑覆盖人工复核数据。
2. 重复 recordId、重复 (productId,entityVersion)、重复 requestId、重复标签对均失败。完全相同的重复行也不静默删除。
3. 对同一商品选取 asOf 时已存在的最高版本；淘汰快照保存到 snapshot-audit.jsonl。未来版本不进入当前目录。实体 ID 和 catalog 不得在版本间变换。
4. 不同商品即使文本相似也保留，由分组防止跨集合泄漏；不能为提高指标删难负例。
5. 已售、隐藏、预约、删除等记录保留在标注语料中，作为约束负例，不从数据集预先消失。
6. 缺必填字段、未知枚举/字典值、非法金额、额外敏感字段立即报错。condition/model 可显式 null，保留缺失事实；有相应硬要求时为 needs_info。
7. 有任一已知硬条件失败时标 ineligible；没有失败但有未知则 needs_info；全部通过才 eligible。不存在依靠相关分数抵消硬约束的步骤。
8. 文本不做同义词替换、繁简转换或型号连接符删除；schema/清洗不是排名分词器，后续排名预处理需独立版本。

## 5. 已核查差异与待确认事项

现有 OpenAPI 使用数字金额、字符串成色/地点，并缺少求购分类、实体版本等字段。实验 schema 显式补足研究字段，但正式接入需 M6/M5/M3 确認映射、枚举、精度、日期和权限。类型一致不等于业务语义一致。

本轮验证通过证明这套离线规范可执行。跨组字段冻结、真实资产授权、生产 API 导入和 AI2-04/05 契约不在本次完成范围。
