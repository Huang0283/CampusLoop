import pytest

from app.services.catalog_search import candidate_query, query_scope, refine_search, search_query


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
        {
            "productId": "5",
            "title": "二手笔记本",
            "description": "适合学习",
            "categoryId": "digital",
        },
        {"productId": "6", "title": "数码相机", "description": "支持读卡器"},
    ]
    result = {"items": [{"productId": str(i)} for i in range(1, 6)]}
    assert [
        item["productId"]
        for item in refine_search(result, snapshots, search_query("购买电脑"), "relevance")["items"]
    ] == ["3", "5"]
    result = {"items": [{"productId": str(i)} for i in range(1, 6)]}
    assert [
        item["productId"] for item in refine_search(result, snapshots, "电脑", "relevance")["items"]
    ] == ["3", "5"]
    result = {"items": [{"productId": str(i)} for i in range(1, 6)]}
    assert refine_search(result, snapshots, "电脑 台式", "relevance")["items"] == [
        {"productId": "3"}
    ]
    result = {"items": [{"productId": str(i)} for i in range(1, 6)]}
    assert refine_search(result, snapshots, "电脑", "newest")["items"] == [
        {"productId": "3"},
        {"productId": "5"},
    ]

    result = {"items": [{"productId": str(i)} for i in range(1, 7)]}
    assert [
        item["productId"]
        for item in refine_search(result, snapshots, "读卡器", "relevance")["items"]
    ] == ["6"]


def test_candidate_query_expands_computer_aliases_without_changing_query_terms():
    aliases = candidate_query("电脑").split()
    assert {"电脑", "笔记本", "游戏本", "电竞本", "macbook", "laptop", "台式机", "主机"} <= set(
        aliases
    )
    assert candidate_query("验收 电脑") == "验收 " + candidate_query("电脑")
    assert candidate_query("被子") == "被子"


@pytest.mark.parametrize(
    "name", ["山地车", "公路车", "折叠车", "单车", "脚踏车", "Bicycle", "Bike"]
)
def test_bicycle_names_match_without_literal_query_in_description(name):
    snapshots = [{"productId": "1", "title": name, "description": "校内自提"}]
    result = {"items": [{"productId": "1"}]}
    assert refine_search(result, snapshots, "自行车", "relevance")["items"] == [{"productId": "1"}]
    assert name.casefold() in candidate_query("自行车").split()


@pytest.mark.parametrize("query", ["自行车", "雨伞"])
def test_description_matches_survive_when_title_matches_exist(query):
    snapshots = [
        {"productId": "1", "title": "校内闲置", "description": f"转让{query}，正常使用"},
        {"productId": "2", "title": f"二手{query}", "description": "校内自提"},
        {"productId": "3", "title": "全新被子", "description": "毕业转让"},
    ]
    result = {"items": [{"productId": str(i)} for i in range(1, 4)]}
    assert [
        item["productId"] for item in refine_search(result, snapshots, query, "relevance")["items"]
    ] == ["2", "1"]


@pytest.mark.parametrize("sort", ["newest", "price_asc", "price_desc"])
def test_bicycle_matching_preserves_requested_sort_and_candidate_scope(sort):
    snapshots = [
        {"productId": "1", "title": "自行车", "description": "九成新"},
        {"productId": "2", "title": "山地车", "description": "校内自提"},
        {"productId": "3", "title": "其他闲置", "description": "自行车，校内自提"},
        {"productId": "4", "title": "折叠车", "description": "被分类或状态筛选排除"},
        {"productId": "5", "title": "被子", "description": "全新"},
    ]
    # Only already eligible candidates can survive; refinement must not add id 4.
    result = {"items": [{"productId": str(i)} for i in (3, 2, 5, 1)]}
    assert [
        item["productId"] for item in refine_search(result, snapshots, "自行车", sort)["items"]
    ] == ["3", "2", "1"]


def test_bicycle_alias_does_not_bypass_other_query_terms():
    snapshots = [
        {"productId": "1", "title": "山地车", "description": "禧玛诺变速"},
        {"productId": "2", "title": "折叠车", "description": "校内自提"},
        {"productId": "3", "title": "禧玛诺配件", "description": "校内自提"},
    ]
    result = {"items": [{"productId": str(i)} for i in range(1, 4)]}
    assert refine_search(result, snapshots, "自行车 禧玛诺", "relevance")["items"] == [
        {"productId": "1"}
    ]


@pytest.fixture
def notebook_catalog():
    names = [
        ("1", "MacBook Air 2020", "digital", "换了新电脑所以转让"),
        ("2", "联想台式电脑 带键盘鼠标", "digital", "自用整机"),
        ("3", "手账笔记本", "stationery", "纸质本子"),
        ("4", "联想拯救者 电竞本", "digital", "附送笔记本支架"),
        ("5", "ROG 游戏本 带原装充电器", "digital", "自用整机"),
        ("6", "荣耀数据线", "digital", "可以给笔记本电脑充电"),
        ("7", "MacBook 充电线", "digital", "原装电脑配件"),
        ("8", "笔记本电脑包", "digital", "可以装电脑"),
        ("9", "电脑使用指南", "books", "介绍笔记本电脑"),
        ("10", "毕业闲置整机", "digital", "轻薄本，上课使用"),
        ("11", "相机", "digital", "可传照片到笔记本电脑"),
        ("12", "办公笔记本", "digital", "九成新"),
        ("13", "台式电脑椅", "furniture", "配合电脑使用"),
        ("14", "电脑主机电源适配器", "digital", "可用于台式机"),
        ("15", "手提包", "digital", "可装电脑和笔记本电脑"),
    ]
    return [
        {"productId": pid, "title": title, "categoryId": category, "description": description}
        for pid, title, category, description in names
    ]


@pytest.mark.parametrize(
    ("query", "expected"),
    [
        ("笔记本", {"1", "3", "4", "5", "9", "10", "12"}),
        ("笔记本电脑", {"1", "4", "5", "10", "12"}),
        ("电脑", {"1", "2", "4", "5", "10", "12"}),
        ("台式电脑", {"2"}),
        ("台式机", {"2"}),
        ("笔记本电脑 ROG", {"5"}),
    ],
)
def test_ambiguous_name_and_explicit_subtypes(query, expected, notebook_catalog):
    result = {"items": [{"productId": p["productId"]} for p in notebook_catalog]}
    assert {
        p["productId"]
        for p in refine_search(result, notebook_catalog, search_query(query), "relevance")["items"]
    } == expected
    # Broad semantic similarity may not bypass the same explicit product scope.
    if " " not in query:
        assert {p["productId"] for p in notebook_catalog if query_scope(p, query)} == expected


@pytest.mark.parametrize(
    ("query", "titles"),
    [
        ("笔记本电脑", ["电竞本", "游戏本", "MacBook Air", "轻薄本"]),
        ("雨伞", ["折叠伞", "胶囊伞", "三折伞"]),
        ("相机", ["单反套机"]),
        ("充电宝", ["移动电源"]),
        ("行李箱", ["拉杆箱"]),
    ],
)
def test_common_names_expand_but_specific_queries_keep_their_phrase(query, titles):
    snapshots = [
        {"productId": str(i), "title": title, "description": "校内自提", "categoryId": "digital"}
        for i, title in enumerate(titles)
    ]
    result = {"items": [{"productId": p["productId"]} for p in snapshots]}
    assert len(refine_search(result, snapshots, query, "relevance")["items"]) == len(titles)
    assert all(
        any(alias in title.casefold() for alias in candidate_query(query).split())
        for title in titles
    )
    result = {"items": [{"productId": "1"}]}
    assert (
        refine_search(
            result,
            [{"productId": "1", "title": "台式电脑", "description": "电脑可用"}],
            "笔记本电脑",
            "relevance",
        )["items"]
        == []
    )


def test_rain_umbrella_rejects_studio_light_umbrella():
    snapshots = [{"productId": "1", "title": "摄影柔光伞", "description": "不能当雨伞"}]
    assert (
        refine_search({"items": [{"productId": "1"}]}, snapshots, "雨伞", "relevance")["items"]
        == []
    )


@pytest.mark.parametrize("query", ["电脑", "笔记本电脑"])
def test_accessories_alone_never_become_computers(query, notebook_catalog):
    accessories = [p for p in notebook_catalog if p["productId"] in {"6", "7", "8", "14", "15"}]
    result = {"items": [{"productId": p["productId"]} for p in accessories]}
    assert refine_search(result, accessories, query, "relevance")["items"] == []
