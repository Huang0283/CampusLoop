"""M7/M8 建议服务的独立容器入口（BP4-07，M9）。

背景（phase-3 -> phase-4 的拓扑变化）：
    phase-3：两个建议服务内嵌于 API 进程、仅绑定 127.0.0.1
             （"private loopback advisory services; no public RPC ports"）。
    phase-4：worker 独立成容器后，任务处理跨进程调用建议服务，环回内嵌
             不再可达，因此以独立容器承载。

安全边界（与 phase-3 策略等价，仅作用域从进程变为容器网络）：
- 绑定 0.0.0.0 但 compose 不发布宿主端口 -> 仅 compose 内网可达；
- BASELINE_RPC_TOKEN（>=32 字符）必需，语义与 phase-3 校验一致；
- API/worker 通过服务名访问（M7_SERVICE_URL=http://baseline:8787）。

用法：
    python scripts/baseline_services.py
"""

import json
import logging
import signal
import sys
import tempfile
import threading
from pathlib import Path
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.core.config import get_settings


def resolve_bindings(settings):
    """校验配置并返回 (host, m7端口, m8端口, store目录, 错误信息)。"""
    addresses = [urlsplit(url) for url in (settings.m7_service_url, settings.m8_service_url)]
    for address in addresses:
        if (
            address.scheme != "http"
            or address.path not in ("", "/")
            or address.username
            or address.query
            or address.fragment
        ):
            return None, None, None, None, f"advisory URL 不合规: {address}"
    if len(settings.baseline_rpc_token) < 32:
        return None, None, None, None, "BASELINE_RPC_TOKEN 必须至少 32 字符"
    ports = [address.port for address in addresses]
    if not all(isinstance(port, int) and 0 < port <= 65535 for port in ports):
        return None, None, None, None, f"M7/M8 端口缺失或不合法: {ports}"
    host = settings.baseline_bind_host or "0.0.0.0"
    data_dir = Path(settings.baseline_data_dir) if settings.baseline_data_dir else None
    return host, ports[0], ports[1], data_dir, None


def main():
    settings = get_settings()
    logging.basicConfig(level=settings.log_level, format="%(message)s")
    # 注：建议服务容器不持有登录密钥（AUTH_SIGNING_KEY）——最小权限，
    # 与 phase-3"建议服务与认证域隔离"的口径一致。

    host, m7_port, m8_port, data_dir, error = resolve_bindings(settings)
    if error:
        logging.getLogger("baseline").error("启动被拒绝：%s", error)
        return 2

    from services.m7_baseline.http_service import create_server as m7_server
    from services.m7_baseline.store import BaselineStore
    from services.m8_baseline.http_service import create_server as m8_server

    token = settings.baseline_rpc_token
    if data_dir is None:
        data_dir = Path(tempfile.mkdtemp(prefix="campusloop-advisory-"))
    store = BaselineStore(Path(data_dir) / "snapshots.sqlite")
    servers = [
        m7_server((host, m7_port), store, token),
        m8_server((host, m8_port), token),
    ]
    stop = threading.Event()

    def _shutdown(signum, _frame):
        logging.getLogger("baseline").info("收到信号 %s，建议服务开始退出。", signum)
        stop.set()

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)

    print(
        json.dumps(
            {
                "serviceVersions": ["m7-baseline-rpc-v1", "m8-baseline-rpc-v1"],
                "bind": host,
                "m7Port": m7_port,
                "m8Port": m8_port,
                "storeDir": str(data_dir),
            }
        ),
        flush=True,
    )
    try:
        # HTTPServer 不会自行 serve：必须在独立线程进入 serve_forever 循环，
        # 否则端口已绑定但永不处理请求（worker 侧表现为连接被拒 -> 降级）。
        threads = [
            threading.Thread(target=server.serve_forever, daemon=True)
            for server in servers
        ]
        for thread in threads:
            thread.start()
        while not stop.is_set():
            stop.wait(1)
    finally:
        for server in servers:
            server.shutdown()
            server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
