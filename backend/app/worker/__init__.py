"""Worker 独立运行时（BP4-07/08，M9 独占：Worker、队列、监控、运行配置）。

组成：
- runner.py   进程入口：信号、健康服务器、主循环装配
- health.py   标准库 /healthz 探针（不加载 FastAPI/模型栈）
- observer.py 任务运行观测：ai_task_runs 流水 + worker_heartbeats 心跳

设计红线（对应 Issue 验收标准）：
- 模型/建议服务不可用时任务进入有界重试，API 与交易主链路不受影响；
- 观测写入任何失败都不能影响任务执行；
- 与 API 进程内 worker（serve.py 兼容模式）共用同一 worker_loop 实现，
  本包只做运行时装配，不改队列语义（PostgreSQL 权威 + SKIP LOCKED）。
"""
