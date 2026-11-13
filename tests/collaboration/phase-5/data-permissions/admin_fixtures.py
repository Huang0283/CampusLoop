"""Additional search inputs and static checks; never execute business assertions."""

import csv
import json

from runtime import BASE, ROOT


def products_for_run(base=BASE, *, admin_search=False):
    rows = json.loads((base / "products.json").read_text(encoding="utf-8"))
    if admin_search:
        rows += json.loads((base / "admin-search-products.json").read_text(encoding="utf-8"))
    return rows


def verify_execution_log(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.reader(stream))
    columns = [
        "case_id",
        "title",
        "pre_condition",
        "input",
        "expected",
        "actual",
        "status",
        "executed_at",
        "evidence_path",
        "defect_id",
    ]
    if not rows or rows[0] != columns or any(len(row) != len(columns) for row in rows[1:]):
        raise ValueError("Execution log must have ten named columns on every row")
    if {row[0] for row in rows[1:]} != {f"T1-C{i:02d}" for i in range(1, 49)}:
        raise ValueError("Execution log must cover C01-C48; retests may append existing IDs")
    for row in rows[1:]:
        if row[6] in {"未执行", "待执行"} and row[7]:
            raise ValueError("Unexecuted cases cannot have execution timestamps")


def verify_admin_fixtures(base, data):
    from app.models.enums import (
        ProductStatus,
        ReportReason,
        ReportStatus,
        ReportTargetType,
        UserStatus,
    )
    from app.schemas.business import ProductWrite
    from app.services.catalog_search import WORDS, normalize, search_query, term_matches
    from app.services.intelligence import CATEGORIES

    families = {
        "admin-search-products": 10,
        "search-checks-admin-v2": 12,
        "admin-list-checks": 8,
        "admin-scenario-inputs": 8,
    }
    extra = {}
    for name, count in families.items():
        rows = json.loads((base / f"{name}.json").read_text(encoding="utf-8"))
        if not isinstance(rows, list) or len(rows) != count:
            raise ValueError(f"{name}: expected {count} rows")
        ids = [row.get("fixtureId", row.get("scenarioId", row.get("id"))) for row in rows]
        if None in ids or len(set(ids)) != len(ids):
            raise ValueError(f"{name}: missing/duplicate IDs")
        extra[name] = rows
    accounts = {row["alias"]: row for row in data["accounts"]}
    products = {row["fixtureId"]: row for row in data["products"]}
    additions = extra["admin-search-products"]
    if {p["fixtureId"] for p in additions} != {f"AP{i:03d}" for i in range(1, 11)}:
        raise ValueError("Admin search requires AP001-AP010")
    for product in additions:
        if (
            product["ownerAlias"] not in accounts
            or accounts[product["ownerAlias"]]["role"] != "USER"
        ):
            raise ValueError("Invalid search product owner")
        if not product["imageFixtureIds"] or not set(product["imageFixtureIds"]) <= {
            f"M{i:02d}" for i in range(1, 9)
        }:
            raise ValueError("Invalid search product media")
        fields = {
            k: product[k]
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
        ProductWrite.model_validate({**fields, "images": product["imageFixtureIds"]})
        products[product["fixtureId"]] = product
    for row in extra["search-checks-admin-v2"]:
        endpoint = "/search" if row["query"].strip() else "/products"
        if row["endpoint"] != endpoint or row["mode"] != "keyword" or row["scope"] != "market":
            raise ValueError("Market keyword check has incorrect scope or endpoint")
        include, exclude = set(row["expectedInclude"]), set(row["expectedExclude"])
        if include & exclude or not include | exclude <= products.keys():
            raise ValueError("Search references are invalid or contradictory")
        if not set(row["filters"]) <= {"category", "condition", "status"}:
            raise ValueError("Search uses unsupported filters")
        terms = WORDS.findall(search_query(row["query"]))
        matches = {
            fid
            for fid, p in products.items()
            if all(
                term_matches(
                    term,
                    normalize(p["title"]),
                    normalize(p["description"]),
                    CATEGORIES.get(p["category"], p["category"]),
                )
                for term in terms
            )
            and all(
                p.get(key, "ON_SALE" if key == "status" else None) == value
                for key, value in row["filters"].items()
            )
        }
        if row["assertion"] == "include_exclude":
            if not include or not include <= matches or exclude & matches:
                raise ValueError(f"{row['id']}: keyword expectations contradict source products")
        elif row["assertion"] != "all_namespace_products" or row["query"] or row["filters"]:
            raise ValueError("Invalid full-list/pagination definition")
        if not row["steps"] or not row["reason"] or row["pageSize"] != 20:
            raise ValueError("Missing executable search instructions")
    for row in extra["admin-list-checks"]:
        if (
            row["page"] not in {"users", "products", "reports"}
            or row["endpoint"] != f"/admin/{row['page']}"
        ):
            raise ValueError("Admin list endpoint differs from page")
        if (
            accounts.get(row["actorAlias"], {}).get("role") != "ADMIN"
            or not row["steps"]
            or not row["preconditions"]
        ):
            raise ValueError("Admin check lacks role or execution recipe")
        if row["queryParameter"] != "query":
            raise ValueError("Admin check uses unsupported query mechanism")
    scenarios = {r["scenarioId"]: r for r in data["scenario-inputs"]}
    seen = set()
    for row in extra["admin-scenario-inputs"]:
        kind = row["type"]
        if row.get("dependsOn") and row["dependsOn"] not in seen:
            raise ValueError("Admin scenario dependency is missing or out of order")
        if kind == "report":
            if row["targetType"] not in set(ReportTargetType) or row["expectedStatus"] not in set(
                ReportStatus
            ):
                raise ValueError("Invalid report target/status")
            if (
                row["reporterAlias"] not in accounts
                or row["reason"] not in set(ReportReason)
                or not row["description"]
            ):
                raise ValueError("Report lacks reporter or submission fields")
            target = row["targetType"]
            if target == "USER" and row.get("targetAlias") not in accounts:
                raise ValueError("Unknown reported user")
            if target == "PRODUCT" and row.get("targetFixtureId") not in products:
                raise ValueError("Unknown reported product")
            if target in {"ORDER", "CHAT_MESSAGE"} and row.get("targetScenario") not in scenarios:
                raise ValueError("Unknown report business scenario")
            if target == "CHAT_MESSAGE" and (
                row.get("targetMessageAuthorAlias") not in accounts
                or row["targetMessageAuthorAlias"] == row["reporterAlias"]
            ):
                raise ValueError("Message report requires another participant's message")
        elif kind in {"user_ban", "user_unban"}:
            expected = UserStatus.DISABLED if kind == "user_ban" else UserStatus.ACTIVE
            if row["expectedStatus"] != expected or row.get("targetAlias") not in accounts:
                raise ValueError("Invalid user status or target")
        elif kind in {"product_hide", "product_restore"}:
            hidden = kind == "product_hide"
            expected = ProductStatus.HIDDEN if hidden else ProductStatus.ON_SALE
            if (
                row["expectedStatus"] != expected
                or row.get("expectedModerationBlocked") is not hidden
                or row.get("targetFixtureId") not in products
            ):
                raise ValueError("Invalid product moderation state or target")
        else:
            raise ValueError("Unknown admin scenario kind")
        if kind != "report" and accounts.get(row["adminAlias"], {}).get("role") != "ADMIN":
            raise ValueError("Governance requires administrator")
        if not row["steps"] or row["status"] != "未执行":
            raise ValueError("Scenario recipes must not claim an execution result")
        seen.add(row["scenarioId"])
    verify_execution_log(
        ROOT / "docs/collaboration/phase-5/testing/data-permissions/execution-log.csv"
    )
    return families
