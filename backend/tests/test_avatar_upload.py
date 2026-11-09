import io
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import urlopen

import pytest
from PIL import Image

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import User
from app.services.storage import storage_client
from scripts.privatize_media import privatize_media
from tests.conftest import requires_postgres
from tests.test_auth import account, headers

pytestmark = [pytest.mark.integration, requires_postgres]


def assert_anonymous_denied(bucket, key):
    settings = get_settings()
    scheme = "https" if settings.minio_secure else "http"
    with pytest.raises(HTTPError) as error:
        urlopen(f"{scheme}://{settings.minio_endpoint}/{bucket}/{quote(key)}", timeout=5)
    assert error.value.code in (403, 404)


@pytest.mark.parametrize("role", ["USER", "ADMIN"])
def test_avatar_upload_persists_private_preview_and_checks_ownership(client, role):
    owner, other = account(client), account(client)
    if role == "ADMIN":
        with SessionLocal.begin() as db:
            db.get(User, owner["user"]["id"]).role = role
    source = io.BytesIO()
    Image.new("RGB", (160, 90), (40, 120, 180)).save(source, format="PNG")
    params = {"purpose": "avatar"}
    uploaded = client.post(
        "/uploads/images",
        params=params,
        headers=headers(owner),
        files={"file": ("portrait.png", source.getvalue(), "image/png")},
    )
    assert uploaded.status_code == 201, uploaded.text
    avatar = uploaded.json()["data"]["url"]
    settings = get_settings()
    prefix = "https://private.campusloop.invalid/"
    assert avatar.startswith(prefix + "avatar/")
    object_key = avatar[len(prefix) :]
    assert_anonymous_denied(settings.minio_private_bucket, object_key)
    assert_anonymous_denied(settings.minio_public_bucket, object_key)
    stored = storage_client().get_object(Bucket=settings.minio_private_bucket, Key=object_key)
    with Image.open(io.BytesIO(stored["Body"].read())) as image:
        assert image.size == (512, 512) and image.format == "JPEG"
    path = "/avatars/image"
    assert client.get(path, params={"reference": avatar}).status_code == 401
    preview = client.get(path, params={"reference": avatar}, headers=headers(owner))
    assert preview.status_code == 200 and preview.headers["cache-control"] == "no-store"
    assert client.get(path, params={"reference": avatar}, headers=headers(other)).status_code == 404
    denied = client.patch("/users/me", headers=headers(other), json={"avatar": avatar})
    assert denied.status_code == 403
    external = client.patch(
        "/users/me",
        headers=headers(owner),
        json={"avatar": "https://example.invalid/arbitrary.png"},
    )
    assert external.status_code == 422
    saved = client.patch("/users/me", headers=headers(owner), json={"avatar": avatar})
    assert saved.status_code == 200, saved.text
    assert saved.json()["data"]["avatar"] == avatar
    assert client.get("/users/me", headers=headers(owner)).json()["data"]["avatar"] == avatar
    assert client.get(f'/users/{owner["user"]["id"]}').json()["data"]["avatar"] == avatar
    visible = client.get(path, params={"reference": avatar}, headers=headers(other))
    assert visible.status_code == 200 and visible.content == preview.content
    assert client.get("/users/me", headers=headers(other)).json()["data"]["avatar"] is None
    assert (
        client.patch("/users/me", headers=headers(owner), json={"avatar": None}).status_code == 200
    )
    assert client.get("/users/me", headers=headers(owner)).json()["data"]["avatar"] is None
    assert client.get(path, params={"reference": avatar}, headers=headers(other)).status_code == 404
    assert client.post("/auth/logout", headers=headers(owner)).status_code == 204
    assert client.get(path, params={"reference": avatar}, headers=headers(owner)).status_code == 401


def test_legacy_avatar_moves_privately_without_changing_profile_or_public_products(client):
    from tests.test_transaction_api import image_url

    owner = account(client)
    avatar = image_url(client, owner, "avatar")
    product = image_url(client, owner, "product")
    settings = get_settings()
    key = avatar.removeprefix("https://private.campusloop.invalid/")
    product_key = product.removeprefix(settings.s3_public_base_url.rstrip("/") + "/")
    storage = storage_client()
    storage.copy_object(
        Bucket=settings.minio_public_bucket,
        Key=key,
        CopySource={"Bucket": settings.minio_private_bucket, "Key": key},
    )
    storage.delete_object(Bucket=settings.minio_private_bucket, Key=key)
    legacy_url = settings.s3_public_base_url.rstrip("/") + "/" + key
    with SessionLocal.begin() as db:
        db.get(User, owner["user"]["id"]).avatar_url = legacy_url
    with SessionLocal() as db:
        assert privatize_media(db) >= 1
        assert privatize_media(db) == 0
    assert_anonymous_denied(settings.minio_public_bucket, key)
    assert_anonymous_denied(settings.minio_private_bucket, key)
    response = client.get(
        "/avatars/image", params={"reference": legacy_url}, headers=headers(owner)
    )
    assert response.status_code == 200 and response.content.startswith(b"\xff\xd8")
    assert client.get("/users/me", headers=headers(owner)).json()["data"]["avatar"] == legacy_url
    assert (
        storage.head_object(Bucket=settings.minio_public_bucket, Key=product_key)["ContentLength"]
        > 0
    )
    wrong_purpose = client.get(
        "/avatars/image", params={"reference": product}, headers=headers(owner)
    )
    assert wrong_purpose.status_code == 404


def test_private_media_migration_retains_public_original_on_conflicting_copy(client):
    from tests.test_transaction_api import image_url

    owner = account(client)
    avatar = image_url(client, owner, "avatar")
    settings = get_settings()
    key = avatar.removeprefix("https://private.campusloop.invalid/")
    storage = storage_client()
    storage.put_object(Bucket=settings.minio_public_bucket, Key=key, Body=b"legacy original")
    with SessionLocal() as db, pytest.raises(RuntimeError, match="public original was retained"):
        privatize_media(db)
    assert (
        storage.get_object(Bucket=settings.minio_public_bucket, Key=key)["Body"].read()
        == b"legacy original"
    )
    # Retire only this synthetic conflicting copy so later cases can migrate normally.
    storage.delete_object(Bucket=settings.minio_public_bucket, Key=key)


def test_avatar_upload_rejects_guests_invalid_images_and_large_files(client):
    owner = account(client)

    def send(content, auth):
        return client.post(
            "/uploads/images",
            params={"purpose": "avatar"},
            headers=auth,
            files={"file": ("portrait.png", content, "image/png")},
        )

    assert send(b"fake-image", {}).status_code == 401
    assert send(b"fake-image", headers(owner)).status_code == 415
    assert send(b"x" * (5 * 1024 * 1024 + 1), headers(owner)).status_code == 413
