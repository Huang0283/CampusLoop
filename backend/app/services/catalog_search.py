"""Live catalog phrase matching, independent of the frozen M7 evaluation baseline."""

import re
import unicodedata

SEARCH_VERSION = "live-catalog-phrases-v5"
WORDS = re.compile(r"[\w-]+", re.UNICODE)
BUY_PREFIX = re.compile(r"^(?:我想买|想购买|想买|购买|求购|买)\s*(?=\w)")
AUDIT_PREFIX = re.compile(r"^\[t1-[a-z0-9-]+/(?:AP|CP|P|W)\d+\]\s*", re.I)
# Expansion is directional: a broad name includes its subtypes, never the reverse.
LAPTOP_NAMES = (
    "笔记本电脑",
    "笔记本",
    "游戏本",
    "电竞本",
    "轻薄本",
    "商务本",
    "办公本",
    "超极本",
    "上网本",
    "移动工作站",
    "macbook",
    "laptop",
)
DESKTOP_NAMES = ("台式电脑", "台式机", "台式工作站", "电脑主机", "一体机", "mini pc", "minipc")
COMPUTER_NAMES = tuple(dict.fromkeys(("电脑", *LAPTOP_NAMES, *DESKTOP_NAMES, "主机")))
TITLE_ALIASES = {
    "电脑": COMPUTER_NAMES,
    "笔记本": LAPTOP_NAMES,
    "笔记本电脑": LAPTOP_NAMES,
    "台式电脑": DESKTOP_NAMES,
    "台式机": DESKTOP_NAMES,
    "自行车": ("自行车", "山地车", "公路车", "折叠车", "单车", "脚踏车", "bicycle", "bike"),
    "雨伞": (
        "雨伞",
        "晴雨伞",
        "折叠伞",
        "三折伞",
        "长柄伞",
        "长短伞",
        "胶囊伞",
        "遮阳伞",
        "太阳伞",
    ),
    "行李箱": ("行李箱", "拉杆箱", "旅行箱", "旅行拉杆箱"),
    "充电宝": ("充电宝", "移动电源"),
    "相机": ("相机", "单反", "camera"),
    "手机": ("手机", "iphone", "红米", "redmi", "pixel"),
    "平板": ("平板", "ipad", "matepad", "xiaoxin pad", "surface go"),
    "平板电脑": ("平板", "ipad", "matepad", "xiaoxin pad", "surface go"),
    "鼠标": ("鼠标", "mouse", "master 3", "g304", "g502"),
    "键盘": ("键盘", "keyboard"),
    "耳机": ("耳机", "airpods", "headphones", "earbuds"),
    "显示器": ("显示器", "显示屏", "monitor"),
    "打印机": ("打印机", "printer"),
    "路由器": ("路由器", "router"),
    "高数教材": ("高数教材", "高数书", "高等数学"),
    "高数": ("高数", "高等数学"),
    "收纳箱": ("收纳箱", "整理箱", "储物箱"),
    "被子": ("被子", "棉被", "羽绒被", "蚕丝被", "空调被", "夏凉被", "冬被"),
    "外套": ("外套", "夹克", "冲锋衣", "棉服", "羽绒服"),
    "运动鞋": ("运动鞋", "跑鞋", "篮球鞋", "羽毛球鞋"),
    "台灯": ("台灯", "阅读灯", "护眼灯"),
    "羽毛球拍": ("羽毛球拍", "羽拍"),
    "篮球": ("篮球",),
    "瑜伽垫": ("瑜伽垫",),
    "保温杯": ("保温杯", "保温水杯"),
    "电动车": ("电动车", "电动自行车", "电瓶车"),
}
# Generic device queries refer to the item being sold, not its cover/cable/stand.
ACCESSORIES = {
    "手机": ("手机壳", "保护壳", "手机膜", "贴膜", "手机支架", "手机充电", "数据线", "充电器"),
    "平板": ("保护壳", "保护套", "平板壳", "支架", "贴膜", "键盘", "触控笔", "充电线"),
    "平板电脑": ("保护壳", "保护套", "平板壳", "支架", "贴膜", "键盘", "触控笔", "充电线"),
    "鼠标": ("鼠标垫", "脚贴", "收纳包"),
    "键盘": ("键盘膜", "键帽", "键盘包", "清洁刷"),
    "耳机": ("耳机壳", "耳机套", "收纳包", "转接线"),
    "相机": ("相机包", "相机带", "相机支架", "镜头盖", "读卡器"),
    "自行车": (
        "车锁",
        "头盔",
        "打气筒",
        "车灯",
        "前灯",
        "尾灯",
        "车铃",
        "车筐",
        "配件",
        "支架",
        "水壶架",
        "补胎",
        "维修",
        "后视镜",
        "座套",
    ),
}
DEVICE_QUERIES = {
    "手机",
    "平板",
    "平板电脑",
    "鼠标",
    "键盘",
    "耳机",
    "显示器",
    "打印机",
    "路由器",
    "相机",
    "充电宝",
}
SUBJECT_TERMS = re.compile(
    "|".join(re.escape(term) for term in sorted(TITLE_ALIASES, key=len, reverse=True))
)
REFERENCE_QUERY = re.compile(r"可以|适合|用于|支持|介绍|指南|搭配|能装|可装|给")
ALTERNATIVES = re.compile(r"\s+or\s+|或者|或|[、，,|]", re.I)
# Accessory names in the primary subject are different from accessories bundled
# with a complete computer (e.g. "游戏本 带原装充电器").
BUNDLE_SUFFIX = re.compile(r"附送|赠送|附带|带|送|(?<!适)配(?!件)|\bwith\b")
COMPUTER_ACCESSORIES = (
    "充电线",
    "快充线",
    "数据线",
    "充电器",
    "电源",
    "适配器",
    "转接头",
    "转换器",
    "扩展坞",
    "保护壳",
    "内胆包",
    "贴膜",
    "支架",
    "散热器",
    "键盘",
    "鼠标",
    "显示器",
    "内存条",
    "硬盘",
    "电池",
    "主板",
    "机箱",
    "电脑包",
    "笔记本包",
    "电脑椅",
    "电脑桌",
    "电脑使用指南",
    "charger",
    "adapter",
    "stand",
    "case",
)
OTHER_DEVICES = (
    "相机",
    "单反",
    "手机",
    "iphone",
    "ipad",
    "平板",
    "充电宝",
    "移动电源",
    "路由器",
    "游戏主机",
    "ps5",
    "xbox",
    "switch",
    "手提箱",
    "行李箱",
    "背包",
    "收纳包",
    "手提包",
    "被子",
)
COMPUTER_QUERIES = {"电脑", "笔记本", "笔记本电脑", "台式电脑", "台式机"}


def normalize(text):
    return unicodedata.normalize("NFKC", text).casefold().strip()


def search_query(text):
    # Only strip a leading purchase intent, never words inside a product name.
    text = AUDIT_PREFIX.sub("", normalize(text))
    text = BUY_PREFIX.sub("", text, count=1)
    return re.sub(r"^(?:二手|闲置)\s*(?=\w)", "", text, count=1)


def query_terms(query):
    """Split compact brand/type queries; keep descriptive phrases such as 可以装电脑 intact."""
    terms = []
    for chunk in WORDS.findall(query):
        if REFERENCE_QUERY.search(chunk) or any(
            accessory in chunk
            for accessory in (
                *COMPUTER_ACCESSORIES,
                *(word for words in ACCESSORIES.values() for word in words),
            )
        ):
            terms.append(chunk)
            continue
        start = 0
        for match in SUBJECT_TERMS.finditer(chunk):
            terms.extend(WORDS.findall(chunk[start : match.start()]))
            terms.append(match.group())
            start = match.end()
        terms.extend(WORDS.findall(chunk[start:]))
    return terms


def computer_kinds(title, description, category):
    """Infer the sold device's subtype; its title takes precedence over incidental prose."""
    if category and category != "digital":
        return set()
    subject = BUNDLE_SUFFIX.split(title, maxsplit=1)[0]
    if any(word in subject for word in (*COMPUTER_ACCESSORIES, *OTHER_DEVICES)):
        return set()

    def kinds(text):
        found = set()
        # Bare 笔记本 needs a digital category; it also names a paper notebook.
        if any(name in text for name in LAPTOP_NAMES if name != "笔记本") or (
            category == "digital" and "笔记本" in text
        ):
            found.add("laptop")
        if any(name in text for name in DESKTOP_NAMES):
            found.add("desktop")
        if not found and any(name in text for name in ("电脑", "主机")):
            found.add("computer")
        return found

    return kinds(subject) or kinds(description)


def term_matches(term, title, description, category=""):
    if term in DEVICE_QUERIES and category and category != "digital":
        return False
    if term in COMPUTER_QUERIES:
        kinds = computer_kinds(title, description, category)
        if term == "电脑":
            return bool(kinds)
        if term in ("台式电脑", "台式机"):
            return "desktop" in kinds
        if "laptop" in kinds:
            return True
        if term == "笔记本" and category in ("", "books", "stationery", "other"):
            return "笔记本" in title or "笔记本" in description
        return False
    if term == "雨伞" and any(word in title for word in ("摄影", "柔光", "反光", "伞架", "伞套")):
        return False
    if term in ACCESSORIES:
        subject = BUNDLE_SUFFIX.split(title, maxsplit=1)[0]
        if any(word in subject for word in ACCESSORIES[term]):
            return False
    return any(alias in title or alias in description for alias in TITLE_ALIASES.get(term, (term,)))


def title_has(term, title, category=""):
    return term_matches(term, title, "", category)


def query_scope(product, query):
    """Preserve explicit computer subtypes even when model similarity is high."""
    title, description, category = [
        normalize(product.get(field) or "") for field in ("title", "description", "categoryId")
    ]
    return any(
        all(
            term_matches(term, title, description, category)
            for term in query_terms(group)
            if term in COMPUTER_QUERIES or term in ACCESSORIES or term == "雨伞"
        )
        for group in ALTERNATIVES.split(query)
        if query_terms(group)
    )


def candidate_query(query):
    """Include title aliases in the frozen candidate query, without changing matching terms."""
    terms = [term for group in ALTERNATIVES.split(query) for term in query_terms(group)]
    aliases = [alias for term in terms for alias in TITLE_ALIASES.get(term, ())]
    extras = [
        alias for alias in dict.fromkeys([*terms, *aliases]) if alias not in WORDS.findall(query)
    ]
    return " ".join([query, *extras]) if extras else query


def refine_search(result, snapshots, query, sort):
    """Require all terms, preserve explicit subtypes, and rank title hits first."""
    groups = [query_terms(group) for group in ALTERNATIVES.split(query) if query_terms(group)]
    terms = [term for group in groups for term in group]
    by_id = {
        product["productId"]: [
            normalize(product.get(field) or "") for field in ("title", "description")
        ]
        + [normalize(product.get("categoryId") or "")]
        for product in snapshots
    }

    matched = [
        item
        for item in result["items"]
        if any(
            all(term_matches(term, *by_id[item["productId"]]) for term in group) for group in groups
        )
    ]
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
            ),
            reverse=True,
        )
    return result
