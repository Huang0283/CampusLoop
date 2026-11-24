"""Local, cached zh/en translation for public catalogue display text.

No account, database or media writes. Model inference stays on this machine.
Run with scripts/start-translation.ps1; download models once with --prepare.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import threading
from collections import OrderedDict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
CACHE = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "CampusLoop" / "translation"
CACHE.mkdir(parents=True, exist_ok=True)
MODELS = {"en": "Helsinki-NLP/opus-mt-zh-en", "zh": "Helsinki-NLP/opus-mt-en-zh"}
LOCK = threading.Lock()
loaded = {}
translations = OrderedDict()
MAX_TRANSLATIONS = 2000
# Brand spellings and model names are preserved exactly as supplied, in both modes.
BRAND = re.compile(r"\b(?i:Apple|MacBook(?:\s+(?:Air|Pro))?|iPhone|iPad|iMac|AirPods|ThinkPad|Lenovo|Huawei|Xiaomi|Redmi|Samsung|Sony|Canon|Nikon|Fujifilm|DJI|Nintendo|Switch|ASUS|ROG|Dell|HP|Acer|OPPO|vivo|realme|OnePlus|HONOR|Microsoft|Surface|Logitech|JBL|Bose|Beats|Kindle|Casio|Nike|adidas|Uniqlo|Decathlon|IKEA|MUJI)\b|苹果|华为|小米|红米|荣耀|联想|佳能|尼康|索尼|富士|大疆|任天堂|华硕|戴尔|惠普|宏碁|耐克|阿迪达斯|优衣库|迪卡侬|宜家|无印良品")
MODEL_NAME = r"\b(?=[A-Za-z0-9.+-]*[A-Za-z])(?=[A-Za-z0-9.+-]*\d)[A-Za-z0-9]+(?:[.+-][A-Za-z0-9]+)*(?:\s+(?:Pro|Plus|Max|Ultra|Air))?\b"
SPECIFICATION = r"\b(?:SSD|HDD|RAM|ROM|USB(?:-C)?|CPU|GPU|DDR\d|OLED|LCD|LED|HDR|HDMI|RTX|GTX|NVMe|Wi-Fi)\b"
AUDIT_PREFIX = re.compile(r"^\[(?:t1|t2|t3)-[a-z0-9-]+/(?:CP|AP|P|W)\d+\]\s*", re.I)
PROTECTED = re.compile(BRAND.pattern + "|" + MODEL_NAME + "|" + SPECIFICATION + r"|[¥￥$]?\d+(?:[.,:/–-]\d+)*(?:GB|TB|MB|GHz|Hz|cm|mm|kg|%|g)?")
PROTECTED_EN = re.compile(r"[a-zA-Z][a-zA-Z0-9.+&-]*(?:\s+[a-zA-Z0-9][a-zA-Z0-9.+&-]*)*|" + BRAND.pattern + r"|[¥￥$]?\d+(?:[.,:/–-]\d+)*(?:[a-zA-Z%]+)?")
GLOSSARY_FILE = Path(__file__).with_name("catalog_translation_glossary.json")
REVISION = hashlib.sha256(Path(__file__).read_bytes() + GLOSSARY_FILE.read_bytes()).hexdigest()
GLOSSARY = json.loads(GLOSSARY_FILE.read_text(encoding="utf-8"))
PHRASES = {"en": GLOSSARY, "zh": {en: zh for zh, en in GLOSSARY.items()}}
PHRASE_PATTERNS = {
    target: re.compile("|".join(re.escape(term) if target == "en" else r"\b" + re.escape(term) + r"\b" for term in sorted(terms, key=len, reverse=True)), re.IGNORECASE)
    for target, terms in PHRASES.items()
}


def display_spans(text, target):
    # Product vocabulary and explicit condition statements bypass inference.
    # Other prose still goes through the translation model, including new items.
    # Keep complete source model tokens before matching their numeric parts.
    prefix = AUDIT_PREFIX.match(text)
    spans = [(0, prefix.end(), prefix.group())] if prefix else []
    for match in (PROTECTED_EN if target == "en" else PROTECTED).finditer(text):
        if not any(match.start() < end and match.end() > start for start, end, _ in spans):
            spans.append((match.start(), match.end(), match.group()))
    for match in PHRASE_PATTERNS[target].finditer(text):
        if not any(match.start() < end and match.end() > start for start, end, _ in spans):
            value = PHRASES[target].get(match.group(), PHRASES[target].get(match.group().lower()))
            spans.append((match.start(), match.end(), value))
    return sorted(spans)


def model(target, *, download=False):
    if target not in loaded:
        import torch
        from transformers import MarianMTModel, MarianTokenizer
        torch.set_num_threads(min(4, os.cpu_count() or 2))
        name = MODELS[target]
        tokenizer = MarianTokenizer.from_pretrained(name, cache_dir=str(CACHE / "models"), local_files_only=not download)
        network = MarianMTModel.from_pretrained(name, cache_dir=str(CACHE / "models"), use_safetensors=False, local_files_only=not download)
        network.eval()
        loaded[target] = tokenizer, network
    return loaded[target]


def remember(text, target, result):
    translations[(text, target)] = result
    translations.move_to_end((text, target))
    while len(translations) > MAX_TRANSLATIONS:
        translations.popitem(last=False)


def purge_legacy_cache():
    # These files can contain private text from older frontends. Keep model weights.
    for path in CACHE.glob("translations-*.sqlite3*"):
        if re.fullmatch(r"translations-(?:[a-f0-9]{12}|v\d+)\.sqlite3(?:-wal|-shm|-journal)?", path.name):
            path.unlink(missing_ok=True)


def translate(texts: list[str], target: str) -> list[str]:
    import torch
    with LOCK:
        results = []
        for text in texts:
            non_brand = PROTECTED.sub("", text)
            if not text.strip() or (target == "en" and not re.search(r"[\u3400-\u9fff]", text)) or (target == "zh" and not re.search(r"[a-zA-Z]{3}", non_brand)):
                results.append(text)
                continue
            cached = translations.get((text, target))
            if cached:
                translations.move_to_end((text, target))
                results.append(cached)
                continue
            # Reviewed translations are keyed by the complete source text, never
            # by item IDs. An edited or newly published description falls through
            # to inference rather than reusing a translation of old facts.
            reviewed = PHRASES[target].get(text)
            prefix = AUDIT_PREFIX.match(text)
            if not reviewed and prefix:
                suffix = PHRASES[target].get(text[prefix.end():])
                if suffix:
                    reviewed = prefix.group() + suffix
            if reviewed:
                remember(text, target, reviewed)
                results.append(reviewed)
                continue
            # Translate clauses separately to stay within Marian's token window;
            # brand/model spans bypass inference entirely.
            parts = []
            position = 0
            spans = display_spans(text, target)
            for match in [*spans, None]:
                end = match[0] if match else len(text)
                fragment = text[position:end]
                # Pure punctuation between model/number spans is not prose.
                if fragment and not re.search(r"[a-zA-Z\u3400-\u9fff]", fragment):
                    parts.append(fragment)
                    fragment = ""
                chunks = re.findall(r"[^。！？.!?\n]+[。！？.!?]?|\n", fragment)
                for chunk in chunks:
                    if not chunk.strip():
                        parts.append(chunk)
                        continue
                    for offset in range(0, len(chunk), 300):
                        item = chunk[offset:offset + 300]
                        if target == "en" and not re.search(r"[\u3400-\u9fff]", item):
                            parts.append(item)
                            continue
                        if target == "zh" and not re.search(r"[a-zA-Z]{3}", item):
                            parts.append(item)
                            continue
                        if not re.search(r"[a-zA-Z\u3400-\u9fff]", item):
                            parts.append(item)
                            continue
                        tokenizer, network = model(target)
                        inputs = tokenizer(item, return_tensors="pt", truncation=True, max_length=480)
                        with torch.inference_mode():
                            output = network.generate(**inputs, max_new_tokens=256, num_beams=2, no_repeat_ngram_size=3, repetition_penalty=1.1)
                        parts.append(tokenizer.decode(output[0], skip_special_tokens=True))
                if match:
                    parts.append(match[2])
                    position = match[1]
            result = (" " if target == "en" else "").join(parts).strip()
            if target == "en":
                result = result.translate(str.maketrans("，。！？：；（）", ",.!?:;()"))
                result = re.sub(r"[ \t]+", " ", result)
                result = re.sub(r"\s+([,.:;!?])", r"\1", result)
            if not result:
                raise ValueError("Empty translation")
            remember(text, target, result)
            results.append(result)
        return results


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # Do not log submitted catalogue text.

    def reply(self, code, body):
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        origin = self.headers.get("Origin", "")
        if origin in {"http://127.0.0.1:5174", "http://localhost:5174"}:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        try:
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
            pass  # A navigation may leave before its translation finishes.

    def do_OPTIONS(self):
        self.send_response(204)
        origin = self.headers.get("Origin", "")
        if origin in {"http://127.0.0.1:5174", "http://localhost:5174"}:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        self.reply(200, {"service": "campusloop-catalog-translation-v1", "status": "ok", "revision": REVISION, "languages": ["zh", "en"], "loaded": list(loaded)})

    def do_POST(self):
        try:
            if self.path != "/translate":
                return self.reply(404, {"error": "Not found"})
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 131072:
                return self.reply(413, {"error": "Request too large"})
            body = json.loads(self.rfile.read(size))
            texts, target = body.get("texts"), body.get("target")
            if target not in MODELS or not isinstance(texts, list) or not 0 < len(texts) <= 32 or any(not isinstance(s, str) or len(s) > 5000 for s in texts):
                return self.reply(422, {"error": "Invalid translation request"})
            self.reply(200, {"translations": translate(texts, target)})
        except Exception:
            self.reply(503, {"error": "Translation unavailable; original text remains available"})


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--prepare", action="store_true")
    parser.add_argument("--port", type=int, default=18790)
    args = parser.parse_args()
    purge_legacy_cache()
    if args.prepare:
        for language in MODELS:
            model(language, download=True)
        print("Both translation models are ready", flush=True)
    else:
        ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()
