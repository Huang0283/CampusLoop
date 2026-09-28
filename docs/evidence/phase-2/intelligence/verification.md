# Phase 2：M7 前三项验证记录

2026-09-28 修订提示：下文是 v1 的 Windows 本地历史验证，不能据此宣称跨平台实机通过。当前 v1.1 的 LF 固定、28 项测试、Git 检出及依赖说明见 [portability-review.md](portability-review.md) 与 evidence/portability-v1.1/；旧日志保留用于追溯。

日期：2026-09-26。性质：本会话本地自动验证，非 M8 互审、M10 独立验收或真实业务服务测试。

## 1. 安装与命令

在仓库/交付包根目录使用 Python 3.12 建议环境执行；依赖锁文件包含本次实际使用的六个固定版本。

```text
python -m pip install -r scripts/m7_phase2/requirements.txt
python -m unittest discover -s scripts/m7_phase2 -p test_pipeline.py -v
python scripts/m7_phase2/pipeline.py verify --bundle-dir data/m7-phase2/derived
python scripts/m7_phase2/pipeline.py build --output-dir work/m7-phase2-rebuild
```

build 输出目录必须不存在或为空；若已经有产物，选择新的目录名，不覆盖原始标签或评审结果。verify 会在临时目录重建并清理临时文件，不修改被核查的包。

本机默认 Python 不带 pip，本次使用 Codex 附带的 Python 和工作目录内独立依赖路径运行。可移植命令如上；具体解释器、版本、环境、命令参数、时间、退出码及日志路径记在交付包根目录 evidence/run-record.json。环境适配不改变数据与候选规范。

## 2. 验证范围与结果

26 项自动测试覆盖精确金额、Unicode 规范化、重复记录/版本、缺必填字段、额外字段、未知状态/类别、无时区时间、预算倒置、匹配身份、缺标签对、当前快照与审计、预算等值/超一分、0 元、缺信息、已知失败优先、权限/自匹配、已售/预约/隐藏/删除、到期等值、地点/型号、分组重现、重复模板/文本合组、原始/处理文件篡改，以及禁止覆盖输出。

原始日志在交付包 evidence/tests.log；数据 build、verify 的原始输出分别为 evidence/build.log、evidence/verify.log。负例测试注入错误并确认程序拒绝，这些预期拒绝不是测试失败。报告中的业务状态结论只对合成输入成立。

数据结果：84 原始快照→72 当前商品，12 条淘汰快照审计；38 请求、228 对标签；标签 2/1/0/U 分别 85/24/117/2。dev 48 商品/26 请求/156 对；test_candidate 24 商品/12 请求/72 对。完整计数和缺失统计见 [summary.json](../../../../data/m7-phase2/derived/summary.json)。

本轮没有原始坏行被静默丢弃；数据检查失败会停止构建，错误信息和非零退出码输出到 stderr。规范允许的 condition/model 缺失各 1 项保留，产生 2 个 U；另保留一个到期求购边界，三条请求按记录排除主相关性比较。

## 3. 版本与验收边界

验证记录生成时的历史基准为 d6e61b6806b48ccf67e5ae64b2d36b5f6b7a6548；当前 PR #71 已在 40173f8b31223e956fa4b247da513e8398385e16 上重放交付。manifest 锁定实际输入、输出、schema、脚本和依赖哈希；交付包 FILES.sha256.json 补充所有随包文件的校验值。

未执行：真实 HTTP/数据库/通知、检索效果评估、人工双人标注、非作者干净环境复现、M6 业务字段冻结、M1 阶段收口。不能从自动测试通过推导这些事项已完成。
