# 电脑搜索排除手提包的回归修复（2026-11-03）

核对上一轮main的GitHub Actions时，发现 `test_catalog_search_new_products_edits_relevance_filters_and_visibility` 失败：查询电脑把“手提包，购买后闲置，可装电脑”也当成了电脑整机，返回3件而预期2件。其他241项通过。该用例故意把手提包放在DIGITAL分类，检查不能仅靠分类或简介中的电脑一词判断商品主体。

修复将手提包加入商品主体排除规则，保留真实电脑别名、整机附赠配件和仅简介命中的正常搜索行为。不修改原API集成用例的严格预期；扩展单元目录包含错误分类的手提包，关键词与语义范围共同验证排除。搜索版本升为 `live-catalog-phrases-v4`，避免继续使用旧版本缓存。

验证在专用 `campusloop_auth_search_audit_20261031` 数据库与Redis DB15进行，没有访问日常账号库。原失败的真实上传→发布→查询→编辑→隐藏集成用例及相关关键词/语义用例复测通过，Ruff格式/静态检查通过。

完整后端242项、零跳过：初次237通过，另5项因容器覆盖默认CORS/Worker配置失败；仅在测试进程对齐用例默认来源 `http://localhost:5173` 与内嵌运行配置后，这5项复测全部通过，无代码变更。保留首次失败与复测XML：专用容器 `/tmp/main-followup-20261103-full.xml`、`/tmp/main-followup-20261103-env-retest.xml`。不将两次运行冒充一次全绿结果，也不代替T1/T2/T3独立手动验收；线上CI以新的运行结果为准。
