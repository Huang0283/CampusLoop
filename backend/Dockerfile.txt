# CampusLoop API 镜像（BP2-09）
FROM python:3.12-slim

# v5（2026-10-12）：apt 源切换清华 TUNA 镜像——
# 国内直连 deb.debian.org（Fastly CDN）晚高峰常见 502 Bad Gateway /
# 几 kB/s 慢速（实测留档：clean-env-verify-20261012-200215.log）。
# 只改下载通道，包与版本完全不变；海外网络同样可用。
RUN sed -i 's@deb.debian.org@mirrors.tuna.tsinghua.edu.cn@g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv/campusloop

# 先装依赖，利用 Docker 层缓存
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

COPY . .

# 非 root 运行（教学项目基线安全要求）
RUN useradd --create-home appuser && chown -R appuser:appuser /srv/campusloop
USER appuser

EXPOSE 8000

# 容器启动即执行迁移 + 种子 + 启动服务；
# --check 保证种子幂等性在每次部署时被真实校验（失败则拒绝启动）
CMD ["sh", "-c", "alembic upgrade head && python scripts/seed.py --check && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
