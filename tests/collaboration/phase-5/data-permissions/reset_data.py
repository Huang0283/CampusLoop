"""Default dry-run; soft-delete owned products and close owned wanted posts only."""

import json

from runtime import ApiError, arguments, open_state, save, token_for


def reset(args):
    path, state, client = open_state(args)
    blocked = []
    changed = 0
    for kind, route, owner_field in (
        ("products", "products", "seller"),
        ("wanted", "wanted", "owner"),
    ):
        for fid, record in state[kind].items():
            if not record.get("id"):
                blocked.append(f"{fid}: unresolved create; inspect idempotency record")
                continue
            account = state["accounts"][record["ownerAlias"]]
            token, _ = token_for(client, account)
            try:
                actual = client.call("GET", f"/{route}/{record['id']}", token=token)
            except ApiError as exc:
                if exc.status == 404 and record.get("reset"):
                    continue
                raise
            if (
                actual[owner_field]["id"] != account["id"]
                or actual["title"] != record["payload"]["title"]
                or not actual["title"].startswith(f"[{state['prefix']}/{fid}] ")
            ):
                raise ValueError("Reset ownership/prefix mismatch; refusing mutation")
            if kind == "products" and actual["status"] in {"RESERVED", "SOLD"}:
                blocked.append(f"{fid}: transaction state; use a new run ID")
                continue
            if args.apply:
                client.call("DELETE", f"/{route}/{record['id']}", token=token)
                record["reset"] = True
                changed += 1
                save(path, state)
    blocked.append(
        "Accounts/media/history retained: no namespace-safe deletion API; use a new run ID"
    )
    if args.apply:
        state["lifecycle"] = "reset-partial"
        state["resetBlocked"] = blocked
        save(path, state)
    print(
        json.dumps(
            {
                "dryRun": not args.apply,
                "products": len(state["products"]),
                "wanted": len(state["wanted"]),
                "changed": changed,
                "blocked": blocked,
            },
            ensure_ascii=False,
        )
    )
    return 2 if args.apply else 0


if __name__ == "__main__":
    parser = arguments(__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply supported cleanup; retained resources exit 2",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Explicit default; incompatible with --apply",
    )
    try:
        args = parser.parse_args()
        if args.apply and args.dry_run:
            parser.error("--apply and --dry-run are mutually exclusive")
        raise SystemExit(reset(args))
    except (RuntimeError, ValueError, OSError) as exc:
        print(f"Reset failed: {exc}")
        raise SystemExit(1) from None
