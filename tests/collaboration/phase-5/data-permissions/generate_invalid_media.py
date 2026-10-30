"""Generate local file-format/size rejection fixtures, with no network requests."""

from generate_media import BASE, invalid_bytes


def generate():
    target = BASE / "media/generated"
    target.mkdir(parents=True, exist_ok=True)
    for name, content, _, _, _ in invalid_bytes():
        (target / name).write_bytes(content)
    print("Four local negative media fixtures generated; no uploads performed.")


if __name__ == "__main__":
    generate()
