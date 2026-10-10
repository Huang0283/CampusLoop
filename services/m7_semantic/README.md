# M7 Phase 4 私有语义搜索候选

实现 AI4-01—03；AI4-04 输出同口径诊断对比，未封存数据不能用于正式上线决定。公共服务仍使用 P3 基线。模型卡与任务状态见 [阶段入口](../../docs/evidence/phase-4/intelligence/README.md)。

## 环境与模型

已验证 Windows AMD64 / Python 3.12.14 / CPU。独立虚拟环境安装完整锁：

```powershell
python -m pip install --extra-index-url https://download.pytorch.org/whl/cpu -r services/m7_semantic/requirements.windows-cpu.lock.txt
python -m services.m7_semantic.download --model-dir C:/models/bge-small-zh-v1.5-7999e1d
```

网络需要代理时，为下载命令附加 `--proxy http://127.0.0.1:7897`，不修改系统设置。七个来源文件哈希均必须匹配。服务推理不会自行下载模型；缺文件或哈希错误明确降级。Windows CPU wheel 锁不代表 Linux/macOS 已验证，其他平台须重新记录环境并复验。完整依赖安装较大，交付包不附模型和环境。

## 索引与查询

在仓库根目录执行，下列索引目录需已存在。重建会替换指定私有索引，只能使用权威新快照。

```powershell
python -m services.m7_semantic build --model-dir C:/models/bge-small-zh-v1.5-7999e1d --index C:/evidence/m7.sqlite --products data/m7-phase2/derived/products.jsonl
python -m services.m7_semantic update --model-dir C:/models/bge-small-zh-v1.5-7999e1d --index C:/evidence/m7.sqlite --products C:/evidence/product-changes.jsonl
python -m services.m7_semantic query --model-dir C:/models/bge-small-zh-v1.5-7999e1d --index C:/evidence/m7.sqlite --products data/m7-phase2/derived/products.jsonl --request C:/evidence/request.json
```

`request.json` 是请求 schema 中的一个完整对象（含固定 asOf）；可从 requests.jsonl 提取一行用于实验。匹配必须由可信调用者传入求购发布者身份和当时商品事实，不是公开身份认证接口。`--sort` 支持 relevance/newest/price_asc/price_desc。增量下架可传状态更新；带版本删除由 `VectorIndex.delete(productId, version)` 调用。构建/更新输入使用与当前 P3 相同的商品 schema，不虚构 M6 事件字段。

Python 入口：`Encoder.encode`、`VectorIndex.rebuild/upsert/delete/query`、`hybrid.rank`。调用 hybrid.rank 必须显式 `experimental=True` 才尝试候选；它不修改部署门禁或公开 HTTP 路由。预算、状态、本人商品、可见性、型号、地点和未知条件由原基线校验先行处理。商品事实过时或模型/字典/索引身份不一致时返回明确基线降级原因。

## 对比与完整复现

```powershell
python -m unittest discover -s services/m7_semantic/tests -v
python -m services.m7_semantic.evaluate --model-dir C:/models/bge-small-zh-v1.5-7999e1d --output-dir C:/evidence/p4-evaluation
python -m services.m7_semantic.verify --model-dir C:/models/bge-small-zh-v1.5-7999e1d --output-dir C:/evidence/p4-verification
```

输出目录必须为空。evaluate 支持 `--review-archive`，复用 P3 真实记录验证入口；缺记录不会自动写成“人工复核已归档”。当前始终为 DIAGNOSTIC_ONLY、正式 NO_GO。统一指标脚本可重新计算 `evaluation-input-{all,dev,test_candidate}.json`。verify 在真实 Git 检出运行并保存提交号；导出包无 .git 时不得当作正式独立验收来源。

未实现生产并发、索引热切换、硬超时取消、M6/outbox 写入及页面接入；这些属于共同任务 AI4-09 和后续集成。当前 CLI 只用于本机技术候选验证。
