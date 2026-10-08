# AI4-01 固定句向量候选

日期：2026-10-08。本次仅推进 M7 AI4-01—03，真实公平对比属于 AI4-04。当前正式启用仍为 NO_GO；评估集封存、事先批准的门槛及正式阶段输入未齐。模型选择不表示优于 Phase 3。

## 来源、许可与版本

候选采用北京智源研究院公开的 [BAAI/bge-small-zh-v1.5](https://huggingface.co/BAAI/bge-small-zh-v1.5)，固定 revision `7999e1d3359715c523056ef9478215996d62a620`，不能按浮动 main 加载。官方模型卡标注 MIT，官方 config 的 hidden_size=512、max_position_embeddings=512。来源及许可核验时间为 2026-10-08；实际采用前仍由接收人核验适用范围。

只采用 safetensors 权重，不执行模型仓库的自定义代码。官方 model.safetensors 大小 95,827,648 字节，官方 LFS SHA256 `354763b9b1357bc9c44f62c6be2276321081ed2567773608c0d0785b61d5a026`。配置、tokenizer 和权重需逐文件锁定哈希；获取失败或不一致不得假装模型就绪。大权重不放入项目 Git、交付 ZIP 或依赖缓存源码。

机器可读候选参数见 [model-config.candidate.json](model-config.candidate.json)，实际从固定 revision 获取的六个配置/tokenizer/模型卡文件 SHA256 见 [source-provenance.json](source-provenance.json)。权重哈希当前仅核对官方 LFS 元数据，尚未下载权重或运行推理；不能用配置获取成功声明模型重复性已验证。

## 固定编码参数

- 中文查询前缀固定为“为这个句子生成表示以用于检索相关文章：”；只加到查询，文档不加。
- 文本预处理版本 m7-semantic-text-v1：Unicode NFKC、折叠空白；文档按标题、型号、类别展示名、描述的固定次序拼接。未知型号保持空值，不补造；价格、身份和状态继续作为结构化条件。
- 最大 token 长度 512（含特殊 token）；右侧截断，标题及型号先出现。保存实际截断信息或固定策略说明，不能称为无信息损失。
- CLS pooling，512 维 float32、L2 归一化；余弦仅表示相关程度，不能解释为成交或匹配概率。
- CPU 推理、eval 模式、禁用梯度、随机种子 0、单计算线程，batch size=16。依赖候选 torch 2.8.0 CPU、transformers 4.57.6；实际验证后记录完整锁定依赖和环境。跨硬件数值允许差异需另行预先约定，当前只承诺同配置复现检查。

上述 pooling 和 query/document 区别依据 [官方模型卡用法](https://huggingface.co/BAAI/bge-small-zh-v1.5#using-huggingface-transformers)。前处理、批量、线程与索引参数为本项目候选选择，未按 test_candidate 标签调优。

## 索引和排序候选配置

索引版本 m7-vector-index-v1，精确余弦检索；开发规模先采用 SQLite 持久化、固定 ID 顺序和版本校验，不冒充已接入 M6 的数据库或 pgvector。索引清单绑定模型 revision、逐文件哈希、维度、预处理版本、数据事实快照、schema 和索引版本。

融合版本 m7-hybrid-rrf-v1：RRF k=60，两列表权重各 1，候选深度最多 100，排序同分沿用 Phase 3 发布时间和数值 ID 顺序。这些是固定实验参数，不是已验证最优参数；只允许在开发集调整并另存版本。

AI4-02 与 AI4-03 的代码及实测状态分别见 [索引运行说明](vector-index-runbook.md)、[混合排序](hybrid-ranking.md) 和 [验证记录](verification.md)。缺模型、索引未就绪、版本冲突和运行失败时复用相同硬约束下的 Phase 3 基线，不开启通知或修改交易状态。
