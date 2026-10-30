"""Create T1 foundation through normal APIs in an inspected local audit container."""

import csv
import json
import secrets
from datetime import UTC, datetime, timedelta
from pathlib import Path

from runtime import (
    BASE,
    ApiError,
    arguments,
    digest,
    open_state,
    public_media_hash,
    read,
    save,
    token_for,
)


def setup(args):
    path, state, client = open_state(args, create=True)
    state["blocked"] = []
    if args.admins:
        admins = json.loads(args.admins.read_text(encoding="utf-8"))
        for alias in ("R", "S"):
            if alias not in state["accounts"] and alias in admins:
                state["accounts"][alias] = admins[alias]
        save(path, state)
    for fixture in read("accounts.json"):
        alias = fixture["alias"]
        account = state["accounts"].get(alias)
        if fixture["role"] == "ADMIN":
            if not account:
                state["blocked"].append(f"{alias}: M10 administrator initialization required")
                continue
            _, profile = token_for(client, account)
            if profile["role"] != "ADMIN" or not account["email"].startswith(state["prefix"] + "-"):
                raise ValueError("Administrators must be namespace-owned audit accounts")
            account.update(id=profile["id"], role="ADMIN", status=profile["status"])
        else:
            if account and account.get("status") == "DISABLED":
                continue
            if account is None:
                account = {
                    "email": f"{state['prefix']}-{alias.lower()}@example.invalid",
                    "password": secrets.token_urlsafe(24),
                }
                state["accounts"][alias] = account
                save(path, state)
            try:
                if not account.get("id"):
                    result = client.call(
                        "POST",
                        "/auth/register",
                        {
                            "email": account["email"],
                            "password": account["password"],
                            "nickname": fixture["nickname"],
                        },
                    )
                    account["accessToken"] = result["accessToken"]
                    profile = result["user"]
                else:
                    _, profile = token_for(client, account)
            except ApiError as exc:
                if exc.status != 409:
                    raise
                _, profile = token_for(client, account)
            if profile["role"] != "USER":
                raise ValueError("Unexpected ordinary account role")
            account.update(id=profile["id"], role="USER", status=profile["status"])
        save(path, state)
    identities = [a["id"] for a in state["accounts"].values() if "id" in a]
    if len(identities) != len(set(identities)):
        raise ValueError("Account aliases must have distinct real IDs")

    with (BASE / "media-manifest.csv").open(encoding="utf-8", newline="") as stream:
        media = {row["fixtureId"]: row for row in csv.DictReader(stream) if row["valid"] == "true"}
    for fixture in read("products.json"):
        fid = fixture["fixtureId"]
        owner = state["accounts"][fixture["ownerAlias"]]
        token, _ = token_for(client, owner)
        record = state["products"].get(fid)
        if record and record.get("id"):
            actual = client.call("GET", f"/products/{record['id']}", token=token)
            if actual["seller"]["id"] != owner["id"] or actual["status"] != "ON_SALE":
                raise ValueError("Existing product changed; use a new run ID after T2 scenarios")
            continue
        if record is None:
            urls = []
            for image in fixture["imageFixtureIds"]:
                media_key = fixture["ownerAlias"] + ":" + image
                upload = state["media"].get(media_key)
                if upload and upload.get("pending"):
                    raise ValueError("Ambiguous upload; inspect audit media and use a new run ID")
                if upload is None:
                    state["media"][media_key] = {"pending": True}
                    save(path, state)
                    upload = client.upload(BASE / media[image]["path"], token)
                    expected_base = state["environment"]["mediaBase"] + f"/product/{owner['id']}/"
                    if not upload["url"].startswith(expected_base):
                        raise ValueError("Upload escaped audit media ownership scope")
                    upload["sourceSha256"] = digest(BASE / media[image]["path"])
                    upload["storedSha256"] = public_media_hash(upload["url"])
                    state["media"][media_key] = upload
                    save(path, state)
                urls.append(upload["url"])
            payload = {
                k: fixture[k]
                for k in (
                    "title",
                    "description",
                    "category",
                    "condition",
                    "price",
                    "originalPrice",
                    "campusLocation",
                )
            }
            payload.update(title=f"[{state['prefix']}/{fid}] {fixture['title']}", images=urls)
            record = {"ownerAlias": fixture["ownerAlias"], "payload": payload}
            state["products"][fid] = record
            save(path, state)
        result = client.call(
            "POST",
            "/products",
            record["payload"],
            token,
            key=f"{state['prefix']}-{fid}",
        )
        record["id"] = result["id"]
        save(path, state)

    for fixture in read("wanted.json"):
        fid = fixture["fixtureId"]
        owner = state["accounts"][fixture["ownerAlias"]]
        token, _ = token_for(client, owner)
        record = state["wanted"].get(fid)
        if record is None:
            payload = {
                k: fixture[k]
                for k in (
                    "title",
                    "description",
                    "budgetMin",
                    "budgetMax",
                    "condition",
                    "location",
                )
            }
            payload["title"] = f"[{state['prefix']}/{fid}] {fixture['title']}"
            payload["expireAt"] = (datetime.now(UTC) + timedelta(days=7)).isoformat()
            record = {"ownerAlias": fixture["ownerAlias"], "payload": payload}
            state["wanted"][fid] = record
            save(path, state)
        if not record.get("id"):
            result = client.call(
                "POST",
                "/wanted",
                record["payload"],
                token,
                key=f"{state['prefix']}-{fid}",
            )
            record["id"] = result["id"]
            save(path, state)
        actual = client.call("GET", f"/wanted/{record['id']}")
        if actual["owner"]["id"] != owner["id"]:
            raise ValueError("Wanted owner differs from manifest")
        if fixture["status"] == "CLOSED" and actual["status"] == "OPEN":
            client.call("DELETE", f"/wanted/{record['id']}", token=token)
        elif actual["status"] != fixture["status"]:
            raise ValueError("Wanted changed; use a new run ID")
    z = state["accounts"]["Z"]
    if "R" in state["accounts"]:
        admin_token, _ = token_for(client, state["accounts"]["R"])
        client.call(
            "PATCH",
            f"/admin/users/{z['id']}/status",
            {"status": "DISABLED", "reason": "Isolated T1 fixture"},
            admin_token,
        )
        z["status"] = "DISABLED"
        z.pop("accessToken", None)
    else:
        state["blocked"].append("Z: disabling requires initialized administrator R")
    save(path, state)
    print(
        json.dumps(
            {
                "accounts": len(identities),
                "products": len(state["products"]),
                "wanted": len(state["wanted"]),
                "blocked": state["blocked"],
            },
            ensure_ascii=False,
        )
    )
    return 2 if state["blocked"] else 0


if __name__ == "__main__":
    parser = arguments(__doc__)
    parser.add_argument(
        "--admins", type=Path, help="Private R/S email/password JSON; no role creation"
    )
    try:
        from verify_data import verify_static

        verify_static()
        raise SystemExit(setup(parser.parse_args()))
    except (RuntimeError, ValueError, OSError) as exc:
        print(f"Setup failed: {exc}")
        raise SystemExit(1) from None
