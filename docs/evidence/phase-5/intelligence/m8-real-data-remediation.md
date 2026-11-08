# M8 真实成交数据三项补强

日期：2026-10-25。范围：只完善价格候选训练前的数据契约和门禁，不声称已经取得真实数据、训练模型或通过上线验收。

## 1. 授权与脱敏

`data/m8-phase4/authorization-status.json` 是当前授权状态的唯一登记文件，格式由 `schemas/m8-phase4/data-authorization.schema.json` 固定，现状保持 `PENDING`。M5 必须确认数据使用目的、保留周期和允许字段，M6 必须确认订单字段来源与导出边界；两人分别用自己的 OpenSSH Ed25519 私钥签署授权范围、角色、时间和 GitHub 审批证据。代码会使用 `data/m8-phase4/authorization-signers` 中登记的公钥验证签名；只填写姓名、时间和链接不再能通过。首次登记公钥须由成员本人提交，经 M1/M10 核验成员身份并 Review 后合入。私钥只能保存在成员本机安全位置，绝不提交。M8 不代签，也不把口头确认写成批准。

`schemas/m8-phase4/authorized-order-export.schema.json` 只允许价格评估所需字段。姓名、邮箱、学号、电话、买卖双方 ID、精确位置、聊天、举报证据、管理备注和设备 ID 均不允许进入导出。生成器遇到未知字段会整体失败，不会静默删除后继续训练。原始导出必须位于仓库外；输出样本只保留 HMAC-SHA256 伪名，密钥从 `M8_PSEUDONYMIZATION_KEY` 注入且不得提交。

授权记录先由 M5/M6 在 GitHub 记录实际审批，再分别运行下列命令签自己的部分。信任库中的角色公钥必须先完成 Review 登记；审批证据链接用于审计，签名证明对应私钥持有人确认了授权范围。

```powershell
ssh-keygen -t ed25519 -C campusloop-M5-data-approval -f "$env:USERPROFILE/.ssh/campusloop-m8-approval"
# Submit the .pub file for reviewed registration. Keep the private key local.
$approvalEvidence = 'https://github.com/Huang0283/CampusLoop/issues/129'
python -m services.m8_phase4.transaction_dataset sign-approval `
  --owner M5 `
  --key "$env:USERPROFILE/.ssh/campusloop-m8-approval" `
  --evidence $approvalEvidence
```

M6 用自己的密钥和实际审批记录执行同一命令，将 `M5` 换成 `M6`。不要填写示例占位符或伪造评论链接。两份签名都齐备后，`inspect-authorization` 才会通过授权这一项；其他数据量和评估门禁仍须独立通过。

## 2. 有效成交、退款和争议口径

当前保守口径由 `contracts/m8-phase4/readiness-policy.json` 固定：订单状态必须为 `COMPLETED`，买卖双方都确认完成，成交时间存在且时间顺序合法，订单未作废，`refundStatus=NONE` 且 `disputeStatus=NONE`。任何退款历史（包括已拒绝）或争议历史（包括已解决）都先排除，并在快照清单中按原因计数。后续若 M6/M5 决定允许某类已结案记录，必须升级 policy/schema 版本后重新封存，不能直接改数据绕过。

## 3. 200 条与类别切片门禁

原门禁只检查“已出现类别”，单一类别也可能误通过；v2 改为显式要求六个类别 `digital/books/household/clothing/sports/other` 每类至少 30 条，且合格 L3 总数至少 200 条。`services/m8_phase4/transaction_dataset.py` 会输出总量、各类别数量、排除原因、授权/策略/输入/快照 SHA-256 和密钥指纹。只有结果为 `READY_TO_FREEZE` 才可把快照交给后续训练；这仍只代表“允许训练”，不代表模型可以上线。

## 执行步骤

先检查当前授权（预期 `NO_GO`）：

```powershell
python -m services.m8_phase4.transaction_dataset inspect-authorization
```

M5/M6 正式批准并由 M6 在仓库外产生最小化 JSONL 后，使用至少 32 字节的独立密钥生成本地快照：

```powershell
$env:M8_PSEUDONYMIZATION_KEY = '<从安全渠道取得，不写入仓库>'
python -m services.m8_phase4.transaction_dataset build `
  --input C:/secure-campusloop-export/completed-orders.jsonl `
  --authorization data/m8-phase4/authorization-status.json `
  --output-dir C:/secure-campusloop-private/snapshot-v1
Remove-Item Env:M8_PSEUDONYMIZATION_KEY
```

真实原始导出、密钥和本地快照不得提交；代码会拒绝仓库内的输入和输出路径。生成器在快照目录同时写入价格样本、授权来源登记和哈希清单。可用 `python -m services.m8_phase4.verify --source-commit (git rev-parse HEAD) --output-dir C:/audit/m8-phase5 --dataset-dir C:/secure-campusloop-private/snapshot-v1` 让 readiness 实际读取该快照并核验其文件、授权和策略哈希。只在团队批准的证据位置保存不含身份信息的清单/哈希。门禁通过后，M8 才能训练并按既定 MAE、MAPE、区间覆盖率和类别/时间切片与规则基线比较；M10 独立复算，M1 决定是否上线，未签署前继续使用 `m8-price-rule-v1`。

## 当前结论

当前授权仍为 `PENDING`，仓库仍只有 12 条 L0 合成记录、0 条合格 L3。三项缺口已变成可执行且默认拒绝的流程，但真实数据依赖没有被伪造完成，所以结论仍是 `NO_GO`。

本次工作树在 Windows / Python 3.10.11 上完成完整复验：Phase 2 为 14/14，Phase 3 为 31/31，Phase 4（含新增门禁）为 36/36；两次证据生成结果一致。负向授权检查按预期以退出码 2 返回 `NO_GO`。这些结果证明门禁和回退实现可运行，不等于真实数据或模型验收通过。
