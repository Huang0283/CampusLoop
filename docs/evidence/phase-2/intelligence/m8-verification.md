# M8 Phase 2 验证记录

## 作者验证命令

```text
python -m unittest discover -s scripts/m8_phase2 -p test_pipeline.py -v
python -m unittest discover -s scripts/m8_phase2 -p test_contracts.py -v
python scripts/m8_phase2/contract_check.py
python scripts/m8_phase2/pipeline.py verify
python scripts/intelligence_phase2/run_all.py
git diff --check
```

## 验证范围

- 数据来源/许可、字段、价格单位、标签层级、重复 ID 和时间检查。
- L0/L1/L2 不得携带 L3 成交标签；挂牌价不被误用为成交价。
- 规则输出区间有序、缺锚点明确降级、两次重建哈希一致。
- 价格、公开信誉、管理员风险、公开安全响应与超时降级样例。
- 内部风险字段泄漏、自动风险决定、新用户伪评分、阻塞式降级均为负向失败。

## 结果（2026-09-29 作者环境）

- M8 数据测试：9/9 通过；M8 契约测试：5/5 通过；7 个契约样例通过。
- M8 两次重建字节一致。SHA-256：manifest `197e3fdd...51877`、metrics `618ed35f...fe5d`、逐样本结果 `74b73658...e0da`。
- 联合运行器通过：M7 数据测试 28/28、契约测试 53/53、22 个样例及确定性验证；M8 上述全部检查通过。
- 运行环境：Windows，Codex bundled CPython 3.12；M7 依赖按 `requirements.txt` 安装到临时目录。

作者运行通过不能替代 M10 独立验收。完整哈希以 `data/m8-phase2/derived/manifest.json` 和运行器原始输出为准。

## 未验证

- 真实数据库、HTTP、队列、缓存、权限中间件和前端联调。
- M3/M5/M6/M9 跨组字段与运行确认。
- 真实 L3 数据上的 MAE/MAPE/覆盖率，当前按设计为 `NOT_EVALUATED`。
- M10 的干净环境复现。
