# 2026-10-21 交付完整性修复

基点：PR #115 合并提交 `ad2bfc8056babb88af6b3590aea3d615ee95721e`。最后的用户材料提交 `f43c78623ce7489a3da6423954c421a14775f141` 将 Excel 替换为 `M7_审核结果_通过.xlsx` 并修改说明，未同步完整性清单，JSONL 的本地章节引用也失效。

本次保留替换后的 Excel 字节，保留全部 JSONL 标签、审核人和空的实际审核时间，仅修复清单与说明引用。新的清单只证明当前文件的字节完整性，不证明真人身份、独立审核、模型质量或正式准入。

## 原清单与修订轨迹

- 原工作簿 `M7_审核结果_通过_声明时间待核实.xlsx`：原 SHA-256 为 `1831ef6ffe7acf126cd72107fd6961794ecfffc65c8b101af6e1c3626f203ada`，现文件由上述用户提交替换；原件仍可从 Git 历史获取。
- 原清单登记的 `human-confirmation.md` SHA-256 为 `86d9b187af485e19094e5acb156073dd5c5005fe0d44dfb441feda8571382a50`。
- #115 合并时该说明实际 SHA-256 已变为 `bae0b0e62ecc5943f4e56c9f3d2a10d176748724217e6c41e3535b4abc740954`，且不再包含 JSONL 指向的章节。本次以明确的修复说明恢复该章节，不冒充当时原文。
- 本目录 `verification.json` 是替换前的历史验证，`originalFormulaValidationAndPanesPreserved` 不应用于替换后的工作簿。本次不声明重新验证了 Excel 单元格、公式或与 JSONL 的一致性；正式归档时需由提交人明确哪个文件是权威版本并核对差异。

## 回归检查

`python -m unittest discover -s scripts/m7_evaluation/tests -p test_delivery.py -v`

修复前实际捕获三项问题：工作簿路径不存在、说明哈希变化、引用章节不存在。修复后该检查应通过。正式数据准入 `check` 仍为 NOT_READY，NO_GO 不变；完整性通过不能被当作模型验收通过。
