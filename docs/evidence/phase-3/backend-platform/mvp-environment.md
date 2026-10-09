# BP3-11 空库重建与端口

正式可复现路径（项目根）：

```powershell
python backend/scripts/init_local.py
docker compose up -d --build
cd frontend
npm ci
npm run dev
```

默认 API http://localhost:8001、前端 http://localhost:5173；内部 API 8000、PostgreSQL 5432、Redis 6379、MinIO 9000/9001。宿主这些存储端口占用时按 compose override 映射，不能杀别的项目。

本机隔离验收使用：测试 API 8002/Redis DB14/数据库 campusloop_phase3_verify；演示 API 8003/Redis DB13/数据库 campusloop_phase3_demo；存储宿主 15432/16379/19000/19001。OceanScope 8000/4173 未修改。测试前端 5174 指向 8002；当前演示前端 http://localhost:5176 指向8003，该Origin已加入API白名单。

容器 CMD 执行升级、种子幂等、serve.py；新库演示账号 chen.demo/lin.demo/zhao.demo/admin.demo@example.com，密码 Demo@12345，仅本地模拟。已有演示 scrypt 密码不被静默重置，新独立演示库为 Argon2id。

新 migration_audit 库已成功从空库升级、降 base、再升 head、seed --check；现有业务库只能正常升级。测试严禁手工改业务数据完成旅程。
