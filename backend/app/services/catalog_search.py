"""Live catalog phrase matching, independent of the frozen M7 evaluation baseline."""

import re
import unicodedata

SEARCH_VERSION = "live-catalog-phrases-v1"
WORDS = re.compile(r"[\w-]+", re.UNICODE)
BUY_PREFIX = re.compile(r"^(?:我想买|想购买|想买|购买|求购|买)\s*(?=\w)")


def normalize(text):
    return unicodedata.normalize("NFKC", text).casefold().strip()


def search_query(text):
    # Only strip a leading purchase intent, never words inside a product name.
    return BUY_PREFIX.sub("", normalize(text), count=1)


def refine_search(result, snapshots, query, sort):
    """Require every phrase; title hits precede incidental description mentions."""
    terms = WORDS.findall(query)
    by_id = {
        product["productId"]: [
            normalize(product.get(field) or "") for field in ("title", "description")
        ]
        for product in snapshots
    }

    result["items"] = [
        item
        for item in result["items"]
        if terms and all(any(term in field for field in by_id[item["productId"]]) for term in terms)
    ]
    if sort == "relevance":
        # Stable sorting retains the baseline's relevance/date/id tie breakers.
        result["items"].sort(
            key=lambda item: sum(term in by_id[item["productId"]][0] for term in terms), reverse=True
        )
    return result
