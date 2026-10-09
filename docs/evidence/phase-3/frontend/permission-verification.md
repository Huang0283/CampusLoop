# FE3-02 角色和对象权限

`common.tsx:Guard`对/chat、/transactions、/profile、/publish等要求USER，对/admin要求ADMIN。游客可浏览/market、商品、/wanted；只有收藏、联系、发布、举报等写操作需要登录。页面不可见并不替代服务器授权。

资料页仅从/auth/me接收本人私有邮箱；商品/聊天对方摘要采用公开DTO，不展示对方邮箱。管理员页仅实现用户状态和原因，禁用由后端撤销会话并审计。

复验：游客直接访问/chat跳/login；普通用户直接/admin显示403；第三账号直接请求其他人的会话/订单返回403；商品下架后游客404，所有者携带认证可读。见后端auth/transaction/realtime测试。浏览器未逐个点击全部管理员路径，独立复测需补充管理员与禁用账号。
