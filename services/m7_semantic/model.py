"""Pinned, offline-only BGE encoder. Downloading is a separate explicit action."""
import hashlib
import json
import math
from pathlib import Path
import unicodedata
from services.m7_baseline.engine import ROOT

CONFIG_PATH = ROOT / "docs/evidence/phase-4/intelligence/model-config.candidate.json"
PROVENANCE_PATH = CONFIG_PATH.with_name("source-provenance.json")


class CandidateUnavailable(RuntimeError):
    pass


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def fingerprint(value):
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def config():
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def identity(dictionary):
    settings = config()
    settings = {k: v for k, v in settings.items() if k not in {"readiness", "deploymentEnabled", "sourceProvenanceFile"}}
    source = json.loads(PROVENANCE_PATH.read_text(encoding="utf-8"))
    return fingerprint({"config": settings, "dictionary": dictionary,
                        "files": {k: v["sha256"] for k, v in source["fetchedFiles"].items()},
                        "weights": source["upstreamModelWeight"]["sha256"]})


def normalize(text):
    return " ".join(unicodedata.normalize("NFKC", text).split())


def document_text(product, dictionary):
    return normalize(" ".join([product["title"], product["attributes"]["model"] or "",
                               dictionary.get("categoryNames", {}).get(product["categoryId"], ""),
                               product["description"]]))


def checked_vector(vector, dimension):
    try:
        values = [float(v) for v in vector]
    except (ValueError, TypeError, OverflowError) as exc:
        raise CandidateUnavailable("INVALID_VECTOR") from exc
    if len(values) != dimension or any(not math.isfinite(v) for v in values):
        raise CandidateUnavailable("INVALID_VECTOR")
    norm = math.sqrt(sum(v * v for v in values))
    if not math.isfinite(norm) or norm <= 0:
        raise CandidateUnavailable("INVALID_VECTOR")
    return [v / norm for v in values]


class Encoder:
    def __init__(self, model_dir, dictionary):
        self.settings = config()
        self.identity = identity(dictionary)
        self.dimension = self.settings["dimension"]
        self.directory = Path(model_dir)
        self._runtime = None

    def _load(self):
        if self._runtime is not None:
            return self._runtime
        try:
            source = json.loads(PROVENANCE_PATH.read_text(encoding="utf-8"))
            files = dict(source["fetchedFiles"])
            files["model.safetensors"] = source["upstreamModelWeight"]
            for name, expected in files.items():
                path = self.directory / name
                if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected["sha256"]:
                    raise CandidateUnavailable("MODEL_ARTIFACT_MISMATCH")
            import torch
            from transformers import AutoModel, AutoTokenizer
            torch.manual_seed(self.settings["seed"])
            torch.set_num_threads(self.settings["intraOpThreads"])
            torch.use_deterministic_algorithms(True)
            tokenizer = AutoTokenizer.from_pretrained(self.directory, local_files_only=True, trust_remote_code=False)
            tokenizer.truncation_side = "right"
            model = AutoModel.from_pretrained(self.directory, local_files_only=True, trust_remote_code=False,
                                              use_safetensors=True, attn_implementation="eager")
            model = model.to(device="cpu", dtype=torch.float32).eval()
            if model.config.hidden_size != self.dimension:
                raise CandidateUnavailable("MODEL_DIMENSION_MISMATCH")
            self._runtime = torch, tokenizer, model
            return self._runtime
        except CandidateUnavailable:
            raise
        except (ImportError, OSError, RuntimeError, ValueError) as exc:
            raise CandidateUnavailable("MODEL_LOAD_FAILURE") from exc

    def encode(self, texts, *, query=False):
        if not isinstance(texts, list) or any(not isinstance(t, str) for t in texts):
            raise ValueError("texts must be a list of strings")
        if not texts:
            return []
        torch, tokenizer, model = self._load()
        values = [normalize(t) for t in texts]
        if query:
            values = [self.settings["queryInstruction"] + t for t in values]
        result = []
        try:
            with torch.inference_mode():
                for start in range(0, len(values), self.settings["batchSize"]):
                    batch = tokenizer(values[start:start + self.settings["batchSize"]], padding=True,
                                      truncation=True, max_length=self.settings["maximumTokens"], return_tensors="pt")
                    vectors = model(**batch).last_hidden_state[:, 0, :].float()
                    vectors = torch.nn.functional.normalize(vectors, p=2, dim=1)
                    result.extend(checked_vector(v, self.dimension) for v in vectors.tolist())
            return result
        except (RuntimeError, ValueError) as exc:
            raise CandidateUnavailable("MODEL_INFERENCE_FAILURE") from exc
