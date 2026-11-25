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

os.environ.setdefault("HF_ENDPOINT", "https://huggingface.co")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
CACHE = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "CampusLoop" / "translation"
CACHE.mkdir(parents=True, exist_ok=True)
MODEL_ID = "tencent/HY-MT1.5-1.8B"
MODEL_REVISION = "dbad03788f49709801014c95d481a514c272ca52"
MODELS = {"en": MODEL_ID, "zh": MODEL_ID}
TERMS = {
    "en": {"阅读支架": "reading stand", "发夹": "hair clip", "星月": "star-and-moon", "滚轮": "scroll wheel", "不议价": "price is firm", "仅校内自提": "on-campus pickup only", "仅限校内自提": "on-campus pickup only", "使用正常": "works normally", "完好无损": "intact and undamaged", "买来没怎么用": "barely used since purchase"},
    "zh": {"scroll wheel": "滚轮", "price is firm": "不议价", "carrying case": "收纳盒", "campus pickup": "校内自提", "two ceramic mugs": "两个陶瓷杯"},
}
LOCK = threading.Lock()
loaded = {}
translations = OrderedDict()
MAX_TRANSLATIONS = 2000
ALLOWED_ORIGINS = {
    f"http://{host}:{port}"
    for host in ("127.0.0.1", "localhost")
    for port in (5174, 5184, 5185, 5199)
}
# Brand spellings and model names are preserved exactly as supplied, in both modes.
BRAND = re.compile(r"\b(?i:Apple|MacBook(?:\s+(?:Air|Pro))?|iPhone|iPad|iMac|AirPods|ThinkPad|Lenovo|Huawei|Xiaomi|Redmi|Samsung|Sony|Canon|Nikon|Fujifilm|DJI|Nintendo|Switch|ASUS|ROG|Dell|HP|Acer|OPPO|vivo|realme|OnePlus|HONOR|Microsoft|Surface|Logitech|JBL|Bose|Beats|Kindle|Casio|Nike|adidas|Uniqlo|Decathlon|IKEA|MUJI)\b|苹果|华为|小米|红米|荣耀|联想|佳能|尼康|索尼|富士|大疆|任天堂|华硕|戴尔|惠普|宏碁|耐克|阿迪达斯|优衣库|迪卡侬|宜家|无印良品")
MODEL_NAME = r"\b(?=[A-Za-z0-9.+-]*[A-Za-z])(?=[A-Za-z0-9.+-]*\d)[A-Za-z0-9]+(?:[.+-][A-Za-z0-9]+)*(?:\s+(?:Pro|Plus|Max|Ultra|Air))?\b"
SPECIFICATION = r"\b(?:SSD|HDD|RAM|ROM|USB(?:-C)?|CPU|GPU|DDR\d|OLED|LCD|LED|HDR|HDMI|RTX|GTX|NVMe|Wi-Fi)\b|(?<![A-Za-z])(?:Cosplay|PVC)(?![A-Za-z])"
AUDIT_PREFIX = re.compile(r"^\[(?:t1|t2|t3)-[a-z0-9-]+/(?:CP|AP|P|W)\d+\]\s*", re.I)
PROTECTED = re.compile(BRAND.pattern + "|" + MODEL_NAME + "|" + SPECIFICATION + r"|[¥￥$]?\d+(?:[.,:/–-]\d+)*(?:GB|TB|MB|GHz|Hz|cm|mm|kg|%|g)?")
PROTECTED_EN = re.compile(r"[a-zA-Z][a-zA-Z0-9.+&-]*(?:\s+[a-zA-Z0-9][a-zA-Z0-9.+&-]*)*|" + BRAND.pattern + r"|[¥￥$]?\d+(?:[.,:/–-]\d+)*(?:[a-zA-Z%]+)?")
GLOSSARY_FILE = Path(__file__).with_name("catalog_translation_glossary.json")
REVISION = hashlib.sha256(Path(__file__).read_bytes() + GLOSSARY_FILE.read_bytes()).hexdigest()
GLOSSARY = json.loads(GLOSSARY_FILE.read_text(encoding="utf-8"))
PHRASES = {"en": GLOSSARY, "zh": {en: zh for zh, en in GLOSSARY.items()}}


def display_spans(text, target):
    # Protect source facts, not vocabulary fragments that can reverse negation.
    prefix = AUDIT_PREFIX.match(text)
    spans = [(0, prefix.end(), prefix.group())] if prefix else []
    if target == "zh":
        # Existing Chinese is source content, never input to the English model.
        spans.extend((m.start(), m.end(), m.group()) for m in re.finditer(r"[\u3400-\u9fff，。！？：；（）【】、]+", text))
    for match in (PROTECTED_EN if target == "en" else PROTECTED).finditer(text):
        if not any(match.start() < end and match.end() > start for start, end, _ in spans):
            spans.append((match.start(), match.end(), match.group()))
    merged = []
    for start, end, value in sorted(spans):
        if merged and not text[merged[-1][1]:start].strip():
            previous = merged[-1][0]
            merged[-1] = (previous, end, text[previous:end])
        else:
            merged.append((start, end, value))
    return merged


def model(target, *, download=False):
    if MODEL_ID not in loaded:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        torch.set_num_threads(min(6, os.cpu_count() or 2))
        options = dict(revision=MODEL_REVISION, cache_dir=str(CACHE / "models"), local_files_only=not download)
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, **options)
        # Dynamic INT8 corrupts this architecture's output; keep verified precision.
        network = AutoModelForCausalLM.from_pretrained(MODEL_ID, dtype=torch.float32, **options)
        network.eval()
        loaded[MODEL_ID] = tokenizer, network
    return loaded[MODEL_ID]


def infer(text, target, protected=None):
    import torch
    tokenizer, network = model(target)
    language = "简体中文" if target == "zh" else "英语"
    terms = {source: value for source, value in TERMS[target].items() if source.casefold() in text.casefold()}
    if target == "zh" and re.search(r"\b(headphones?|earbuds?|earphones?)\b", text, re.I):
        terms["case"] = "收纳盒"
    terminology = "\n".join(f"{source} 翻译成 {value}" for source, value in terms.items())
    facts = "\n".join(f"{marker} 表示 {value}" for marker, value in (protected or {}).items())
    prompt = (
        "下文是校园二手商品信息；须准确保留数量、成色、瑕疵、配件是否包含、交易限制和否定含义。"
        "__KEEP_n__ 是原文占位符，必须逐字保留，不得添加、删除、重复或解释。"
        f"\n参考下面的翻译：\n{terminology}\n"
        f"占位符含义仅供理解上下文，输出仍须使用原占位符：\n{facts}\n"
        f"将以下文本翻译为{language}，只输出译文，不要额外解释：\n\n{text}"
    )
    inputs = tokenizer.apply_chat_template(
        [{"role": "user", "content": prompt}], tokenize=True,
        add_generation_prompt=False, return_tensors="pt",
    )
    if inputs.shape[1] > 8192:
        raise ValueError("Translation input exceeds verified context window")
    with torch.inference_mode():
        output = network.generate(inputs, max_new_tokens=2048, do_sample=False, num_beams=2, repetition_penalty=1.05)
    tokens = output[0, inputs.shape[1]:]
    if len(tokens) == 2048:
        raise ValueError("Incomplete translation")
    return tokenizer.decode(tokens, skip_special_tokens=True).strip()


def translate_content(text, target):
    spans = display_spans(text, target)
    prefix = "__KEEP_"
    while prefix in text:
        prefix = "_" + prefix
    parts, protected = [], {}
    position = 0
    for start, end, value in spans:
        marker = f"{prefix}{len(protected)}__"
        parts.extend([text[position:start], marker])
        protected[marker] = value
        position = end
    parts.append(text[position:])
    masked = "".join(parts)
    prose = masked
    for marker in protected:
        prose = prose.replace(marker, "")
    if not re.search(r"[a-zA-Z]" if target == "zh" else r"[\u3400-\u9fff]", prose):
        return text
    result = infer(masked, target, protected) if protected else infer(masked, target)
    for marker in protected:
        if result.count(marker) != 1:
            raise ValueError("Translation changed protected source facts")
    if set(re.findall(re.escape(prefix) + r"\d+__", result)) != set(protected):
        raise ValueError("Translation invented a protected source fact")
    # Replace simultaneously: user-authored text may itself resemble a marker.
    restored = re.sub(re.escape(prefix) + r"\d+__", lambda match: protected[match.group()], result)
    def phrase_counts(value):
        tokens = re.findall(r"[a-z0-9]+|[\u3400-\u9fff]", value.casefold())
        counts = {}
        for size in range(4, min(12, len(tokens) // 2) + 1):
            for index in range(len(tokens) - size + 1):
                phrase = tuple(tokens[index:index + size])
                counts[phrase] = counts.get(phrase, 0) + 1
        return counts

    source_phrases = phrase_counts(text)
    if any(count > source_phrases.get(phrase, 0) for phrase, count in phrase_counts(restored).items() if count > 1):
        raise ValueError("Translation repeated a source phrase")
    for value in set(protected.values()):
        if re.search(r"[A-Za-z0-9]{3}", value):
            before = r"(?<![A-Za-z0-9])" if value[0].isascii() and value[0].isalnum() else ""
            after = r"(?![A-Za-z0-9])" if value[-1].isascii() and value[-1].isalnum() else ""
            pattern = before + re.escape(value) + after
            if len(re.findall(pattern, restored)) > len(re.findall(pattern, text)):
                raise ValueError("Translation repeated a protected source fact")
    return restored


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


def translate(texts: list[str], target: str, *, isolate_failures=False) -> list[str | None]:
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
            try:
                result = translate_content(text, target)
                if not result:
                    raise ValueError("Empty translation")
            except (ValueError, RuntimeError, OSError):
                if not isolate_failures:
                    raise
                results.append(None)
                continue
            remember(text, target, result)
            results.append(result)
        return results


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    def log_message(self, *_):
        pass  # Do not log submitted catalogue text.

    def reply(self, code, body):
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        origin = self.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS:
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
        origin = self.headers.get("Origin", "")
        if origin not in ALLOWED_ORIGINS:
            return self.reply(403, {"error": "Untrusted origin"})
        self.send_response(204)
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        self.reply(200, {"service": "campusloop-catalog-translation-v1", "status": "ok", "revision": REVISION, "languages": ["zh", "en"], "loaded": list(loaded), "model": MODEL_ID, "modelRevision": MODEL_REVISION})

    def do_POST(self):
        try:
            if self.path != "/translate":
                return self.reply(404, {"error": "Not found"})
            origin = self.headers.get("Origin")
            if origin is not None and origin not in ALLOWED_ORIGINS:
                return self.reply(403, {"error": "Untrusted origin"})
            if self.headers.get_content_type() != "application/json":
                return self.reply(415, {"error": "JSON required"})
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 131072:
                return self.reply(413, {"error": "Request too large"})
            body = json.loads(self.rfile.read(size))
            if not isinstance(body, dict):
                return self.reply(422, {"error": "Invalid translation request"})
            texts, target = body.get("texts"), body.get("target")
            if target not in MODELS or not isinstance(texts, list) or not 0 < len(texts) <= 32 or any(not isinstance(s, str) or len(s) > 5000 for s in texts):
                return self.reply(422, {"error": "Invalid translation request"})
            self.reply(200, {"translations": translate(texts, target, isolate_failures=True)})
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
        print("Bilingual translation model is ready", flush=True)
    else:
        ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()
