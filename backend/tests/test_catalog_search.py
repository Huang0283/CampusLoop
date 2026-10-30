import pytest

from app.services.catalog_search import refine_search, search_query


@pytest.mark.parametrize(
    ("query", "expected"),
    [("购买电脑", "电脑"), ("想买 电脑", "电脑"), ("ＵＳＢ 线", "usb 线"), ("购买指南", "指南")],
)
def test_query_normalization(query, expected):
    assert search_query(query) == expected


def test_phrase_matching_prioritizes_title_and_requires_every_phrase():
    snapshots = [
        {"productId": "1", "title": "被子", "description": "购买后闲置"},
        {"productId": "2", "title": "手提箱", "description": "可以装电脑"},
        {"productId": "3", "title": "台式电脑", "description": "功能正常"},
        {"productId": "4", "title": "台式风扇", "description": "功能正常"},
    ]
    result = {"items": [{"productId": str(i)} for i in range(1, 5)]}
    assert [item["productId"] for item in refine_search(
        result, snapshots, search_query("购买电脑"), "relevance"
    )["items"]] == ["3", "2"]
    result = {"items": [{"productId": str(i)} for i in range(1, 5)]}
    assert refine_search(result, snapshots, "电脑 台式", "relevance")["items"] == [
        {"productId": "3"}
    ]
    result = {"items": [{"productId": str(i)} for i in range(1, 5)]}
    assert refine_search(result, snapshots, "电脑", "newest")["items"] == [
        {"productId": "2"}, {"productId": "3"}
    ]
