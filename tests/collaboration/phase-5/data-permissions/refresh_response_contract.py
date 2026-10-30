"""Extract the mock response schemas from this checkout's OpenAPI (requires PyYAML 6.0.2)."""

import hashlib
import json

from runtime import BASE, ROOT


def refresh():
    import yaml

    source = (ROOT / "openapi/campusloop.v1.yaml").read_text(encoding="utf-8")
    schemas = yaml.safe_load(source)["components"]["schemas"]
    found = {}

    def collect(name):
        if name in found:
            return
        found[name] = schemas[name]

        def visit(value):
            if isinstance(value, dict):
                if "$ref" in value:
                    collect(value["$ref"].rsplit("/", 1)[-1])
                for child in value.values():
                    visit(child)
            elif isinstance(value, list):
                for child in value:
                    visit(child)

        visit(schemas[name])

    for name in (
        "ProductListResponse",
        "ProductResponse",
        "ChatSessionListResponse",
        "OrderResponse",
        "ErrorResponse",
    ):
        collect(name)
    found = json.loads(json.dumps(found).replace("#/components/schemas/", "#/$defs/"))
    result = {
        "openapiSha256": hashlib.sha256(source.encode()).hexdigest(),
        "hashNormalization": "UTF-8, universal newlines to LF",
        "schemas": found,
    }
    (BASE / "response-contract.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    refresh()
