# FE4-02 公共异步状态
代码：`frontend/src/live/AsyncTaskState.tsx`。组件显示 queued、running、completed、failed、timeout、expired；retrying 作为执行重试期间的 busy 状态，避免虚构后端第七个状态枚举。通过 role=status、aria-live=polite 和 aria-busy 反馈进度。

排队/运行允许刷新；失败/超时/过期按消费者实际提供的回调显示刷新和重试。超时提示先刷新确认事实，避免重复业务写入；重试按钮忙碌期间禁用。完成显示确认结果。消费者必须从已确认后端契约映射，不得用本地计时伪造后端完成。

公共 useRemote 以 30 秒上限停止首次无限加载，SDK HTTP 请求本身 10 秒超时；组件卸载时清理定时器和 AbortController。刷新后重新发起独立请求，迟到响应不能覆盖超时状态。Resource 初次加载/超时接入公共组件，403 优先处理并隐藏已有私密值。
生产页面的真实任务映射仍由 M3/M4 接入其后端状态；本 PR 不替他们改页面。

验证：`npx playwright test m2-async-state.spec.ts` 验证六态、重试动作/忙碌、可访问属性和全局异常隐藏；`m2-phase4.spec.ts` 注入 11 秒 HTTP 故障验证超时提示及手动刷新恢复。均通过。
