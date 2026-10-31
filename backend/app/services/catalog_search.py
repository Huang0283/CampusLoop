"""Live catalog phrase matching, independent of the frozen M7 evaluation baseline."""

import re
import unicodedata

SEARCH_VERSION = "live-catalog-phrases-v1"
WORDS = re.compile(r"[\w-]+", re.UNICODE)
BUY_PREFIX = re.compile(r"^(?:我想买|想购买|想买|购买|求购|买)\s*(?=\w)")
# Common computer product names that do not always contain the literal query word.
TITLE_ALIASES = {
    "电脑": ("电脑", "笔记本", "笔记本电脑", "macbook", "laptop", "台式机", "台式电脑", "主机"),
}
COMPUTER_ACCESSORIES = ("充电线", "数据线", "充电器", "电源", "转接头", "转换器", "扩展坞", "保护壳", "内胆包", "贴膜")
COMPUTER_NON_DEVICES = ("电脑椅", "电脑桌", "电脑包", "电脑支架", "电脑键盘", "电脑鼠标")


def normalize(text):
    return unicodedata.normalize("NFKC", text).casefold().strip()


def search_query(text):
    # Only strip a leading purchase intent, never words inside a product name.
    return BUY_PREFIX.sub("", normalize(text), count=1)


def title_has(term, title, category=""):
    aliases = TITLE_ALIASES.get(term, (term,))
    if term == "电脑" and any(non_device in title for non_device in COMPUTER_NON_DEVICES):
        return False
    if term == "电脑" and "笔记本" in title and category != "digital":
        aliases = tuple(alias for alias in aliases if alias not in ("笔记本", "笔记本电脑"))
    if term == "电脑" and "macbook" in title and any(
        accessory in title for accessory in COMPUTER_ACCESSORIES
    ):
        aliases = tuple(alias for alias in aliases if alias != "macbook")
    return any(alias in title for alias in aliases)


def candidate_query(query):
    """Include title aliases in the frozen candidate query, without changing matching terms."""
    terms = WORDS.findall(query)
    aliases = [alias for term in terms for alias in TITLE_ALIASES.get(term, ())]
    extras = [alias for alias in dict.fromkeys(aliases) if alias not in terms]
    return " ".join([query, *extras]) if extras else query


def refine_search(result, snapshots, query, sort):
    """Require all terms and suppress description-only hits when titles match."""
    terms = WORDS.findall(query)
    by_id = {
        product["productId"]: [
            normalize(product.get(field) or "") for field in ("title", "description")
        ] + [normalize(product.get("categoryId") or "")]
        for product in snapshots
    }

    matched = [
        item
        for item in result["items"]
        if terms
        and all(
            title_has(term, by_id[item["productId"]][0], by_id[item["productId"]][2])
            or term in by_id[item["productId"]][1]
            for term in terms
        )
    ]
    title_matches = [
        item
        for item in matched
        if all(
            title_has(term, by_id[item["productId"]][0], by_id[item["productId"]][2])
            for term in terms
        )
    ]
    # Description search is a live fallback. When titles answer the whole query,
    # don't dilute them with incidental mentions in accessories or prose.
    if title_matches:
        matched = title_matches
    result["items"] = matched
    if sort == "relevance":
        # Stable sorting retains the baseline's relevance/date/id tie breakers.
        result["items"].sort(
            key=lambda item: (
                sum(term in by_id[item["productId"]][0] for term in terms),
                sum(
                    title_has(term, by_id[item["productId"]][0], by_id[item["productId"]][2])
                    for term in terms
                ),
            ), reverse=True
        )
    return result
