"""Generate local authentication/RPC secrets without logging or replacing existing values."""

import argparse
import re
import secrets
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--rotate",
        action="store_true",
        help="Replace local auth/RPC keys; recreate running local API containers afterwards.",
    )
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    path = root / ".env"
    content = (
        path.read_text(encoding="utf-8")
        if path.exists()
        else (root / ".env.example").read_text(encoding="utf-8")
    )
    changed = False
    for name in ("AUTH_SIGNING_KEY", "BASELINE_RPC_TOKEN"):
        pattern = re.compile(r"^" + name + r"=(.*)$", re.MULTILINE)
        existing = pattern.search(content)
        if existing and existing.group(1).strip().strip("\"'") and not args.rotate:
            continue
        value = secrets.token_urlsafe(48)
        content = (
            pattern.sub(name + "=" + value, content)
            if existing
            else content.rstrip() + "\n" + name + "=" + value + "\n"
        )
        changed = True
    if changed:
        path.write_text(content, encoding="utf-8")
        path.chmod(0o600)
    print(
        "Local secrets rotated; recreate local API containers."
        if args.rotate
        else "Local .env ready; secrets were not printed. Existing nonempty values preserved."
    )


if __name__ == "__main__":
    main()
