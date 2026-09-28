# 复现审查处理：换行、Git 检出、依赖与接收说明

日期：2026-09-28；修订：m7-p2-data-v1.1。来源：用户提供的审查截图，经本地代码和字节核对后处理。旧 v1 导出包保留不变。

## 1. 结论与改动

| 审查意见 | 判断 | 本次处理 |
| --- | --- | --- |
| JSON/JSONL 默认换行导致跨平台字节重建失败 | 成立，需要修复；原先同机 Windows 验证不足以证明跨平台一致 | write_json/write_lines 显式 UTF-8、newline='\n'；保留严格字节哈希；重新构建全部 derived，发布 datasetVersion=m7-synthetic-p2-v1.1 |
| Git 自动换行可能改变被哈希文件 | 需要一并处理，仅修 writer 不够 | 新增限定于 M7 路径的 .gitattributes：数据/schema/契约样例 -text，保留原始字节；Python/requirements 固定 LF |
| AI2-02 人工复核、AI2-04 签字未完成 | 验收待办，不能用代码补签 | 保留 228 对待人工复核、签字表待填，不改成完成 |
| 分支名称应明确 | 合理的交接补充，不是本地数据缺陷 | 写明 phase2/intelligence-contracts 与 task/m7-p2-search-dataset-contract、最新基准及负责人；修复提交随 PR #71 推送 |
| rpds-py==2026.6.3 在审查者镜像缺失 | 不能由单一镜像推断版本不存在或锁定错误 | 官方版本存在；保留锁定，补充官方索引安装命令和平台说明 |

没有改变样本内容、标签、划分、种子、成色/地点语义或 ownerId 命名。原 raw/schema/requirements 字节保留，CSV 仍 UTF-8 BOM+LF；JSON/JSONL 输出统一 UTF-8 无 BOM+LF。新 manifest 更新生产脚本哈希、序列化版本、datasetVersion 以及受换行影响的输出哈希。不能用新清单冒充旧 v1 的复现实验。

`.gitattributes` 使用 -text 是为了保持已存在的 raw CRLF 和 schema 原字节，不是声称它们已转换为 LF；读取仍可用通用换行处理。禁止把 verify 改成“忽略换行后比较”来掩盖归档字节变化。首次接入仓库时须包含本文件对应的 .gitattributes；若目标仓库已跟踪同路径旧文件，检查 git add --renormalize 后暂存的实际差异及 manifest，禁止对全仓库无差别转换换行。

## 2. 验证方法与边界

新增两项回归：JSON/JSONL 字节必须无 CR、无 BOM，末尾 LF；分别模拟操作系统默认 LF/CRLF 写入后，全量构建的所有文件（含 manifest、CSV、split）字节完全相同。模拟通过替换 Path.open 在 newline=None 时的翻译规则实现，显式 newline 参数保持原义。

另外在独立临时 Git 测试仓库中加入真实 .gitattributes 与交付资产，分别以 core.autocrlf=true/false 克隆并运行 verify，比较检出后的所有资产字节。临时仓库的本地测试提交不属于 CampusLoop 项目提交，也未推送。

当前主机没有可运行的 WSL/Linux 环境。本次执行的是 **Windows 实际运行、LF/CRLF 规则模拟、两种真实 Git 检出配置**；不把它描述为 Linux/macOS 实机测试。M10 仍需在其干净环境运行下方命令。完整结果、原缺陷复现、语义/字节对比及环境见导出包 evidence/portability-v1.1/。

## 3. 依赖与复现命令

建议 CPython 3.12，使用独立虚拟环境。不要把 Windows 已安装的依赖目录复制到 Linux/macOS：rpds-py 含平台二进制，应在目标平台从锁文件重新安装。

```text
python -m venv .venv
# Windows 使用 .venv\Scripts\python.exe；Linux/macOS 使用 .venv/bin/python
python -m pip install -r scripts/m7_phase2/requirements.txt

# 若当前镜像缺少锁定版本，改用官方索引；不擅自换版本：
python -m pip install --index-url https://pypi.org/simple --only-binary=:all: -r scripts/m7_phase2/requirements.txt

python -m unittest discover -s scripts/m7_phase2 -p test_pipeline.py -v
python -m unittest discover -s scripts/m7_phase2 -p test_contracts.py -v
python scripts/m7_phase2/contract_check.py
python scripts/m7_phase2/pipeline.py verify --bundle-dir data/m7-phase2/derived
python scripts/m7_phase2/pipeline.py build --output-dir work/m7-rebuild-new
```

上面创建虚拟环境后，所有 python 命令都应替换为该环境解释器的实际路径，或先激活环境；build 目录必须不存在或为空。要求使用支持 Path.write_text(newline=...) 的 Python；本项目复现基准为 3.12，不承诺旧解释器兼容。

[PyPI 官方 2026.6.3 版本](https://pypi.org/project/rpds-py/2026.6.3/)存在，本机 CPython 3.12 Windows 已成功安装这六个锁定依赖。--only-binary=:all: 用于明确要求目标平台 wheel；若官方索引也找不到适配 wheel，应检查 Python 版本/架构，不自动改锁或悄悄引入 Rust 源码编译。必须换依赖版本时由 Owner 形成新锁、新 manifest 和复现记录。

## 4. 分支与仍未完成事项

正式计划：M7 使用 M1 确认的 phase2/integration 基准 40173f8 建立智能组 phase2/intelligence-contracts；个人分支 task/m7-p2-search-dataset-contract 从组分支创建，经 M8 交叉评审合回组分支，再按阶段流程集成。本次修复提交已随 PR #71 更新；测试仓库提交仍不计为项目交付 commit。

人工标注/复核、M3/M6/M9 签字、M10 非作者运行、M1 接收阶段基准均未代办或伪造。修复技术问题使材料可复现，不意味着这些验收条件自动满足。
