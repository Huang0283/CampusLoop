# AI1-01 搜索与匹配需求

版本：m7-p1-v1.1，2026-09-23。状态：可评审候选；未冻结、未获团队签字。范围：M7 Phase 1。来源快照与差异见 [交付清单](deliverables.md)，跨组决策见 [交接记录](handoff.md)。

## 1. 用户目标与范围

用户在 `/market` 输入关键词或自然语言，结合分类、价格、成色、学校/地点筛选找到可见且在售的商品；从 `/wanted/:id` 进入 `/wanted/matches` 查看满足该求购约束的推荐及原因。求购修改后旧结果应显示待更新。

范围说明：本次 AI1-01—05 覆盖“商品检索”和“求购→商品匹配”。`/wanted` 求购市场列表的关键词、分类、预算、最低成色筛选及预算排序，属于 M3 页面需求中另一个列表查询场景，本包未设计该接口，也不能用商品检索方案视为已经覆盖。依据 AI-P1 的“商品排序输出”，暂不将其纳入本次 M7 算法交付；最终责任与是否另立任务由 M1/M3/M6/M7 确认，登记为 H-11，未获正式移出项目范围的批准。

Phase 1 交付需求、规则、算例和验收设计。后续基线接受自然语言原文，按词检索；不承诺理解“安静”“适合写代码”等隐含属性。文本里的“500 元以内”不自动成为预算，必须转为可编辑条件并由用户确认后才执行。不得因为相似度高放宽已确认筛选。

普通搜索可展示用户自己的在售商品；供需匹配排除求购人自己发布的商品。已售、预约、隐藏、下架、删除商品暂不纳入可购买结果；是否允许搜索展示预约商品由 M3/M6 另行决定，不能沿用到自动匹配。

## 2. 页面、业务字段与算法输入映射

“已见”仅表示指定快照中存在文档或原型，不代表已部署。后端参考为 `phase1/backend-platform` 的 `er-candidate.md`，它是候选表设计，并非已冻结的 M6 接口。

| 语义 | 已见页面/表字段 | M7 候选输入 | 适配规则与缺口 |
| --- | --- | --- | --- |
| 商品标识/发布者 | 商品原型 `id`；表 `id/seller_id` | `productId/product.ownerId` | 统一为十进制 ID 字符串；product.ownerId 指卖家，映射 seller_id，仅内部使用 |
| 求购发布者 | 求购候选表 `wanted_posts.owner_id` | `wanted.ownerId` | 指求购发布者，仅内部使用；与商品卖家比较以排除自匹配 |
| 关键词 | 市场输入框；求购 `title` | `keyword` / `queryText` | 文本规范化；禁止从关键词猜出硬筛选 |
| 商品文本 | `title/description/category` | `title/description/categoryName` | 品牌型号无正式字段，缺失时不伪造 |
| 分类 | 页面中文分类；表 `category` | `categoryId` | 必须用版本化字典转换，禁止直接把展示文案当稳定 ID |
| 售价 | 页面 `price`；表 `NUMERIC(10,2)` | `priceFen` | 十进制精确乘 100 转整数分；拒绝多于两位小数、负数和非有限值 |
| 预算 | 求购 `minBudget/maxBudget`；表 `budget_min/budget_max` | `minPriceFen/maxPriceFen` | null=未设置，0=有效边界；上下限均包含等值 |
| 成色 | 市场 `new/90/80/70`；发布求购中文五档；表 `condition` | `condition/minCondition` | 两页面档位不一致；统一等级表前不把“七成新及以下”当“七成新” |
| 学校/地点 | 市场 `thu/pku/...`；求购 `location` 是学校名；表 `campus_location` | `campusScope/placeIds` | 校园可见范围和面交地点必须拆分；现有值不能证明同一面交地点 |
| 状态 | 表商品 `ON_SALE/RESERVED/SOLD/HIDDEN`，求购 `OPEN/MATCHED/CLOSED/EXPIRED` | 业务状态原值 | 暂仅 ON_SALE + OPEN 入选；MATCHED 是否仍有效待 M6 确认 |
| 时间 | 表 `created_at/updated_at/expires_at`；页面 `expireDate` | `publishedAt/expiresAt/asOf` | 带时区时间；日期须按校园时区转次日零点排他截止，不自行取 UTC 零点 |
| 版本/权限 | 商品/求购候选表未见版本；学校字段不足以提供权限 | `entityVersion`、可信权限上下文 | 需 M5/M6 补齐；不能用 updatedAt 充当可靠单调版本 |

求购候选表还未列最低成色、交易地点、必需规格字段；这些条件若用户已填写，字段缺失应进入 `needs_info`，不能忽略后产生“匹配成功”。前端表单也尚未提供完整分类与规格输入，需 M3/M6 对齐。

命名暂保留 ownerId，文档出现发布者比较时必须带 product/wanted 对象限定，不能传递语义不明的裸 ownerId。这里是算法候选映射，未将数据库 seller_id 重命名，也未冻结接口字段；是否改为 product.sellerId 在 AI2-04 契约评审时统一决定。

## 3. 请求与响应候选

参数候选：keyword 最大 200 个 Unicode 码点（规范化后检查），page 默认 1，pageSize 默认 20、范围 1—50；priceFen 为非负整数且不超过 9,999,999,999（与候选数据库金额上限对应）。未知参数/枚举、非法金额、min>max、非整数页码应报可定位的校验错误。具体路由和协议留给 AI2-04。

AI2-04 为已核实的下一阶段任务编号，不是本阶段验收项；固定版本来源及其他 AI2 编号映射见 [交付清单](deliverables.md#5-跨阶段编号出处)。

排序映射：页面 default→relevance，newest→newest，price-asc→price_asc，price-desc→price_desc。空查询的 relevance 自动取最新浏览，响应标明 `mode=browse`。筛选变化 page=1；URL 保存用户筛选；权限上下文只从可信会话产生，不从 URL 读取任意 userId/campusId。

| 响应部分 | 字段 | 展示约定 |
| --- | --- | --- |
| 商品 | productId、title、priceFen、condition、可见地点、封面、业务状态 | 显示真实业务值；必要的公开卖家资料由业务接口提供 |
| 排名 | rankScore、scoreType、reasons | 关键词分 0—1；规则匹配分 0—100；不是成交概率，也不可跨算法直接比较 |
| 模式 | mode、degraded、degradationReason | keyword/rule/browse；预期关闭模型属于基线模式，不虚报故障降级 |
| 分页 | page、pageSize、total、snapshotId | total 是合格去重条数，不用页面固定数；快照失效明确要求刷新 |
| 追踪 | requestId、asOf、dataVersion、ruleVersion、modelVersion、indexVersion | 未使用模型时 modelVersion=null；分词索引仍有版本 |
| 匹配专用 | resultSetId、wantedVersion、resultState | pending/ready/stale/unavailable；过期结果不能当作当前推荐 |

区分：成功无结果（items=[]）、校验失败、身份失败、权限拒绝、依赖不可用和正常降级。依赖不可用不能伪装成“没有商品”。

## 4. 可验收场景

以下均为合成需求案例，不是运行结果。后续验收需固定商品快照及权限身份。

| ID | 输入/前置 | 应有结果 |
| --- | --- | --- |
| SR-01 | “计算器”，库存标题含此词 | 可见在售商品可召回，原因指出命中字段 |
| SR-02 | “ＴＩ-84 Plus”和“ti-84 plus” | 规范化后查询词一致，顺序一致 |
| SR-03 | “宿舍用安静的小风扇” | 仅宣称关键词匹配，不杜撰噪声参数 |
| SR-04 | 自行车，maxPriceFen=50000；商品价 50000/50001 | 50000 可以入选；50001 必须排除 |
| SR-05 | 空词或全空格，分类有效 | 进入筛选浏览，rankScore=null |
| SR-06 | 不存在的型号 | items=[]，提示修改关键词或筛选，不自动放宽预算 |
| SR-07 | 下限大于上限、未知分类、page=0 | 校验失败且保留页面输入 |
| SR-08 | 索引命中但商品已售/隐藏/权限撤销 | 返回前剔除，不泄露标题、价格或计数 |
| SR-09 | 筛选后从详情返回 | 恢复 URL 筛选；变更筛选后从第一页开始 |
| SR-10 | 文本写 1000 元，确认的预算上限 500 元 | 以 500 元筛选，不擅改任何条件 |
| SR-11 | 求购要求最低成色，商品成色未知 | needs_info，不作为满足条件的商品推荐 |
| SR-12 | 后端失效或权限校验不可用 | 明确暂不可用，不能返回缓存中的未授权商品 |

## 5. 第一部分的完成判断

本文件满足“候选需求已形成”的交付目标。AI1-01 正式验收仍需 M3 确认页面映射、M5 确认权限、M6 确认字段/金额/状态，并由 M8/M10 复核上述场景；相关签字当前均未取得。
