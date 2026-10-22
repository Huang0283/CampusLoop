"""Explicit download of seven hash-pinned official artifacts, outside service startup."""
import argparse
import hashlib
import json
from pathlib import Path
import urllib.request
from .model import PROVENANCE_PATH, config


def download(destination, proxy=None):
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    source = json.loads(PROVENANCE_PATH.read_text(encoding="utf-8"))
    settings = config()
    files = dict(source["fetchedFiles"])
    weight = dict(source["upstreamModelWeight"])
    weight["url"] = f'https://huggingface.co/{settings["modelId"]}/resolve/{settings["revision"]}/model.safetensors'
    files["model.safetensors"] = weight
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({"https": proxy} if proxy else {}))
    result = {}
    for name, expected in files.items():
        path = destination / name
        if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest() != expected["sha256"]:
            temporary = path.with_suffix(path.suffix + ".download")
            try:
                with opener.open(expected["url"], timeout=120) as response, temporary.open("wb") as output:
                    while chunk := response.read(1024 * 1024):
                        output.write(chunk)
                if temporary.stat().st_size != expected["byteCount"] or hashlib.sha256(temporary.read_bytes()).hexdigest() != expected["sha256"]:
                    raise ValueError("MODEL_ARTIFACT_MISMATCH:" + name)
                temporary.replace(path)
            finally:
                if temporary.exists():
                    temporary.unlink()
        result[name] = {"sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "bytes": path.stat().st_size}
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--proxy")
    args = parser.parse_args()
    print(json.dumps(download(args.model_dir, args.proxy), sort_keys=True))


if __name__ == "__main__":
    main()
