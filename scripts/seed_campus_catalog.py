"""Add the shared campus catalog through normal APIs, only to inspected audit environments."""

from __future__ import annotations

import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tests/collaboration/phase-5/data-permissions"))
from runtime import Client, arguments, guard, save, token_for  # noqa: E402

DATA = ROOT / "tests/catalog/campus-products.json"
LABELS = {
    "BOOKS": "图书教材",
    "STATIONERY": "文具文创",
    "DIGITAL": "数码电子",
    "DAILY": "生活用品",
    "FURNITURE": "家具家电",
    "BEDDING": "寝具床品",
    "TRANSPORT": "交通代步",
    "SPORTS": "运动户外",
    "clothing": "服饰鞋包",
    "other": "其他",
}


def catalog():
    products = json.loads(DATA.read_text(encoding="utf-8"))
    if Counter(p["category"] for p in products) != Counter(dict.fromkeys(LABELS, 40)):
        raise ValueError("Expected 40 products in every category")
    if len({p["title"] for p in products}) != 400 or len({p["fixtureId"] for p in products}) != 400:
        raise ValueError("Catalog titles and fixture IDs must be unique")
    if any(p["campusLocation"] != "校内" or p["price"] <= 0 for p in products):
        raise ValueError("Invalid campus location or price")
    return products


def card(product, path, font):
    from PIL import Image, ImageDraw, ImageFont

    image = Image.new("RGB", (800, 600), "#eef3f8")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((35, 35, 765, 565), radius=26, fill="white")
    title_font = ImageFont.truetype(str(font), 30)
    body_font = ImageFont.truetype(str(font), 23)
    draw.text((65, 70), LABELS[product["category"]], font=body_font, fill="#45617a")
    title = product["title"]
    lines, line = [], ""
    for char in title:
        if draw.textlength(line + char, font=title_font) > 660:
            lines.append(line)
            line = ""
        line += char
    lines.append(line)
    for i, line in enumerate(lines):
        draw.text((65, 165 + i * 48), line, font=title_font, fill="#172b41")
    draw.text((65, 360), f"测试标价 ¥{product['price']}", font=title_font, fill="#45617a")
    draw.text((65, 465), "功能测试示意图 · 非商品实拍", font=body_font, fill="#64748b")
    draw.text((65, 510), product["fixtureId"], font=body_font, fill="#64748b")
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, quality=90)


def seed(args):
    products = catalog()
    environment = guard(args)
    prefix = f"t1-{args.namespace}-{args.run_id}"
    foundation = json.loads((args.state_dir / f"{prefix}.json").read_text(encoding="utf-8"))
    if foundation["environment"] != environment or foundation["lifecycle"] != "active":
        raise ValueError("Foundation environment mismatch; import T1 accounts first")
    path = args.state_dir / f"campus-catalog-{args.namespace}-{args.run_id}.json"
    dataset_hash = hashlib.sha256(DATA.read_bytes()).hexdigest()
    if path.exists():
        state = json.loads(path.read_text(encoding="utf-8"))
        if state["environment"] != environment or state["datasetSha256"] != dataset_hash:
            raise ValueError("Catalog/environment changed; preserve this run and use a new batch")
    else:
        state = {
            "version": 1,
            "environment": environment,
            "datasetSha256": dataset_hash,
            "products": {},
        }
        save(path, state)
    font = args.font
    if not font or not font.is_file():
        raise ValueError("Pass --font with an installed Chinese TrueType/OpenType font")
    client = Client(environment["api"])
    owner = foundation["accounts"]["A"]
    token, _ = token_for(client, owner)
    for index, product in enumerate(products, 1):
        fid = product["fixtureId"]
        record = state["products"].setdefault(fid, {})
        if record.get("id"):
            actual = client.call("GET", f"/products/{record['id']}")
            if actual["status"] != "ON_SALE" or actual["seller"]["id"] != owner["id"]:
                raise ValueError(f"{fid} changed in business tests; preserve the evidence")
            continue
        if record.get("pendingUpload"):
            raise ValueError(f"{fid}: ambiguous upload; inspect private state before retrying")
        if not record.get("image"):
            image_path = args.state_dir / "campus-images" / f"{fid}.jpg"
            card(product, image_path, font)
            record["pendingUpload"] = True
            save(path, state)
            uploaded = client.upload(image_path, token)
            if not uploaded["url"].startswith(
                environment["mediaBase"] + f"/product/{owner['id']}/"
            ):
                raise ValueError("Upload escaped the inspected audit owner/bucket")
            record.update(image=uploaded["url"], pendingUpload=False)
            save(path, state)
        body = {key: value for key, value in product.items() if key != "fixtureId"}
        body.update(title=f'[{prefix}/{fid}] {product["title"]}', images=[record["image"]])
        created = client.call("POST", "/products", body, token, key=f"{prefix}-{fid}")
        record["id"] = created["id"]
        save(path, state)
        if index % 40 == 0:
            print(f"{args.namespace}: {index}/400 campus products ready", flush=True)
    counts = {}
    for category in LABELS:
        counts[category] = client.call("GET", f"/products?category={category}&pageSize=1")[
            "pagination"
        ]["total"]
        if counts[category] < 40:
            raise ValueError(f"{category}: fewer than 40 visible products")
    print(
        json.dumps(
            {
                "namespace": args.namespace,
                "added": len(state["products"]),
                "onSaleByCategory": counts,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    parser = arguments(__doc__)
    parser.add_argument("--font", type=Path, default=Path("C:/Windows/Fonts/msyh.ttc"))
    try:
        seed(parser.parse_args())
    except (RuntimeError, ValueError, OSError) as error:
        raise SystemExit(str(error)) from None
