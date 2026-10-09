# FE3-01 / BP3-01 浏览器会话恢复合同

2026-10-09 用户确认采用“刷新仍登录”及安全会话方案。本文件是Phase2原内存token设计的获批Phase3修订，不重写旧测试历史。

## 浏览器通路

- 注册/登录显式发送X-CampusLoop-Browser: 1和浏览器Origin。后端仅接受完整白名单Origin；成功建立新会话族，返回accessToken/expiresIn/user，不向JS返回refreshToken。
- 长期随机凭据置于HttpOnly、SameSite=Strict、Path=/、不设Domain的cookie。生产强制Secure并使用__Host-campusloop-session；本地HTTP使用可配置campusloop-session，不能将本地非Secure配置作为生产配置。
- PostgreSQL只保存cookie凭据SHA256摘要，随机强度48字节。会话绝对最长七天；恢复只发最长15分钟access token，不延长绝对期限，也不轮换稳定cookie，避免两个标签页同时恢复被误判为旧refresh重放。
- POST /auth/browser-session发送JSON空对象{}，必须携带精确Origin和X-CampusLoop-Browser:1。成功返回短access+本人user；无cookie/过期/撤销401、禁用423、来源/CSRF头不合403、每族30次/分钟以上429。日志和返回正文不含cookie凭据。
- 启动页面先恢复身份后渲染受保护路由，避免短暂游客跳转。真正未登录401进入游客；网络/服务错误保留明确恢复重试。access仅内存，localStorage/sessionStorage/IndexedDB不存任何认证凭据。
- 页面内401共享一次cookie续签并至多重发一次原请求；网络未知结果不自动重放写请求。业务请求只携带Bearer，credentials=omit；cookie仅认证请求携带，不以cookie绕过业务/WS对象权限。
- POST /auth/logout浏览器模式撤销cookie绑定族并删除cookie，access过期或账号禁用也能清理。其他标签页旧Bearer因数据库族撤销立即失效；恢复也失败。多个设备其他族不受影响。

## 非浏览器兼容

未设置浏览器标记的API客户端仍走JSON token pair /auth/refresh，消费旧refresh→新refresh，旧token重放撤销全族。浏览器族不创建RefreshSession，故不在同一族混用两种刷新凭据。原API测试保持有效，不把cookie稳定凭据声称成旋转refresh令牌。

## CSRF / 部署

CORS只允许列出的Origin并允许credentials；不允许通配Origin。cookie续签/退出额外检查Origin+自定义头，严格JSON阻断表单提交；业务写不接受cookie身份。生产API和前端需同站HTTPS（建议同源反向代理）；跨站部署需另行设计，不随意把SameSite改None。

HttpOnly避免JS读取长期凭据，但不能保证活跃XSS不能执行已登录动作；仍需文本安全输出与部署脚本来源策略。开发多个API使用独立cookie名/浏览器context，防止localhost不同端口之间cookie互相覆盖。

回归：test_browser_sessions覆盖属性、无refresh正文/记录、Origin/头/额外身份字段、期限不延长、两标签页并发、退出撤销、禁用、限流和生产Secure。真实浏览器覆盖刷新/profile直接重载仍本人、JS看不到cookie、退出再刷新游客。
