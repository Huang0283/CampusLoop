"""Move registered private uploads out of the public bucket without changing records."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from botocore.exceptions import ClientError
from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import UploadedObject
from app.services.storage import storage_client


def head(client, bucket, key):
    try:
        return client.head_object(Bucket=bucket, Key=key)
    except ClientError as exc:
        if exc.response["Error"]["Code"] in ("404", "NoSuchKey", "NotFound"):
            return None
        raise


def privatize_media(db):
    settings = get_settings()
    if settings.minio_public_bucket == settings.minio_private_bucket:
        raise RuntimeError("Public and private media must use different buckets.")
    client = storage_client()
    moved = 0
    for key in db.scalars(
        select(UploadedObject.object_key).where(UploadedObject.purpose != "product")
    ):
        source = head(client, settings.minio_public_bucket, key)
        if source is None:
            continue
        target = head(client, settings.minio_private_bucket, key)
        if target is None:
            client.copy_object(
                Bucket=settings.minio_private_bucket,
                Key=key,
                CopySource={"Bucket": settings.minio_public_bucket, "Key": key},
                CopySourceIfMatch=source["ETag"],
            )
            target = head(client, settings.minio_private_bucket, key)
        if not target or any(target[field] != source[field] for field in ("ETag", "ContentLength")):
            raise RuntimeError("Private media copy differs; the public original was retained.")
        client.delete_object(Bucket=settings.minio_public_bucket, Key=key)
        moved += 1
    return moved


if __name__ == "__main__":
    with SessionLocal() as db:
        print(f"Private media migration: {privatize_media(db)} public copies removed.")
