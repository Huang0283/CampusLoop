# FE3-11 Mock隔离清单

生产入口`frontend/src/router/index.tsx`只引用src/live，业务数据只通过SDK获取。旧Phase1/2原型保留在`router/prototype.tsx`及原页面/mock目录，生产路由不导入它们；不能用prototype通过情况代替真实后端验收。

`npm run test:transaction`是历史8场景的原型回归，保留用于教学阶段追踪。真实验收使用`npm run test:live`连接API/PostgreSQL/Redis/MinIO/M7/M8。

内存仅保存身份/令牌、上传队列、发送草稿和加载状态，不把localStorage当商品、订单、消息、评价事实。本地旧凭据键启动时清理。验证码/邮箱校验仍教学模拟域，页面有明确说明。
