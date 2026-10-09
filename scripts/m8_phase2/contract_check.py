"""Executable checks for the M8 price/trust/risk contract examples."""
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "contracts/m8-phase2"
EXAMPLES = BASE / "examples"


class ContractError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise ContractError(message)


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def walk_keys(value):
    if isinstance(value, dict):
        for key, child in value.items():
            yield key
            yield from walk_keys(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk_keys(child)


def validate_document(document, policy):
    require(set(document) == {"kind", "request", "response"}, "example must contain kind/request/response only")
    kind = document["kind"]
    request = document["request"]
    response = document["response"]
    require(isinstance(request, dict) and isinstance(response, dict), f"{kind}: request/response must be objects")
    if kind == "price_public":
        required = {"status", "currency", "lowerFen", "upperFen", "recommendedFen", "basis", "sampleSize", "dataWindow", "factors", "ruleVersion", "datasetVersion", "degraded", "degradationReason", "disclaimer"}
        require(set(response) == required, "price public response shape mismatch")
        require(response["currency"] == "CNY", "price currency must be CNY")
        require(response["status"] in {"AVAILABLE", "LOW_CONFIDENCE", "INSUFFICIENT_DATA", "UNAVAILABLE"}, "invalid price status")
        if response["lowerFen"] is not None:
            require(0 <= response["lowerFen"] <= response["recommendedFen"] <= response["upperFen"], "price bounds invalid")
        else:
            require(response["recommendedFen"] is None and response["upperFen"] is None, "unavailable price must not expose partial bounds")
    elif kind == "trust_public":
        required = {"status", "completedTransactions", "validReviewCount", "smoothedRating", "summary", "ruleVersion", "factsVersion", "updatedAt", "degraded"}
        require(set(response) == required, "trust public response shape mismatch")
        require(response["status"] in {"NEW", "LIMITED", "ESTABLISHED", "UNAVAILABLE"}, "invalid trust status")
        if response["validReviewCount"] == 0:
            require(response["smoothedRating"] is None, "new user must not display prior as real rating")
    elif kind == "risk_admin":
        require(request.get("viewerRole") == "ADMIN" and request.get("caseScopeId") == response.get("caseId"), "admin risk access requires matching case scope")
        require(response.get("recommendedAction") == "MANUAL_REVIEW" and response.get("decision") is None, "risk service cannot decide or enforce")
    elif kind == "risk_public":
        require(set(response).issubset(set(policy["publicRiskFields"])), "public risk response leaked internal fields")
        leaked = set(walk_keys(response)) & set(policy["forbiddenPublicFields"])
        require(not leaked, f"public risk response leaked {sorted(leaked)}")
    elif kind == "fallback":
        require(response.get("blocksTransaction") is False, "AI fallback must not block transaction")
        require(response.get("fallback") == policy["fallbacks"].get(request.get("capability")), "fallback mismatch")
    else:
        raise ContractError(f"unknown example kind: {kind}")


def main():
    policy = load(BASE / "development-policy.json")
    require(policy.get("enforcementAllowed") is False, "risk enforcement must remain disabled")
    files = sorted(EXAMPLES.glob("*.json"))
    require(files, "no contract examples")
    counts = {}
    for path in files:
        document = load(path)
        validate_document(document, policy)
        counts[document["kind"]] = counts.get(document["kind"], 0) + 1
    required_kinds = {"price_public", "trust_public", "risk_admin", "risk_public", "fallback"}
    require(required_kinds.issubset(counts), f"missing example kinds: {sorted(required_kinds - counts.keys())}")
    print(json.dumps({"status": "PASS", "examples": len(files), "kinds": counts}, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (ContractError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}")
        raise SystemExit(2) from exc
