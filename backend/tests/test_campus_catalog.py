"""Campus coverage and search oracles independent of the frozen T1 data package."""

import json
from collections import Counter
from pathlib import Path

import pytest

from app.schemas.business import ProductWrite
from app.services.catalog_search import candidate_query, refine_search, search_query

ROOT = Path(__file__).resolve().parents[2]
CATALOG = json.loads((ROOT / "tests/catalog/campus-products.json").read_text(encoding="utf-8"))


def snapshots():
    return [
        {
            **p,
            "productId": p["fixtureId"],
            "categoryId": {"DIGITAL": "digital", "BOOKS": "books", "STATIONERY": "stationery"}.get(
                p["category"], p["category"].lower()
            ),
        }
        for p in CATALOG
    ]


def found(query):
    products = snapshots()
    result = {"items": [{"productId": p["productId"]} for p in products]}
    return {
        p["productId"]
        for p in refine_search(result, products, search_query(query), "relevance")["items"]
    }


def test_every_category_has_forty_distinct_valid_campus_listings():
    assert len(CATALOG) == len({p["title"] for p in CATALOG}) == 400
    assert len(set(p["category"] for p in CATALOG)) == 10
    assert set(Counter(p["category"] for p in CATALOG).values()) == {40}
    for row in CATALOG:
        ProductWrite.model_validate(
            {k: v for k, v in row.items() if k != "fixtureId"}
            | {"images": ["https://example.invalid/image.jpg"]}
        )
        assert row["campusLocation"] == "校内"


@pytest.mark.parametrize(
    ("query", "count"),
    [
        ("手机", 5),
        ("平板", 4),
        ("电脑", 13),
        ("笔记本电脑", 9),
        ("鼠标", 3),
        ("键盘", 3),
        ("自行车", 22),
        ("雨伞", 3),
    ],
)
def test_broad_names_cover_all_relevant_models_without_accessories(query, count):
    assert len(found(query)) == count


def test_compact_brand_queries_and_description_terms_search_the_entire_catalog():
    assert len(found("联想笔记本电脑")) == 3
    assert len(found("笔记本电脑 16GB")) == 7
    assert len(found("手机 128GB")) == 4
    assert len(found("手机或平板")) == 9
    assert found("可以装电脑") == {"CP355", "CP356"}
    assert not found("不存在的量子传送商品xyz")
    assert set(candidate_query("联想笔记本电脑").split()) >= {"联想", "笔记本电脑", "macbook"}


def test_matching_query_ignores_audit_identifiers_and_purchase_intent():
    assert search_query("[t1-business-campus40/W01] 求购二手手机") == "手机"
    assert found("[t1-business-campus40/W01] 求购二手手机") == found("手机")
    assert found("求购高数教材") == {"CP001", "CP002"}
    assert found("求购宿舍收纳箱") == {"CP130", "CP131", "CP132", "CP133"}
