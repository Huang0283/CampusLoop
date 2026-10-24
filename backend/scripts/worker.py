"""Worker 独立容器入口（BP4-07，M9）。

用法（compose worker 服务 / 手动）：
    python scripts/worker.py

与 scripts/serve.py 相同的路径自举约定；进程行为见 app/worker/runner.py。
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.worker.runner import main

if __name__ == "__main__":
    raise SystemExit(main())
