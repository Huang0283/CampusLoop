"""Validate checked-in demo listings before any database or object-storage writes."""

import json
from pathlib import Path

from PIL import Image

CATEGORY_CODES = {
    "BOOKS",
    "STATIONERY",
    "DIGITAL",
    "DAILY",
    "FURNITURE",
    "BEDDING",
    "TRANSPORT",
    "SPORTS",
    "clothing",
    "other",
}


def image_id(product_id: int, order: int) -> int:
    # Keep the original 109 listings' image identities. The extended catalog uses a
    # separate range, away from the legacy image 2102 and existing daily uploads.
    # run_seed aligns sequences afterwards, so future uploads remain above all seeds.
    if product_id <= 1609:
        return 1000 + (product_id - 1500) * 5 + order
    return 50000 + (product_id - 1610) * 5 + order


def load_catalog(directory: Path) -> dict:
    data = json.loads((directory / "showcase.json").read_text(encoding="utf-8"))
    sellers = data["sellers"]
    products = data["products"]
    owner_ids = {seller["id"] for seller in sellers}
    if len(owner_ids) != len(sellers) or any(not 901 <= owner < 1000 for owner in owner_ids):
        raise ValueError("Showcase sellers must have unique reserved IDs 901..999.")
    seen = set()
    source_ids = set()
    for product in products:
        identity = product["id"]
        if identity in seen or not 1501 <= identity < 2001:
            raise ValueError(f"Invalid or duplicate reserved product ID: {identity}")
        seen.add(identity)
        if product["owner"] not in owner_ids:
            raise ValueError(f"Unknown seller on product {identity}")
        if product["category"] not in CATEGORY_CODES:
            raise ValueError(f"Unknown category on product {identity}")
        if not 1 <= len(product["title"]) <= 100 or not 1 <= len(product["description"]) <= 3000:
            raise ValueError(f"Invalid title/description length on product {identity}")
        if product["price"] < 0 or product["condition"] not in {"NEW", "LIKE_NEW", "GOOD", "FAIR"}:
            raise ValueError(f"Invalid price/condition on product {identity}")
        if "publicationHold" in product and (
            not isinstance(product["publicationHold"], str)
            or not product["publicationHold"].strip()
        ):
            raise ValueError(f"Publication hold needs a review reason on product {identity}")
        if product.get("originalPrice") is not None and product["originalPrice"] < product["price"]:
            raise ValueError(f"Original price below sale price on product {identity}")
        source_id = product.get("sourceAssetId")
        if source_id:
            if source_id in source_ids:
                raise ValueError(f"Duplicate source listing: {source_id}")
            source_ids.add(source_id)
        names = product["images"]
        if not 1 <= len(names) <= 5 or len(set(names)) != len(names):
            raise ValueError(f"Product {identity} needs 1..5 distinct images.")
        for name in names:
            if Path(name).name != name or not name.lower().endswith(".jpg"):
                raise ValueError(f"Invalid image path: {name}")
            # A missing or corrupt listing photo must fail, not become a placeholder.
            with Image.open(directory / "products" / name) as photo:
                if photo.format != "JPEG" or min(photo.size) < 32:
                    raise ValueError(f"Invalid product photo: {name}")
                photo.verify()
    return data
