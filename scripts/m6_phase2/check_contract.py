"""Read-only structural contract checks, not business endpoint acceptance."""

from __future__ import annotations

import ast
from pathlib import Path
import re

import yaml
from jsonschema import Draft202012Validator, FormatChecker, ValidationError
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

ROOT = Path(__file__).resolve().parents[2]
spec = yaml.safe_load((ROOT / "openapi/campusloop.v1.yaml").read_text(encoding="utf-8"))
schemas = spec["components"]["schemas"]
uri = "urn:campusloop:openapi"
registry = Registry().with_resource(
    uri, Resource.from_contents(spec, default_specification=DRAFT202012)
)
example_count = 0


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def validate(name: str, value: object, valid: bool = True) -> None:
    global example_count
    example_count += 1
    validator = Draft202012Validator(
        {"$ref": f"{uri}#/components/schemas/{name}"},
        registry=registry,
        format_checker=FormatChecker(),
    )
    try:
        validator.validate(value)
    except ValidationError:
        require(not valid, f"valid {name} example rejected")
    else:
        require(valid, f"invalid {name} example accepted")


def resolve(ref: str) -> object:
    require(ref.startswith("#/"), f"unexpected external ref: {ref}")
    node = spec
    for part in ref[2:].split("/"):
        node = node[part.replace("~1", "/").replace("~0", "~")]
    return node


def walk(node: object) -> None:
    if isinstance(node, dict):
        if "$ref" in node:
            resolve(node["$ref"])
        for value in node.values():
            walk(value)
    elif isinstance(node, list):
        for value in node:
            walk(value)


walk(spec)
ids = set()
operations = 0
for path, item in spec["paths"].items():
    for method in ("get", "post", "put", "patch", "delete"):
        if method not in item:
            continue
        operation = item[method]
        operation_id = operation["operationId"]
        require(operation_id not in ids, f"duplicate operationId {operation_id}")
        ids.add(operation_id)
        operations += 1
        parameters = item.get("parameters", []) + operation.get("parameters", [])
        parameters = [resolve(p["$ref"]) if "$ref" in p else p for p in parameters]
        declared = {
            p["name"] for p in parameters if p["in"] == "path" and p.get("required")
        }
        require(
            set(re.findall(r"\{([^}]+)\}", path)) <= declared,
            f"unbound path parameter: {path}",
        )
        require(operation.get("responses"), f"no responses: {operation_id}")

for path in ("/products", "/products/{productId}", "/wanted", "/wanted/{wantedId}"):
    require(
        spec["paths"][path]["get"].get("security") == [], f"public read blocked: {path}"
    )
for path, method in (
    ("/products", "post"),
    ("/products/mine", "get"),
    ("/chat/sessions", "post"),
    ("/reports", "post"),
    ("/reviews", "post"),
):
    operation = spec["paths"][path][method]
    require(
        operation.get("security", spec["security"]) == [{"bearerAuth": []}],
        f"unguarded {path}",
    )

tree = ast.parse((ROOT / "backend/app/models/enums.py").read_text(encoding="utf-8"))
backend_enums = {}
for node in tree.body:
    if isinstance(node, ast.ClassDef):
        backend_enums[node.name] = {
            line.value.value
            for line in node.body
            if isinstance(line, ast.Assign) and isinstance(line.value, ast.Constant)
        }
for name in (
    "Role",
    "ProductStatus",
    "WantedStatus",
    "OfferStatus",
    "OrderStatus",
    "ReportStatus",
    "ReportTargetType",
    "ReportReason",
    "NotificationType",
):
    require(
        set(schemas[name]["enum"]) == backend_enums[name], f"backend enum drift: {name}"
    )

validate(
    "RegisterRequest",
    {"email": "student@example.com", "password": "Demo@12345", "nickname": "Demo"},
)
validate(
    "RegisterRequest",
    {
        "email": "student@example.com",
        "password": "Demo@12345",
        "nickname": "Demo",
        "role": "ADMIN",
    },
    False,
)
validate("LoginRequest", {"email": "student@example.com", "password": ""}, False)
validate("RefreshRequest", {"refreshToken": "demo-only"})
validate("RefreshRequest", {"refreshToken": ""}, False)
validate("UpdateProfileRequest", {"bio": None, "school": "Demo Campus"})
validate("UpdateProfileRequest", {}, False)
validate("UpdateProfileRequest", {"role": "ADMIN"}, False)
brief = {
    "id": 1,
    "nickname": "Demo",
    "avatar": None,
    "rating": 0,
    "transactionCount": 0,
}
validate("UserBrief", brief)
validate("UserBrief", {**brief, "email": "private@example.com"}, False)
profile = {
    **brief,
    "role": "USER",
    "status": "ACTIVE",
    "email": "student@example.com",
    "campusVerified": False,
    "bio": None,
    "school": None,
    "college": None,
    "major": None,
    "tradeCount": 0,
    "creditLevel": None,
}
validate("UserProfile", profile)
validate("UserProfile", {**profile, "passwordHash": "secret"}, False)
validate("CreateChatSessionRequest", {"productId": 102})
validate("CreateChatSessionRequest", {"wantedId": 301})
validate("CreateChatSessionRequest", {"productId": 102, "wantedId": 301}, False)
validate("CreateChatSessionRequest", {"productId": 102, "peerId": 3}, False)
require(
    schemas["ReportWriteRequest"]["properties"]["evidence"]["maxItems"] == 5,
    "report evidence limit drift",
)
require("proposerId" in schemas["Offer"]["required"], "counteroffer proposer missing")
require(spec["servers"][0]["url"] == "http://localhost:8001", "host port drift")
generated = (ROOT / "frontend/src/sdk/generated/client.gen.ts").read_text(
    encoding="utf-8"
)
require("http://localhost:8001" in generated, "SDK host port drift")
for name in (
    "business-api-catalog.md",
    "write-operation-contracts.md",
    "state-enum-contract.md",
):
    require(
        (ROOT / "docs/evidence/phase-2/backend-platform" / name).is_file(),
        f"missing deliverable {name}",
    )
print(
    f"PASS operations={operations} enum-contracts=9 schema-examples={example_count} host=8001"
)
print(
    "Structural consumer checks only; live business APIs, missing headers and human signoff remain pending."
)
