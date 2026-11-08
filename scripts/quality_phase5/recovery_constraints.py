"""Normalize only PostgreSQL varchar-array-to-text dump rewrites."""

import re

_ARRAY = re.compile(
    r"\(ARRAY\[((?:'(?:[^']|'')*'::character varying)(?:, '(?:[^']|'')*'::character varying)*)\]\)::text\[\]"
)
_LITERAL = re.compile(r"'(?:[^']|'')*'::character varying")


def canonical_definition(value: str) -> str:
    return _ARRAY.sub(
        lambda match: "ARRAY["
        + ", ".join("(" + item + ")::text" for item in _LITERAL.findall(match.group(1)))
        + "]",
        value,
    )
