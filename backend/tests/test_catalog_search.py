import pytest

from app.services.catalog_search import candidate_query, refine_search, search_query


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
        {"productId": "3", "title": "台式电脑", "description": "功能正常", "categoryId": "digital"},
        {"productId": "4", "title": "台式风扇", "description": "功能正常"},
        {"productId": "5", "title": "二手笔记本", "description": "适合学习", "categoryId": "digital"},
        {"productId": "6", "title": "数码相机", "description": "支持读卡器"},
    ]
    result = {"items": [{"productId": str(i)} for i in range(1, 6)]}
    assert [item["productId"] for item in refine_search(
        result, snapshots, search_query("购买电脑"), "relevance"
    )["items"]] == ["3", "5"]
    result = {"items": [{"productId": str(i)} for i in range(1, 6)]}
    assert [item["productId"] for item in refine_search(
        result, snapshots, "电脑", "relevance"
    )["items"]] == ["3", "5"]
    result = {"items": [{"productId": str(i)} for i in range(1, 6)]}
    assert refine_search(result, snapshots, "电脑 台式", "relevance")["items"] == [
        {"productId": "3"}
    ]
    result = {"items": [{"productId": str(i)} for i in range(1, 6)]}
    assert refine_search(result, snapshots, "电脑", "newest")["items"] == [
        {"productId": "3"}, {"productId": "5"}
    ]

    result = {"items": [{"productId": str(i)} for i in range(1, 7)]}
    assert [item["productId"] for item in refine_search(
        result, snapshots, "读卡器", "relevance"
    )["items"]] == ["6"]


def test_candidate_query_expands_computer_aliases_without_changing_query_terms():
    assert candidate_query("电脑") == "电脑 笔记本 笔记本电脑 macbook laptop 台式机 台式电脑 主机"
    assert candidate_query("验收 电脑") == "验收 电脑 笔记本 笔记本电脑 macbook laptop 台式机 台式电脑 主机"
    assert candidate_query("被子") == "被子"
