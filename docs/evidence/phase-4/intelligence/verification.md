# M7 Phase 4 验证说明

更新：2026-10-11。已按用户批准的 unittest 替代流程推进。缺失的 tdd 技能未被冒充为已安装；先建立保持 P3 降级行为的候选入口，再运行行为测试：三项中“无关键词重合仍通过向量召回”失败（空结果，而期待商品 101），其余两项通过。原始失败日志保存为 `evidence/m7-v1/red-initial.txt`；这是未提交的初始适配实现，不虚构其 Git 提交。

完成实现后运行候选入口、索引更新/删除、权限、硬条件、版本、解释、故障回退与评估输入一致性测试。初始真实评估曾因 Windows 进程内存读取的 ctypes 参数定义失败；已补齐指针类型，重新运行通过，失败未计作成功。首次失败日志亦归档。

最终可复现检查入口：

```powershell
python -m services.m7_semantic.verify --model-dir C:/models/bge-small-zh-v1.5-7999e1d --output-dir C:/evidence/p4-run
```

输出目录须为空。检查包括 Phase 4 单元测试、Phase 2/3 回归、M8 回归、两个独立进程的真实模型评估、同机编码重复性及逻辑索引重建、实际向量增量/墓碑、三套划分的指标命令重算。逐样本及指标文件要求字节一致；耗时、时间戳和进程内存不要求一致。最终证据位置为 `evidence/m7-v1/`，运行提交、环境、命令、返回值和依赖以 run-record.json 为准。

真实模型下载后校验七个固定哈希，加载只允许本地 safetensors、禁用自定义远程代码；验证进程设置离线模式。全部大权重与 SQLite 保留在本机缓存，Git 只提交来源清单、代码、依赖锁和文本证据。

上述均为作者技术验证，不能替代 M8 互审、M10 独立复现或 M1 的冻结签字。逐条复核待归档、评估集未封存与样本不足不会因模型运行成功自动解除。

## 本次实际结果

源码提交 `217d0e4f12ed7f21d55e5c4cff86d08efe6f6e2b` 的干净检出验证 PASS，共 196 项测试：Phase 4 33、Phase 2 116、M7 Phase 3 31、M8 Phase 3 16；全部返回成功。P2 还验证 29 个契约示例，原始资产哈希未变。两个独立进程的 8 个逐样本/指标文件字节一致，all/dev/test_candidate 均通过独立命令重算；实际向量增量/重复/旧事件/墓碑检查通过。

补做 Windows core.autocrlf=false/true 两种检出配置的真实模型评估，8 个确定性文件一致；这只是检出换行验证，不等同 Linux/macOS 推理验证。运行主记录见 [run-record.json](evidence/m7-v1/run-record.json)，测试计数见 [作者汇总](evidence/m7-v1/author-summary.json)。正式评估与成员签字仍待办。
