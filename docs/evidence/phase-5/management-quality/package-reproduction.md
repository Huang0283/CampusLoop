# 候选包解压复验

日期：2026-10-25；业务源码固定 50108a3。先解压初版候选的固定源码到新目录，逐项校验全部 MANIFEST 哈希，再在其中实际安装/构建。验证补充加入 verified 候选包；业务源码字节相同，最终包重新逐文件读回及解压校验。

- frontend：npm ci、npm run sdk:check、npm run build 均通过，日志 evidence/package-reproduction/。构建仍提示主包较大。
- backend：初次 docker build 在 pip 下载 fastapi 时遭遇 PyPI TLS EOF，保留失败记录。这不是版本不存在或端口冲突。用 Docker 预定义代理参数重试后实际联网安装依赖并构建成功，没有关闭证书校验或修改业务源码。
- 实际重试：`docker build --build-arg HTTP_PROXY=http://host.docker.internal:7890 --build-arg HTTPS_PROXY=http://host.docker.internal:7890 -f backend/Dockerfile -t campusloop-mq5-package:50108a3 .`。7890 是本机可用代理，其他电脑必须改成本机真实代理或在可直连网络去掉参数，不能盲抄当项目端口。
- 解压源码与新构建镜像再次执行完整后端 pytest，173 通过；独立审计库/Redis DB15，Worker 测试期间暂停并在 finally 恢复。backend-tests.json 含精确命令、退出码和耗时。这次复验是新依赖安装后的验证，未写日常数据库。

requirements.txt 直接依赖固定版本，但传递依赖没有完整锁定。原测试镜像 freeze 见 licenses/python-runtime-constraints.txt，包复验镜像 freeze 在本目录 evidence 中；这两个清单不能混称完全相同环境。若使用 Python 3.12 虚拟环境精确复现已审计依赖，可在合入质量材料后执行 `python -m pip install -r backend/requirements.txt -c docs/evidence/phase-5/management-quality/licenses/python-runtime-constraints.txt`。默认 Dockerfile 尚未接入这个质量约束清单，完整传递依赖锁定由 M9 后续接收，不能声称默认跨时间构建逐包相同。

这是候选源码包在新目录的复验，不是尚不存在的最终 tag 复验、另一台物理电脑复验或真实课堂签收。最终包的 SHA、逐文件清单和解压计数见 package-receipt.json，正式发布门禁仍 BLOCKED。
