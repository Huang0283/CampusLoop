# 商品与求购 Mock 流程

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

## 求购发布与匹配

```mermaid
flowchart LR
    A[/wanted 求购市场] --> B[/wanted/:id 求购详情]
    A --> C[/wanted/publish 发布求购]
    C --> D[/wanted/matches 匹配结果]
    B --> D
    D --> E[/product/:id 商品详情]
```

## 管理和异常路径

- 我的商品原型展示在售、已预约、已售、隐藏、已下架状态。
- 删除、上下架和草稿目前仍为 Mock 操作；接入 M6 接口前不得宣称数据已持久化。
- 商品与求购页面应按 `01-market-fields-interactions-and-states.md` 覆盖五类页面状态。
