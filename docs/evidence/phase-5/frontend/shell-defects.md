# 阶段 5 外壳与会话验证记录

日期：2026-10-23
负责人：M2
应用基线：1b3385a
键盘入口修复：ecdd097
页面按需加载：ae2edd0
浏览器配置及会话用例：d5ad7a2
交易与抽屉焦点修复：c5562c0

## 已执行检查

| 范围 | 证据 | 状态 |
| --- | --- | --- |
| 游客深链接登录后返回，并保留查询参数 | m2-shell-phase5.spec.ts | Chrome、Edge 通过 |
| 会话恢复失败后在原深链接重试 | m2-shell-phase5.spec.ts | Chrome、Edge 通过 |
| 游客浏览、刷新恢复、退出登录及固定导航 | journey.spec.ts | 真实后端回归通过 |
| 普通用户访问管理员页面的角色限制 | m2-phase4.spec.ts | 模拟接口回归通过 |
| 路由渲染异常后的安全回退与首页入口 | m2-phase4.spec.ts | 故障注入回归通过 |
| 离线提示与导航焦点 | m2-phase4.spec.ts | 回归通过 |
| 账号菜单键盘导航和关闭后焦点 | m2-account-menu-keyboard.spec.ts | Chrome、Edge 通过 |
| 交易确认框及用户管理抽屉键盘操作 | m2-dialog-keyboard.spec.ts | Chrome、Edge 4 项通过 |

浏览器原始日志和截图索引见 [浏览器报告](browser-responsive-report.md)。
焦点缺陷的复现、修复和验证范围见 [无障碍记录](accessibility-review.md)。

## 验证边界

- 会话恢复专项使用模拟接口，真实登录与会话持久化由 journey.spec.ts 另行验证。
- 各项结果来自分批执行，不能合并宣称为一次最终候选全量回归。
- m2-async-state.spec.ts 依赖开发服务器加载源码，尚未在当前对齐版本重新执行。
- 正式基线接入、交叉评审及 M10 最终候选复验仍待完成。
- 缺陷正式关闭结论和优先级由团队按最终候选确认。
