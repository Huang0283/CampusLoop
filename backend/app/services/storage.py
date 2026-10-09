import io
import uuid

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select

from app.core.config import get_settings
from app.core.errors import BusinessError
from app.models import UploadedObject


def storage_client():
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=("https://" if settings.minio_secure else "http://") + settings.minio_endpoint,
        aws_access_key_id=settings.minio_access_key,
        aws_secret_access_key=settings.minio_secret_key,
        config=Config(
            signature_version="s3v4", connect_timeout=3, read_timeout=5, retries={"max_attempts": 1}
        ),
    )


def upload(db, actor, content: bytes, purpose: str) -> dict:
    if len(content) > 5 * 1024 * 1024:
        raise BusinessError(413, "IMAGE_TOO_LARGE", "Images must not exceed 5 MiB.")
    try:
        with Image.open(io.BytesIO(content)) as image:
            if image.format not in ("JPEG", "PNG") or image.width * image.height > 25_000_000:
                raise BusinessError(415, "UNSUPPORTED_IMAGE", "JPEG or PNG image required.")
            image.verify()
        with Image.open(io.BytesIO(content)) as image:
            output = io.BytesIO()
            image.convert("RGB").save(output, format="JPEG", quality=90)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise BusinessError(415, "UNSUPPORTED_IMAGE", "Invalid image.") from None
    settings = get_settings()
    key = f"{purpose}/{actor.id}/{uuid.uuid4().hex}.jpg"
    bucket = (
        settings.minio_private_bucket if purpose == "evidence" else settings.minio_public_bucket
    )
    client = storage_client()
    try:
        data = output.getvalue()
        client.put_object(Bucket=bucket, Key=key, Body=data, ContentType="image/jpeg")
        db.add(
            UploadedObject(
                owner_id=actor.id,
                object_key=key,
                purpose=purpose,
                content_type="image/jpeg",
                size=len(data),
            )
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        try:
            client.delete_object(Bucket=bucket, Key=key)
        except (BotoCoreError, ClientError):
            pass
        if isinstance(exc, BotoCoreError | ClientError):
            raise BusinessError(
                503, "STORAGE_UNAVAILABLE", "Image storage is unavailable."
            ) from None
        raise
    # This URI is a private reference, not a readable object URL.
    url = (
        "https://private.campusloop.invalid/" + key
        if purpose == "evidence"
        else settings.s3_public_base_url.rstrip("/") + "/" + key
    )
    return {"url": url, "contentType": "image/jpeg", "size": len(data)}


def owned_keys(db, actor, urls: list[str], purpose: str) -> list[str]:
    base = (
        "https://private.campusloop.invalid"
        if purpose == "evidence"
        else get_settings().s3_public_base_url.rstrip("/")
    )
    keys = []
    for url in urls:
        if not url.startswith(base + "/"):
            raise BusinessError(422, "INVALID_IMAGE_REFERENCE", "Use an uploaded image reference.")
        key = url[len(base) + 1 :]
        row = db.scalar(
            select(UploadedObject).where(
                UploadedObject.object_key == key,
                UploadedObject.owner_id == actor.id,
                UploadedObject.purpose == purpose,
            )
        )
        if not row:
            raise BusinessError(403, "FORBIDDEN", "Image does not belong to this user.")
        keys.append(key)
    if len(keys) != len(set(keys)):
        raise BusinessError(422, "INVALID_IMAGE_REFERENCE", "Images must be unique.")
    return keys
