# MQ3-03 认证与商品验收报告（作者执行）

实际环境、代码提交和最新结果以verification为准；独立执行人尚未签，不将作者执行写成M10执行。

空库升级/回滚/重新升级在独立migration_audit数据库完成；演示demo库为空库种子后启动。pytest使用独立verify数据库、Redis14、真实MinIO，无后台API/worker并发使用该库。CI使用全新数据库/Redis15。

认证：注册/正确与错误登录、禁用、退出、refresh轮换与旧refresh重放撤销、公开/私有字段。商品：真实图片上传→写入元数据与商品→列表/搜索/详情，收藏重复幂等、逻辑状态、错误图片/他人上传引用拒绝。新增Redis故障：新认证fail-closed503，已登录普通业务不依赖Redis继续运行。

证据代码：backend/tests/test_auth.py、test_transaction_api.py、test_realtime_media.py；frontend/tests/live/journey.spec.ts有效上传/发布/搜索/游客。
独立操作：两个模拟账号注册；发布商品；错误密码不成功；游客可读；第三账号不能修改商品；隐藏后游客不可见；恢复后再读；再次登录仍有原商品ID。记录时间/最终提交/响应code，不保存令牌。
