# 新商品双语翻译回归（2026-11-24）

执行人：维护者 Codex。数据均为合成校验内容，不是 T1/T2/T3 或 U01–U08 真人执行证据。

- `quality-real.json`：16 条完整标题词典以外的源文本、目标语言、语义检查与实际译文。检查配件包含/不包含、损坏、数量、品牌型号、原语言恢复及重复结果。部分结果命中本轮内存缓存，`seconds` 不是冷启动基准。追加四条涉及办公椅、平板、教材、台灯，没有为其新增词条或完整标题译文。
- `new-listing-results.json`：隔离环境真实图片上传/上架后生成的商品 ID、原文、连续两轮切换结果、原始数据库字段未改变、桌面/移动端无横向溢出的记录。账号邮箱、密码、令牌与 Cookie 不在记录内。

软件模型固定为 `tencent/HY-MT1.5-1.8B`，精确模型提交见运行结果 `modelRevision` 与 `services/catalog_translation_server.py`。以当前应用补丁为受测代码，软件提交见最终环境交接文档；此目录与补丁一同提交，不更改旧证据 SHA。

重跑：先准备并启动本机翻译服务，再运行 `python scripts/verify-catalog-translation-quality.py`。不加载模型的单测为 `python -m unittest discover -s services -p "test_catalog_translation_*.py" -v`，不创建账号或数据。真实新上架验证使用专用 `campusloop_audit_tgroup_20261124` 库、Redis DB14，不能指向日常数据库。

结果界限：以上验证不等于所有新商品翻译均准确，不是独立模型效果评估、真人体验或全部测试组交付完成；无法可靠还原受保护内容时会报翻译失败，页面保留原文。未复用失败的 INT8 量化输出。权重留在本机缓存，不提交 GitHub。
