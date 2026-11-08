# 卡片与导航交互统一（2026-10-26）

参照通知页已验收的交互，把同一套点击、焦点与光标规则推广到市场、求购、交易中心与我的举报。
保持原有布局、字段与信息层级不变，只增加热区、反馈与键盘可达性。

## 改动范围

| 文件 | 改动 |
| --- | --- |
| `src/live/common.tsx` | 新增 `TabList`：`role=tablist`、`aria-selected`、roving `tabIndex`、方向键/Home/End 循环 |
| `src/live/TransactionPages.tsx` | 交易中心角色导航由 antd `Tabs` 换成 `TabList`，沿用通知页的选中与下划线样式 |
| `src/live/MarketPages.tsx` | 商品卡片标题作为整卡热区锚点并支持空格键；价格改用 `.catalog-price`；操作区加 `.catalog-actions`；求购卡片标题加 `.wanted-title` |
| `src/live/ReportsPage.tsx` | 删除右上角“查看通知”；翻页拆到 `.report-pager`，与举报记录分区 |
| `src/live/original-interface.css` | 全局光标抑制、整卡热区、卡片/按钮反馈、选中项强化、翻页分区、减少动效分支 |
| `tests/live/ui-interaction-polish.spec.ts` | 新增 5 项交互验证 |

## 各项需求与实现

1. **求购卡片整面可点**：标题链接的 `::after` 覆盖整卡，点击标题、预算、成色、发布者、时间任一处都进入求购详情；`<a>` 语义保留，Tab 可聚焦、Enter 原生触发，空格键由 `onKeyDown` 补充。卡片内“查看匹配”链接提升层级，仍可独立点击。
2. **商品卡片整面可点**：同一方案覆盖图片、标题、价格、成色、发布者区域；`.catalog-actions` 内的编辑/上下架/删除/取消收藏按钮提升到热区之上。
4/5. **我的发布、我的收藏**：与市场共用 `ProductCards`，改动一次即同时生效，未复制第二套实现。
3. **交易中心**：标注 `role=tab` 的 `TabList` 替换 antd 默认 tab 条，选中项使用 `#1d4ed8` 加粗、`#e3edff` 填充与 3px 品牌色下划线，`0.2s ease` 过渡；订单卡片以“查看订单”链接扩展整卡热区，商品摘要内的商品标题仍单独可点并优先响应。
6. **我的举报**：举报记录与翻页栏之间加分隔线与间距，翻页保持独立按钮；右上角“查看通知”入口已移除。
8. **全站光标**：`.campus-app` 统一 `caret-color: transparent`，只对 `input`/`textarea`/`select`/`contenteditable` 恢复 `currentColor`；antd 下拉的搜索输入框单独再关闭，避免点击筛选框出现竖线。

## 交互细节

- hover：`translateY(-3px)`、边框转 `#dbe6ff`、阴影加深、卡片底色 `#fbfcff`；商品封面图片 `scale(1.04)`。
- active：回到 `translateY(-1px)`、底色 `#f0f5ff`、阴影收敛，形成按压感。
- 焦点：卡片 `:focus-within` 2px `#2f6bff` 描边；卡片内标题链接不再显示默认焦点环，避免与输入焦点混淆。
- 过渡统一 `0.2s ease`；`prefers-reduced-motion: reduce` 下关闭位移与图片缩放。
- 卡片文本 `user-select: none`，点击不会选中文字或出现拖选高亮。

## 验证

环境：独立审计容器 `campusloop-m4-audit-api`（8018，挂载当前源码，独立库 `campusloop_m4_p5_audit`、Redis DB15、独立 MinIO），前端 `http://127.0.0.1:5186`。
日常 `campusloop-local-*` 容器与 5174 站点未启动、未改写。

| 用例 | 结果 | 日志 |
| --- | --- | --- |
| `ui-interaction-polish.spec.ts`（整卡点击、光标、标签键盘、举报分区） | 5 passed | `verification-output/ui-interaction-polish.txt` |
| `interface-restoration.spec.ts`（界面与布局回归） | 10 passed | `verification-output/ui-interaction-interface.txt` |
| `journey.spec.ts`（真实双账号交易） | 6 passed | `verification-output/ui-interaction-journey.txt` |
| `m2-phase4` + `m2-notification-sync`（治理与通知回归） | 7 passed | `verification-output/ui-interaction-governance.txt` |

`npm run lint`、`npx tsc -b`、`npm run build` 均通过。

## 未覆盖

- 我的发布、我的收藏仅通过共用组件间接验证，未在两类账号数据下分别跑用例。
- 卡片标题与状态标签的对比度未逐项测量，仅沿用既有配色。
- Edge 实机未抽查；以上结论来自 Chromium。
- 首次执行 journey 时出现一次搜索结果未及时刷新的偶发失败，重跑两次均通过，未修改用例超时或跳过条件。
