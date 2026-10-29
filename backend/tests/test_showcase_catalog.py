import hashlib
import json
from pathlib import Path

import pytest

from scripts.showcase_catalog import image_id, load_catalog
from tests.conftest import requires_postgres


def test_showcase_catalog_has_verified_images_and_reserved_ids() -> None:
    directory = Path(__file__).resolve().parents[1] / "seed_assets"
    catalog = load_catalog(directory)
    products = catalog["products"]
    image_ids = [
        image_id(product["id"], order)
        for product in products
        for order, _ in enumerate(product["images"])
    ]

    assert len({product["id"] for product in products}) == len(products)
    assert len(image_ids) == len(set(image_ids))
    assert 2102 not in image_ids  # Legacy seed image must never be overwritten.
    assert image_id(1609, 0) < 50000 <= image_id(1610, 0)
    assert all(product.get("sourceAssetId") for product in products if product["id"] >= 1610)

    provenance = json.loads((directory / "import-provenance.json").read_text(encoding="utf-8"))
    indexed = {product.get("sourceAssetId"): product for product in products}
    for row in provenance["imported"]:
        product = indexed[row["assetId"]]
        assert product["price"] == row["price"]
        assert [
            hashlib.sha256((directory / "products" / name).read_bytes()).hexdigest()
            for name in product["images"]
        ] == row["imageSha256"]
    assert all(row["assetId"] not in indexed for row in provenance["excluded"])


def test_missing_showcase_photo_fails_instead_of_becoming_placeholder(tmp_path) -> None:
    directory = Path(__file__).resolve().parents[1] / "seed_assets"
    catalog = load_catalog(directory)
    catalog["products"] = [catalog["products"][0]]
    (tmp_path / "showcase.json").write_text(json.dumps(catalog), encoding="utf-8")
    with pytest.raises(FileNotFoundError):
        load_catalog(tmp_path)


@requires_postgres
@pytest.mark.integration
def test_showcase_refresh_preserves_accounts_and_business_state() -> None:
    from app.db.session import session_scope
    from app.models import Product, User
    from scripts.seed import run_seed

    with session_scope() as session:
        run_seed(session, verbose=False)
        product = session.get(Product, 1610)
        seller = session.get(User, product.owner_id)
        original_hash = seller.password_hash
        seller.status = "DISABLED"
        product.status = "SOLD"
        product.view_count = 73
        product.favorite_count = 11
        session.flush()

        run_seed(session, verbose=False)
        session.expire_all()
        assert seller.password_hash == original_hash
        assert seller.status == "DISABLED"
        assert product.status == "SOLD"
        assert product.view_count == 73
        assert product.favorite_count == 11
        session.rollback()  # No test state survives, even in the dedicated audit DB.
