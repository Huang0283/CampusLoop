"""Verify every fixture family; optionally reconcile actual audit API resources."""

import argparse
import csv
import hashlib
import json
import sys
from collections import Counter
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

from jsonschema import Draft202012Validator, FormatChecker
from PIL import Image
from runtime import (
    BASE,
    ROOT,
    ApiError,
    arguments,
    digest,
    open_state,
    public_media_hash,
    read,
    save,
    token_for,
)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def verify_static(base=BASE):
    sys.path.insert(0, str(ROOT / "backend"))
    sys.path.insert(0, str(ROOT))
    from pydantic import ValidationError

    from app.schemas import auth, business
    from services.m8_baseline.engine import (
        ServiceError,
        price_advice,
        risk_clues,
        trust_summary,
    )

    counts = {
        "accounts": 8,
        "products": 60,
        "wanted": 12,
        "invalid-inputs": 24,
        "mock-responses": 20,
        "search-checks": 30,
        "price-checks": 24,
        "trust-risk-checks": 12,
        "scenario-inputs": 12,
    }
    data = {}
    for name, count in counts.items():
        rows = json.loads((base / (name + ".json")).read_text(encoding="utf-8"))
        require(
            isinstance(rows, list) and len(rows) == count,
            f"{name}: expected {count} rows",
        )
        ids = [r.get("fixtureId", r.get("alias", r.get("scenarioId", r.get("id")))) for r in rows]
        require(
            None not in ids and len(ids) == len(set(ids)),
            f"{name}: missing/duplicate IDs",
        )
        data[name] = rows
    accounts = {r["alias"]: r for r in data["accounts"]}
    require(set(accounts) == set("ABCDEZRS"), "Account aliases differ from contract")
    for alias, row in accounts.items():
        require(
            row["role"] == ("ADMIN" if alias in "RS" else "USER"),
            "Account role mismatch",
        )
        require(
            not ({"email", "password", "accessToken"} & row.keys()),
            "Credentials in fixture",
        )
    with (base / "media-manifest.csv").open(encoding="utf-8", newline="") as stream:
        media = list(csv.DictReader(stream))
    require(
        len(media) == 12 and len({m["fixtureId"] for m in media}) == 12,
        "Media manifest: 12 distinct definitions required",
    )
    valid = {m["fixtureId"] for m in media if m["valid"] == "true"}
    require(len(valid) == 8, "Eight valid media required")
    from generate_media import invalid_bytes

    generated = {
        name: (content, mime, status, code) for name, content, mime, status, code in invalid_bytes()
    }
    require(
        Counter(m["mime"] for m in media if m["valid"] == "true")
        == {"image/jpeg": 4, "image/png": 4},
        "Media type quota",
    )
    for row in media:
        path = (base / row["path"]).resolve()
        require(path.is_relative_to(base.resolve()), "Media path escapes fixture directory")
        require(row["license"] == "CC0-1.0" and row["source"], "Missing media provenance")
        if row["valid"] == "false":
            require(path.name in generated, "Unknown negative media generator")
            content, mime, status, code = generated[path.name]
            require(
                (
                    int(row["size"]),
                    row["sha256"],
                    row["mime"],
                    int(row["expectedStatus"]),
                    row["expectedCode"],
                )
                == (
                    len(content),
                    hashlib.sha256(content).hexdigest(),
                    mime,
                    status,
                    code,
                ),
                "Negative media definition differs from reproducible generator",
            )
        if row["valid"] == "true" or path.exists():
            require(path.is_file(), f"Missing media: {row['path']}")
            require(
                path.stat().st_size == int(row["size"]) and digest(path) == row["sha256"],
                f"Media hash/size mismatch: {row['fixtureId']}",
            )
        if row["valid"] == "true":
            with Image.open(path) as image:
                require(
                    "image/" + image.format.lower() == row["mime"],
                    "Media MIME mismatch",
                )
                image.verify()
    products = {r["fixtureId"]: r for r in data["products"]}
    require(set(products) == {f"P{i:03d}" for i in range(1, 61)}, "Product ID coverage")
    require(
        len({r["title"] for r in products.values()}) == 60,
        "Product titles must be distinct",
    )
    fields = {
        "title",
        "description",
        "category",
        "condition",
        "price",
        "originalPrice",
        "campusLocation",
    }
    for row in products.values():
        require(
            row["ownerAlias"] in "ABCD" and row["caseIds"],
            "Product owner/case reference",
        )
        require(
            set(row["imageFixtureIds"]) <= valid,
            "Unknown/invalid product media reference",
        )
        require(
            len(row["imageFixtureIds"]) == len(set(row["imageFixtureIds"])),
            "Duplicate product media",
        )
        business.ProductWrite.model_validate(
            {**{k: row[k] for k in fields}, "images": row["imageFixtureIds"]}
        )
    categories = ["BOOKS", "DIGITAL", "DAILY", "SPORTS", "clothing", "other"]
    basic = data["products"][:48]
    for category in categories:
        rows = [r for r in basic if r["category"] == category]
        require(len(rows) == 8, f"{category}: base count")
        require(
            Counter(r["condition"] for r in rows)
            == {c: 2 for c in ("NEW", "LIKE_NEW", "GOOD", "FAIR")},
            f"{category}: condition quota",
        )
        require(
            sorted(r["price"] for r in rows) == [0.01, 10, 25, 50, 100, 200, 500, 1000],
            f"{category}: price quota",
        )
        require(
            Counter(len(r["imageFixtureIds"]) for r in rows) == {1: 4, 2: 4},
            f"{category}: image quota",
        )
    require(
        Counter(r["category"] for r in data["products"][48:]) == {c: 2 for c in categories},
        "Scenario product categories",
    )
    future = (datetime.now(UTC) + timedelta(days=7)).isoformat()
    for row in data["wanted"]:
        require(
            row["ownerAlias"] in "ABCD" and row["expireAt"] == "+7d" and row["caseIds"],
            "Wanted metadata",
        )
        business.WantedWrite.model_validate(
            {
                **{
                    k: row[k]
                    for k in (
                        "title",
                        "description",
                        "budgetMin",
                        "budgetMax",
                        "condition",
                        "location",
                    )
                },
                "expireAt": future,
            }
        )
    require(
        Counter(r["status"] for r in data["wanted"]) == {"OPEN": 8, "CLOSED": 4},
        "Wanted status quota",
    )
    scenarios = data["scenario-inputs"]
    require(
        {r["productFixtureId"] for r in scenarios} == {f"P{i:03d}" for i in range(49, 61)},
        "Scenario product references",
    )
    for row in scenarios:
        require(
            row["sellerAlias"] == products[row["productFixtureId"]]["ownerAlias"]
            and row["buyerAlias"] in accounts
            and row["buyerAlias"] != row["sellerAlias"],
            "Scenario role mapping",
        )
    rejected = 0
    bindings = {
        "$OWNED_M01": "https://example.invalid/owned.jpg",
        "$FUTURE_ISO": future,
        "$NEW_EMAIL": "new@example.invalid",
        "$EXISTING_EMAIL": "existing@example.invalid",
        "$RUNTIME_PASSWORD": "Synthetic-Local-Password-Only",
    }

    def bind(value):
        if isinstance(value, list):
            return [bind(v) for v in value]
        if isinstance(value, dict):
            return {k: bind(v) for k, v in value.items()}
        return bindings.get(value, value) if isinstance(value, str) else value

    for row in data["invalid-inputs"]:
        require(
            row["basis"] and row["caseIds"] and row["expectedStatus"] in {422, 409},
            "Invalid-input contract evidence",
        )
        schema = getattr(auth if row["target"] == "auth" else business, row["schema"])
        try:
            schema.model_validate(bind(row["payload"]))
        except ValidationError:
            require(row["expectedStatus"] == 422, "Unexpected negative schema expectation")
            rejected += 1
        else:
            require(
                row["id"] in {"INV-14", "INV-18"},
                f"Negative sample unexpectedly accepted: {row['id']}",
            )
    contract = json.loads((base / "response-contract.json").read_text(encoding="utf-8"))
    openapi_hash = hashlib.sha256(
        (ROOT / "openapi/campusloop.v1.yaml").read_text(encoding="utf-8").encode()
    ).hexdigest()
    require(contract["openapiSha256"] == openapi_hash, "Response contract snapshot is stale")
    for row in data["mock-responses"]:
        require(row["kind"] == "MOCK_RESPONSE", "Mock must be explicitly labelled")
        schema = {"$ref": "#/$defs/" + row["schema"], "$defs": contract["schemas"]}
        Draft202012Validator(schema, format_checker=FormatChecker()).validate(row["body"])
        require(
            (row["body"]["code"] == 0) == (row["status"] == 200),
            "Mock status/envelope mismatch",
        )
        if row["scenario"] == "loading":
            require(row["delayMs"] > 0, "Loading mock lacks delay")
    for category in categories:
        rows = [r for r in data["search-checks"] if r["filters"]["category"] == category]
        require(
            {r["kind"] for r in rows} == {"exact", "synonym", "purpose", "structured", "no_answer"},
            "Search coverage",
        )
    for row in data["search-checks"]:
        refs = row["acceptableProductFixtureIds"] + row["keywordExpectedProductFixtureIds"]
        require(
            set(refs) <= products.keys() and row["reason"] and row["caseIds"],
            "Search references/evidence",
        )
        matches = {
            p["fixtureId"]
            for p in products.values()
            if p["category"] == row["filters"]["category"]
            and row["query"].lower() in (p["title"] + " " + p["description"]).lower()
            and ("condition" not in row["filters"] or p["condition"] == row["filters"]["condition"])
        }
        require(
            matches == set(row["keywordExpectedProductFixtureIds"]),
            "Search keyword oracle differs from snapshot",
        )
        require(
            row["kind"] != "no_answer" or not row["acceptableProductFixtureIds"],
            "No-answer oracle",
        )
    for category in categories:
        require(
            {r["kind"] for r in data["price-checks"] if r["category"] == category}
            == {"normal", "boundary", "insufficient", "invalid"},
            "Price coverage",
        )
    for row in data["price-checks"]:
        try:
            result = price_advice(row["serviceInput"])
        except ServiceError as exc:
            require(
                row["expected"]["httpStatus"] == exc.status
                and row["expected"]["status"] == exc.code,
                "Price rejection mismatch",
            )
        else:
            require(
                row["expected"]["httpStatus"] == 200
                and result["status"] == row["expected"]["status"],
                "Price rule status mismatch",
            )
            lower, upper = (
                result["intervalFen"]["lower"],
                result["intervalFen"]["upper"],
            )
            require(
                (lower is None and upper is None) or 0 <= lower <= upper,
                "Price interval order",
            )
    require(
        Counter(r["group"] for r in data["trust-risk-checks"])
        == {g: 3 for g in ("no_trade", "normal_trade", "cancel_report", "unavailable")},
        "Trust group coverage",
    )
    for row in data["trust-risk-checks"]:
        trust, risk = trust_summary(row["trustInput"]), risk_clues(row["riskInput"])
        expected = row["expected"]
        require(
            trust["status"] == expected["trustStatus"] and trust["score"] == expected["trustScore"],
            "Trust neutral/prior mapping mismatch",
        )
        require(
            risk["status"] == expected["riskStatus"] and not risk["enforcementExecuted"],
            "Risk mapping/enforcement mismatch",
        )
        require(
            row["labelLevel"] == "L0_SYNTHETIC" and row["basis"],
            "Synthetic fact provenance",
        )
    return {
        "inputs": counts,
        "media": 12,
        "schemaRejected": rejected,
        "semanticNegativesNotExecuted": 2,
        "mockSchemas": 20,
        "ruleChecks": 36,
        "transportUnavailableNotExecuted": 3,
        "permissionCasesNotExecuted": 36,
    }


def verify_live(args):
    path, state, client = open_state(args)
    aliases = set(state["accounts"])
    require(
        set("ABCDEZ") <= aliases <= set("ABCDEZRS"),
        "Unexpected/missing ordinary account aliases",
    )
    missing_admins = set("RS") - aliases
    if missing_admins:
        require(bool(state["blocked"]), "Missing admins must be reported as blockers")
    require(
        set(state["products"]) == {r["fixtureId"] for r in read("products.json")},
        "Product manifest coverage",
    )
    require(
        set(state["wanted"]) == {r["fixtureId"] for r in read("wanted.json")},
        "Wanted manifest coverage",
    )
    for kind in ("accounts", "products", "wanted"):
        ids = [r.get("id") for r in state[kind].values()]
        require(
            None not in ids and len(ids) == len(set(ids)),
            f"{kind}: unresolved/duplicate real IDs",
        )
    for alias, account in state["accounts"].items():
        if alias == "Z" and account["status"] == "DISABLED":
            try:
                client.call(
                    "POST",
                    "/auth/login",
                    {k: account[k] for k in ("email", "password")},
                )
            except ApiError as exc:
                require(
                    (exc.status, exc.code) == (423, "ACCOUNT_DISABLED"),
                    "Z disabled contract",
                )
            else:
                raise ValueError("Z remains active")
        else:
            _, profile = token_for(client, account)
            require(
                profile["email"] == account["email"] and profile["role"] == account["role"],
                "Account identity/role mismatch",
            )
    for kind, route, owner_field in (
        ("products", "products", "seller"),
        ("wanted", "wanted", "owner"),
    ):
        for fid, record in state[kind].items():
            token, _ = token_for(client, state["accounts"][record["ownerAlias"]])
            actual = client.call("GET", f"/{route}/{record['id']}", token=token)
            require(
                actual[owner_field]["id"] == state["accounts"][record["ownerAlias"]]["id"],
                "Live owner mismatch",
            )
            for key, value in record["payload"].items():
                if key == "originalPrice" and value is None:
                    require(actual.get(key) is None, "Unexpected original price")
                elif key == "expireAt":
                    require(
                        datetime.fromisoformat(actual[key].replace("Z", "+00:00"))
                        == datetime.fromisoformat(value),
                        "Expiry mapping mismatch",
                    )
                else:
                    require(actual.get(key) == value, f"{fid}: persisted {key} mismatch")
            expected_status = (
                "ON_SALE"
                if kind == "products"
                else next(r["status"] for r in read("wanted.json") if r["fixtureId"] == fid)
            )
            require(actual["status"] == expected_status, f"{fid}: status mismatch")
    for alias in {r["ownerAlias"] for r in state["products"].values()}:
        token, _ = token_for(client, state["accounts"][alias])
        rows = client.call("GET", "/products/mine?pageSize=100", token=token)
        expected = {r["id"] for r in state["products"].values() if r["ownerAlias"] == alias}
        require(
            {r["id"] for r in rows["items"]} == expected
            and rows["pagination"]["total"] == len(expected),
            "Duplicate or missing owner products",
        )
    for owner_image, record in state["media"].items():
        alias, image_id = owner_image.split(":")
        require(
            record["url"].startswith(
                state["environment"]["mediaBase"] + f"/product/{state['accounts'][alias]['id']}/"
            ),
            "Media ownership/scope mismatch",
        )
        source = next(
            p for p in (BASE / "media").glob(image_id + ".*") if p.suffix in {".jpg", ".png"}
        )
        require(digest(source) == record["sourceSha256"], "Upload source hash mismatch")
        require(
            public_media_hash(record["url"]) == record["storedSha256"],
            "Stored media hash mismatch",
        )
    real_to_fixture = {r["id"]: fid for fid, r in state["products"].items()}
    for row in read("search-checks.json"):
        # Compare only this namespace while traversing every API page.
        actual, page = set(), 1
        while True:
            query = urlencode(
                {"query": row["query"], **row["filters"], "pageSize": 100, "page": page}
            )
            result = client.call("GET", "/products?" + query)
            actual.update(
                real_to_fixture[r["id"]] for r in result["items"] if r["id"] in real_to_fixture
            )
            if page * 100 >= result["pagination"]["total"]:
                break
            page += 1
        require(
            actual == set(row["keywordExpectedProductFixtureIds"]),
            f"Live search mismatch: {row['id']}",
        )
    save(path, state)
    return {
        "created": {
            "accounts": len(aliases),
            "products": len(state["products"]),
            "wanted": len(state["wanted"]),
        },
        "rejected": 0,
        "blocked": state["blocked"],
        "liveSearchChecks": 30,
        "softwareSha": state["environment"]["softwareSha"],
    }


if __name__ == "__main__":
    preliminary = argparse.ArgumentParser(add_help=False)
    preliminary.add_argument("--live", action="store_true")
    flags, rest = preliminary.parse_known_args()
    parser = arguments(__doc__) if flags.live else argparse.ArgumentParser(description=__doc__)
    try:
        args = parser.parse_args(rest)
        report = {"static": verify_static()}
        if flags.live:
            report["live"] = verify_live(args)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        raise SystemExit(2 if flags.live and report["live"]["blocked"] else 0)
    except Exception as exc:
        print(f"Verification failed: {type(exc).__name__}: {exc}")
        raise SystemExit(1) from None
