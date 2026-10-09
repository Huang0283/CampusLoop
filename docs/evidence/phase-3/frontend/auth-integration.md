# FE3-01 真实认证接入

实现：`frontend/src/live/AccountPages.tsx`、`session.ts`、`frontend/src/sdk/index.ts`。注册/登录采用后端 user 和令牌响应；密码不缓存，退出调用撤销接口后清理页面身份。字段校验、提交中状态、错误凭据、429、503均显示真实失败，不伪装成功。

短access仅驻留内存，长期凭据由后端通过HttpOnly/Strict cookie保存。刷新页面先调用/auth/browser-session恢复本人，再渲染路由；页面内401共享一次续签后至多重试一次。退出/新登录使用generation隔离旧请求。

2026-10-09用户批准安全cookie恢复方案。原Phase2设计按browser-session-contract修订，禁止把令牌写入localStorage；浏览器族不再使用JSON refresh，非浏览器旧接口独立保留。来源/CSRF、Secure与期限详见../backend-platform/browser-session-contract.md。

复验：两个模拟账号登录，市场与/profile刷新仍本人；Cookie为HttpOnly、Strict，document.cookie不能读取；退出后访问/chat进入登录，再刷新不能自动登录。后端分别验证旧JSON轮换重放和新cookie恢复/撤销/期限/CSRF，实际结果见质量verification。
