# MQ3-05 并发、事务与恢复

test_transaction_api：同一商品两并发接受只一个有效订单，数据库唯一索引兜底；注入notify失败503后商品/报价/订单整体回滚，恢复后同操作可成功；重复确认、重复评价和非法状态拒绝。

test_realtime_media：真实WS首帧鉴权/Origin/URL无令牌、双账号事件与persist-before-ACK、UUID去重、旁观者拒绝、撤销后连接关闭；私聊/举报图片不公开匿名读取。

test_matching_jobs：PostgreSQL事件去重、匹配结果版本、同一wanted/product通知一次、关闭删除current；业务回滚连outbox一起回滚；RPC期间globalrevision改变不发布旧结果，重新调度后恢复；第一worker持锁时第二worker SKIP LOCKED，回滚释放后可重新领取。

浏览器真实POST失败重试、offline/online和消息不重复；HTTP游标不被WS/发送跳跃。序列校准修复种子显式ID导致新消息ID低于水位问题。

限制：测试的是少量并发与边界，不是压力/负载测试。WS帧大小/频率保护已实现但未做120次频率专用自动化。未声称任意吞吐/所有故障通过。
