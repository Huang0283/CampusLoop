# M8 Phase 3 价格、信用与风险规则基线

这是 Issue #26 中 AI3-05～AI3-10 的 M8 候选实现。服务版本为 `m8-baseline-rpc-v1`，仅供可信后端通过本机回环地址调用，不是 M6 的公共 API，也不会直接修改商品、账号、订单、评价或举报。

## 已实现

- `POST /v1/price-advice`：输出保守价格区间、低置信/数据不足状态、规则因素与“不保证成交”提示。
- `POST /v1/trust-summary`：只聚合有效且已完成的事件；取消、争议、无效评价不增加信用；新用户保持 3.5/5 中性先验，并使用权重 5 的平滑。
- `POST /v1/risk-clues`：输出可解释风险线索和是否建议人工复核；`enforcementExecuted` 永远为 `false`。
- 严格 JSON、请求大小、Bearer 凭据、回环监听、结构化错误与脱敏日志。
- 调用端 500 ms 候选超时；连接失败、超时或 503/504 时按 Phase 2 契约明确降级。

## 运行

从仓库根目录使用 Python 3.10+；本次证据环境为 Python 3.10.11。代码仅依赖标准库和仓库内的 Phase 2 M8 规则。

```powershell
$env:M8_SERVICE_TOKEN = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
python -m services.m8_baseline --port 8788
```

请求信封固定为：

```json
{"schemaVersion":"m8-baseline-rpc-v1","payload":{}}
```

完整内部契约见 `contracts/m8-phase3/service-contract.json`。令牌和可信上下文不得下发浏览器。

## 验证

```powershell
python -m unittest discover -s services/m8_baseline/tests -v
python -m services.m8_baseline.verify --output-dir ../m8-p3-run
```

验证命令执行单元/接口测试、固定规则用例以及两次逐字节一致性检查，并保存环境、源文件哈希和原始输出。当前数据只有合成规则用例，没有合格 L3 成交标签，因此 `MAE/MAPE/interval coverage` 不得报告，技术测试通过也不等于 M10 独立验收通过。

## 接入边界

2026-10-09 集中实现：公共 `/price-advice`、`/users/{userId}/trust` 和管理员 `/admin/users/{userId}/risk-clues` 已接入实际回环 RPC。信誉只传完成订单的真实评价，不为未评价交易编造五星。风险传商品发布、会话对手方和举报窗口计数；支付失败、设备指纹未采集，传 null 并输出 missingInputs/INSUFFICIENT_DATA。风险接口鉴权且读取留审计，不执行处罚。当前复现需区别作者技术验证与非作者签字，后者仍未取得。

M6 负责授权、读取权威数据、把内部结果映射成公共 DTO，并在公开输出前移除风险内部字段。M3/M5/M6/M9/M10/M1 的契约、压测、安全与独立验收仍需各责任人确认。本分支以 `prep/m7-p3-search-matching-baseline` 为临时兼容基线；正式 `phase3/intelligence-baselines` 创建后应由 M7 统一归并。
