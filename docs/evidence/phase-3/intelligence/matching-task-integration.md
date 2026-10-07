# AI3-03 持久任务及联调缺口

BaselineStore 是 M7 私有同步持久实现，不是后台队列。events、tasks、current_results 与 snapshots 保存到实际 SQLite 文件，重开后可读取。逻辑 taskKey 使用 Phase 2 InputVersion 的 wantedId/wantedVersion/catalogRevision/authorizationRevision/policyGeneration/refreshGeneration/asOf；事实内容另存哈希。相同 eventId 不同内容返回 EVENT_CONFLICT；相同任务输入冲突返回 TASK_INPUT_CONFLICT。

事务 BEGIN IMMEDIATE 串行检查当前修订组，任一分量倒退即 SUPERSEDED；同修订组不得改变 asOf。结果、事件与当前指针同事务保存。resultVersion 是确定内容哈希，排除生命周期 state；旧历史结果在读时显示 superseded，不能伪报 current。调用者必须确保每个修订号含义与业务事实一致，M7 私库只能比较已见修订，无法证明业务库未在计算期间改变。

已验证：同事件重投结果一致、重开恢复、事件内容冲突、旧 wanted/catalog/policy 版本拒绝、历史状态变化。每条求购仅一个当前指针。notificationsEnabled 固定 false，通知意图数 0，未发送站内通知；这不满足“通知去重”或一次有效通知的正式验收。

尚需 M6 提供真实业务事务 outbox、权威快照、同业务库条件写入/等效协议及撤销信号；M9 确认异步领取、租约、心跳、重试、到期扫描、锁与资源配置；M4/M6/M7 批准通知政策并提供通知唯一键及发送前复核。当前 read_task/current 是内部历史诊断入口，不能直接用作客户端当前推荐读取；上线读取必须重新检查求购/商品/权限/有效期。

未运行真实 LC-01—10 全链路，未宣称跨库原子性、生产恢复或通知联调成功。本项只能登记为部分实现。
