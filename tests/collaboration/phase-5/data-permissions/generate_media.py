"""Create original geometric fixture images, dedicated to CC0-1.0 by this project."""

import csv
import hashlib
import io
from pathlib import Path

from PIL import Image, ImageDraw

BASE = Path(__file__).resolve().parent


def normal_bytes(index):
    image = Image.new("RGB", (320, 240), (240, 244, 248))
    draw = ImageDraw.Draw(image)
    color = [(66, 106, 144), (132, 98, 126), (78, 130, 111), (161, 122, 75)][(index - 1) % 4]
    draw.rectangle((55, 45, 265, 195), outline=color, width=6)
    draw.ellipse((95, 65, 225, 175), fill=color)
    draw.text((15, 12), f"SYNTHETIC FIXTURE M{index:02d}", fill=(40, 45, 50))
    output = io.BytesIO()
    image.save(output, format="JPEG" if index <= 4 else "PNG")
    return output.getvalue()


def invalid_bytes():
    gif = io.BytesIO()
    Image.new("RGB", (10, 10), "white").save(gif, format="GIF")
    return [
        ("empty.png", b"", "image/png", 415, "UNSUPPORTED_IMAGE"),
        (
            "text.jpg",
            b"Synthetic text, not an image.\n",
            "image/jpeg",
            415,
            "UNSUPPORTED_IMAGE",
        ),
        ("unsupported.gif", gif.getvalue(), "image/gif", 415, "UNSUPPORTED_IMAGE"),
        (
            "oversize.jpg",
            normal_bytes(1).ljust(5 * 1024 * 1024 + 1, b"\0"),
            "image/jpeg",
            413,
            "IMAGE_TOO_LARGE",
        ),
    ]


def generate():
    rows = []
    (BASE / "media").mkdir(exist_ok=True)
    for index in range(1, 9):
        ext = "jpg" if index <= 4 else "png"
        relative = f"media/M{index:02d}.{ext}"
        content = normal_bytes(index)
        (BASE / relative).write_bytes(content)
        rows.append(
            [
                f"M{index:02d}",
                relative,
                "true",
                "image/jpeg" if ext == "jpg" else "image/png",
                len(content),
                hashlib.sha256(content).hexdigest(),
                "CC0-1.0",
                "Original project geometry; generate_media.py",
                201,
                "",
            ]
        )
    for index, (name, content, mime, status, code) in enumerate(invalid_bytes(), 9):
        rows.append(
            [
                f"M{index:02d}",
                f"media/generated/{name}",
                "false",
                mime,
                len(content),
                hashlib.sha256(content).hexdigest(),
                "CC0-1.0",
                "generate_invalid_media.py",
                status,
                code,
            ]
        )
    with (BASE / "media-manifest.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream, lineterminator="\n")
        writer.writerow(
            [
                "fixtureId",
                "path",
                "valid",
                "mime",
                "size",
                "sha256",
                "license",
                "source",
                "expectedStatus",
                "expectedCode",
            ]
        )
        writer.writerows(rows)


if __name__ == "__main__":
    generate()
