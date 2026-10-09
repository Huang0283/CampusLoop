# FE3-12 作者复验与独立验收

环境：Node/npm、React/Vite，测试UI localhost5174→API8002；API为LinuxPython3.12+PostgreSQL16+Redis7.4+真实MinIO+loopback M7/M8。启动/提交号见../management-quality/verification.md。

```powershell
cd frontend
npm run sdk:generate
npm run lint
npm run build
npm run test:transaction
npm run test:live
```

作者已运行SDK生成/lint/build；构建包约1.2MB有非阻塞体积warning，未宣称优化完毕。历史原型8场景不作为真实闭环证据。真实浏览器四场景：双账号交易（含私图/失败重试/离线重连），求购与规则价格，游客/网络恢复/安全重载恢复与退出/固定侧栏，移动导航/筛选空结果。

浏览器不手工改库、不使用Mock成功；requestId等安全信息可以保留，trace/video/screenshot默认关闭以免泄露。具体最新测试结果见质量verification，后续独立执行人补真实执行日期/提交号/结论，不能填写作者以外签名。

FE3-01已按用户批准的cookie会话恢复实施；具体测试结果以质量verification为准。所有自动化通过也不等于独立验收或Issue关闭。
