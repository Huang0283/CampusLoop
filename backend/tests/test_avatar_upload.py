import io

import pytest
from PIL import Image

from app.core.config import get_settings
from app.services.storage import storage_client
from tests.conftest import requires_postgres
from tests.test_auth import account, headers

pytestmark = [pytest.mark.integration, requires_postgres]


def test_avatar_upload_persists_public_preview_and_checks_ownership(client):
    owner, other = account(client), account(client)
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
    assert avatar.startswith(settings.s3_public_base_url.rstrip("/") + "/avatar/")
    object_key = avatar[len(settings.s3_public_base_url.rstrip("/")) + 1 :]
    stored = storage_client().get_object(Bucket=settings.minio_public_bucket, Key=object_key)
    with Image.open(io.BytesIO(stored["Body"].read())) as image:
        assert image.size == (512, 512) and image.format == "JPEG"
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
    assert client.get("/users/me", headers=headers(other)).json()["data"]["avatar"] is None
    assert (
        client.patch("/users/me", headers=headers(owner), json={"avatar": None}).status_code == 200
    )
    assert client.get("/users/me", headers=headers(owner)).json()["data"]["avatar"] is None


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
