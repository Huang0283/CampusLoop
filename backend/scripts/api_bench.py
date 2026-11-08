"""BP5-09（M9）：API 并发读基线（回归口径，非吞吐量证明）。

对只读端点做受控并发请求，输出延迟分位数与错误计数，结果记入
platform-test-report.md，与 phase-3 查询预算同属"回归基线"性质：
用于发现并发下的异常劣化/报错，不用于宣称吞吐能力。

用法（仓库根目录，服务运行中）：
    python backend/scripts/api_bench.py
    python backend/scripts/api_bench.py --url http://localhost:8001/health \
        --concurrency 10 --requests 100

- 仅标准库（urllib + concurrent.futures），不新增依赖；
- 退出码：0=无错误且 p95 未超过阈值；1=有错误或超过 --max-p95-ms。
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import sys
import time
import urllib.request
from statistics import quantiles


def request_once(url: str, timeout: float) -> tuple[int, float, str]:
    """单次 GET，返回 (状态码, 耗时 ms, 错误说明)；成功时错误说明为空。"""
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            resp.read()
            code = resp.status
    except Exception as exc:  # noqa: BLE001（压测工具需把任何异常计为失败样本）
        return 0, (time.perf_counter() - start) * 1000, f"{type(exc).__name__}: {exc}"
    return code, (time.perf_counter() - start) * 1000, ""


def main() -> None:
    parser = argparse.ArgumentParser(description="API 并发读基线")
    parser.add_argument("--url", default="http://localhost:8001/health")
    parser.add_argument("--concurrency", type=int, default=10)
    parser.add_argument("--requests", type=int, default=100, help="总请求数")
    parser.add_argument("--timeout", type=float, default=5.0)
    parser.add_argument("--max-p95-ms", type=float, default=2000.0, help="p95 告警阈值")
    args = parser.parse_args()

    print(
        json.dumps(
            {
                "url": args.url,
                "concurrency": args.concurrency,
                "requests": args.requests,
            },
            ensure_ascii=False,
        )
    )

    latencies: list[float] = []
    errors: list[str] = []
    codes: dict[int, int] = {}
    start = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = [pool.submit(request_once, args.url, args.timeout) for _ in range(args.requests)]
        for future in concurrent.futures.as_completed(futures):
            code, ms, err = future.result()
            latencies.append(ms)
            if err or code != 200:
                errors.append(f"code={code} {err}".strip())
                codes[code] = codes.get(code, 0) + 1
            else:
                codes[code] = codes.get(code, 0) + 1
    wall = time.perf_counter() - start

    ordered = sorted(latencies)
    p50 = ordered[len(ordered) // 2]
    p95 = quantiles(ordered, n=20)[-1] if len(ordered) >= 2 else ordered[-1]
    p99 = quantiles(ordered, n=100)[-1] if len(ordered) >= 2 else ordered[-1]

    print(
        json.dumps(
            {
                "total": len(ordered),
                "ok": codes.get(200, 0),
                "failed": len(errors),
                "wallSeconds": round(wall, 2),
                "throughputPerSecond": round(len(ordered) / wall, 1) if wall else 0,
                "p50_ms": round(p50, 1),
                "p95_ms": round(p95, 1),
                "p99_ms": round(p99, 1),
                "max_ms": round(ordered[-1], 1),
                "statusCodes": codes,
                "errorSamples": errors[:3],
            },
            ensure_ascii=False,
            indent=2,
        )
    )

    if errors:
        print(f"[FAIL] 存在 {len(errors)} 个失败请求", file=sys.stderr)
        raise SystemExit(1)
    if p95 > args.max_p95_ms:
        print(f"[FAIL] p95={p95:.1f}ms 超过阈值 {args.max_p95_ms}ms", file=sys.stderr)
        raise SystemExit(1)
    print(f"[OK] 全部 {len(ordered)} 次请求成功，p95={p95:.1f}ms ≤ {args.max_p95_ms}ms。")


if __name__ == "__main__":
    main()
