# CampusLoop API 镜像（BP2-09）
FROM python:3.12-slim

# 容器内健康检查用 curl；libpq 由 psycopg[binary] 自带
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv/campusloop

# 先装依赖，利用 Docker 层缓存
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 非 root 运行（教学项目基线安全要求）
RUN useradd --create-home appuser && chown -R appuser:appuser /srv/campusloop
USER appuser

EXPOSE 8000

# 容器启动即执行迁移 + 种子 + 启动服务；
# --check 保证种子幂等性在每次部署时被真实校验（失败则拒绝启动）
CMD ["sh", "-c", "alembic upgrade head && python scripts/seed.py --check && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
