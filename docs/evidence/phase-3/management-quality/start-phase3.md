# Phase3 启动、测试与人工地址

本机现在可手动验收的独立演示： http://localhost:5176/market ，API http://localhost:8003/docs 。卖家chen.demo@example.com，买家lin.demo@example.com，管理员admin.demo@example.com；本地模拟密码Demo@12345，不用于真实部署。

常用页面：/register、/login、/profile、/publish、/my-products、/favorites、/wanted、/wanted/publish、/publish/price-advice、/chat、/transactions、/notifications、/report、/admin。具体商品/会话/订单ID由页面链接进入，不给不存在的固定ID。刷新仍保持本人，退出再刷新是游客。

## 新电脑/独立项目启动

Docker与Python可用。在根目录运行以下命令，这组端口和独立Compose项目名避免覆盖旧Phase2、现有本机演示和OceanScope；端口如已占用可自行换空闲端口，不要删除其他项目。

```powershell
python backend/scripts/init_local.py
$env:CAMPUSLOOP_API_PORT = '8011'
$env:CAMPUSLOOP_DB_PORT = '15433'
$env:CAMPUSLOOP_REDIS_PORT = '16380'
$env:CAMPUSLOOP_STORAGE_PORT = '19002'
$env:CAMPUSLOOP_STORAGE_CONSOLE_PORT = '19003'
$env:CORS_ORIGINS = 'http://localhost:5177'
$env:AUTH_COOKIE_NAME = 'campusloop-independent-session'
docker compose -p campusloop-phase3-independent up -d --build
curl.exe -fsS http://localhost:8011/ready
cd frontend
npm ci
$env:VITE_API_BASE_URL = 'http://localhost:8011'
npm run dev -- --host 127.0.0.1 --port 5177 --strictPort
```

访问http://localhost:5177/market。首次镜像构建需要联网；MinIO源码镜像编译可能耗时，/ready通过后确认上传有效图片和规则接口。容器自动迁移0008、种子幂等检查、启动API/私有RPC/匹配worker。APP_ENV=dev，测试不要清除其Redis业务事实。

## 测试隔离

pytest只使用独立测试数据库/Redis14或15，并且同库没有运行API/worker；浏览器测试需要真实API/worker。先后执行，不能互相争抢。

本机测试UI5174→API8002，演示UI5176→API8003互相独立；切换宿主API时使用独立cookie名/浏览器context，localhost cookie不是按端口隔离。不要将测试库或生产数据库执行降base。

CI从全新数据库执行upgrade→downgrade base→upgrade→seed两次→pytest→真实浏览器。作者和独立验收的真实提交与结果见verification.md。

环境密钥通过init_local生成、不打印不提交。若需要轮换开发密钥，init_local.py --rotate后重建API容器，旧access需重新登录；生产部署使用受控secret，不使用本地MinIO默认密码。
