"""T3-C30 只读复核脚本：数据资产哈希 + 基线指标重算一致性。

用法（在含 data/ 与 docs/evidence/phase-5/intelligence/ 的检出上执行）：

    python logs/c30-recompute-check.py --recomputed .codex-tmp/c30-baseline-reviewed

本脚本不写业务数据、不联网、不改动任何受版本控制的文件。
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

ARCHIVE = "docs/evidence/phase-5/intelligence/human-review/20261018-kkkkrui-v1/baseline"
METRICS = ("metrics-all.json", "metrics-dev.json", "metrics-test_candidate.json")


def find_root(start):
    for candidate in [start, *start.parents]:
        if (candidate / "docs/evidence/phase-5/intelligence/data-hashes.json").exists():
            return candidate
    return None


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=None)
    parser.add_argument("--recomputed", type=Path, required=True)
    args = parser.parse_args()

    root = args.root.resolve() if args.root else find_root(Path(__file__).resolve())
    if root is None or not (root / "docs/evidence/phase-5/intelligence").is_dir():
        print("FAIL: 找不到含 docs/evidence/phase-5/intelligence 的检出根目录，请用 --root 指定")
        return 2

    evidence = root / "docs/evidence/phase-5/intelligence"
    inventory = json.loads((evidence / "data-hashes.json").read_text(encoding="utf-8"))

    bad = []
    for asset in inventory["assets"]:
        path = root / asset["path"]
        if not path.exists():
            bad.append(f"missing {asset['path']}")
        elif sha256(path) != asset["sha256"]:
            bad.append(f"sha256 mismatch {asset['path']}")
    for key in ("dependencyLock", "producer", "schema"):
        path = root / inventory[key]["path"]
        if not path.exists():
            bad.append(f"missing {inventory[key]['path']}")
        elif sha256(path) != inventory[key]["sha256"]:
            bad.append(f"sha256 mismatch {inventory[key]['path']}")

    print(
        f"datasetVersion={inventory['datasetVersion']} "
        f"assets={inventory['assetCount']} verified={inventory['assetCount'] + 3} "
        f"failed={len(bad)}"
    )
    for line in bad:
        print("  " + line)

    recomputed = args.recomputed.resolve()
    archive = root / ARCHIVE
    differs = []
    for name in METRICS:
        new, old = recomputed / name, archive / name
        if not new.exists():
            differs.append(f"missing recomputed {name}")
        elif new.read_bytes() != old.read_bytes():
            differs.append(f"bytes differ {name}")
        else:
            print(f"identical {name}")
    for line in differs:
        print("  " + line)

    ok = not bad and not differs
    print("C30_RESULT:" + ("PASS" if ok else "FAIL"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
