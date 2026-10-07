# AI3-01 关键词基线与分页

实现位于 engine.py、store.py，运行方式见 services/m7_baseline/README.md。NFKC、小写、拉丁数字内部连字符、汉字双字片段/单字查询去重；字符区间 U+3400—4DBF、U+4E00—9FFF、U+20000—2FA1F，固定 tokenizerVersion。无停用词、别名或语义模型。

title/model/category display name/description 权重 4/2/2/1，字段内重复不加分，分母恒为 9×去重查询词数。尚无批准的 categoryNames 映射时该字段贡献 0，不能把 categoryId 伪装成分类显示名。新增显示名字典要增加字典版本/哈希并重新评估。

先执行公开可见、在售、未删除、分类、整数分预算、成色、具体地点及必需型号约束，再召回文本命中项。无登录权限扩张；显式硬字段未知不通过。坏记录隔离并计数；全部商品损坏返回 503，合法无候选返回成功空数组。

relevance 使用原始分数降序、发布时间降序、数字 ID 升序；newest 按时间/ID；price_asc/price_desc 按价格/ID。空白查询在私有候选 RPC 中用于浏览，分数 null；非空标点导致 EMPTY_SEARCH_TERMS。Phase 2 公共 SearchRequest 要求非空，因此 M6 不能直接把这个私有浏览行为映射到公共 /search；需单独确认或继续拒绝公共空白查询。

首请求保存固定排序、产品完整内容哈希、查询/可信身份/字典/算法指纹到 SQLite。后续页按扫描位置继续，重算当前资格，跳过被删除、已售、权限撤销或内容改变的旧候选并补足；不会拼入新商品。price/文本改变即使忘记提升版本也保守移除，刷新后才重新进入。total 是快照时总数，撤销项存在时 totalIsExact=false；快照 TTL 候选值 300 秒。

真实 SQLite 重开与跨页已售场景已验证，不等于 M6 已提供实时事实。公共 page 任意跳页、服务端业务权限和目录增量索引仍需后端适配；本次内部扫描游标不是已批准公共契约替换。
