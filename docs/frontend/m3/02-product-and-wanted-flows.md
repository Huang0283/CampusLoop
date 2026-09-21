# M3-02 商品与求购 Mock 流程（第一阶段）

## 商品浏览与发布

```mermaid
flowchart LR
    A[/login 学生 Mock 登录] --> B[/market 市场]
    B --> C[/product/:id 商品详情]
    B --> D[/publish 发布商品]
    D --> E[/publish/price-advice 价格建议]
    D --> F[/my-products 我的商品]
    B --> G[/favorites 收藏]
```

`/` 在第一阶段重定向到 `/market`，因此市场页同时承担首页、分类入口和商品列表职责，不另设重复首页。
`/my-products` 的“我的发布”同时承担卖家中心职责，不再建设名称重复的独立页面。

## 商品管理流程

```mermaid
flowchart LR
    A[/my-products 我的发布] --> B{选择商品}
    B --> C[/product/:id/edit 编辑商品]
    B --> D{当前状态}
    D -->|在售| E[确认下架]
    D -->|已下架| F[确认重新上架]
    B --> G[删除确认弹窗]
    G -->|取消| A
    G -->|确认| H[从本人列表移除并显示结果]
```

- 编辑商品复用发布表单，加载原字段；保存失败时保留输入。
- 上下架和删除必须先显示目标商品、动作结果和不可逆提示，不能只依赖按钮颜色表达风险。
- 第一阶段交付流程和状态规则；`/product/:id/edit`、确认弹窗及状态切换留到第二阶段可点击原型。

## 求购发布与匹配

```mermaid
flowchart LR
    A[/wanted 求购市场] --> B[/wanted/:id 求购详情]
    A --> C[/wanted/publish 发布求购]
    C --> D[/wanted/matches 匹配结果]
    B --> D
    D --> E[/product/:id 商品详情]
```

## 求购编辑流程

```mermaid
flowchart LR
    A[/wanted/:id 本人求购详情] --> B[/wanted/:id/edit 编辑求购]
    B --> C{校验}
    C -->|失败| B
    C -->|成功| D[保存修改]
    D --> E[旧匹配结果标记为待更新]
    E --> F[/wanted/matches 重新查看匹配结果]
```

- 编辑求购复用发布求购字段和校验规则，只允许发布者本人进入。
- 已过期或已删除求购不进入编辑态；页面展示原因和返回入口。
- 第一阶段交付入口、字段和状态设计；`/wanted/:id/edit` 及重新匹配动作留到第二阶段可点击原型。

## 管理和异常路径

- 我的商品原型展示在售、已预约、已售、隐藏、已下架状态。
- 删除、上下架和草稿目前仍为 Mock 操作；接入 M6 接口前不得宣称数据已持久化。
- 筛选保留、草稿和离开提醒遵循 `01-market-fields-interactions-and-states.md`；第一阶段不要求真实持久化。
- 商品与求购页面应按 `01-market-fields-interactions-and-states.md` 覆盖五类页面状态。
