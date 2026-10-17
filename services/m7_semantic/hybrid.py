"""Constraint-first private hybrid candidate, with an explicit baseline fallback."""
import copy
from datetime import datetime
from services.m7_baseline.engine import rank as baseline_rank
from services.m7_baseline.engine import validate_inputs
from .model import CandidateUnavailable, config, identity


def rank(products, request, dictionary, *, index=None, encoder=None, experimental=False, sort="relevance"):
    # Validate permissions/state/inputs before handling any candidate failure.
    baseline = baseline_rank(products, request, dictionary, sort=sort)
    def fallback(reason):
        result = copy.deepcopy(baseline)
        result["metadata"].update(degraded=True, fallbackReason=reason)
        return result
    if not experimental:
        return fallback("MODEL_DISABLED")
    if not request["queryText"].strip() or sort != "relevance":
        return baseline
    blank = copy.deepcopy(request)
    blank["queryText"] = ""
    pool = baseline_rank(products, blank, dictionary)
    by_id = {p["productId"]: p for p in validate_inputs(products, request, dictionary)}
    eligible = [by_id[item["productId"]] for item in pool["items"]]
    if not eligible:
        return baseline
    settings = config()
    ranking = settings["ranking"]
    depth = ranking["maximumCandidateDepth"]
    try:
        if encoder is None or index is None:
            raise CandidateUnavailable("DEPENDENCY_UNAVAILABLE")
        if encoder.identity != identity(dictionary):
            raise CandidateUnavailable("ENCODER_VERSION_MISMATCH")
        vector = encoder.encode([request["queryText"]], query=True)[0]
        vector_hits = index.query(vector, eligible, identity=encoder.identity, limit=depth)
        if not vector_hits:
            raise CandidateUnavailable("VECTOR_NO_RESULTS")
    except (CandidateUnavailable, OSError, RuntimeError) as exc:
        return fallback(str(exc) if isinstance(exc, CandidateUnavailable) else "CANDIDATE_ERROR")
    keyword_ranks = {item["productId"]: i for i, item in enumerate(baseline["items"][:depth], 1)
                     if item["relevanceScore"] is not None and item["relevanceScore"] > 0}
    vector_ranks = {pid: (i, cosine) for i, (pid, cosine) in enumerate(vector_hits, 1)}
    constraints = {item["productId"]: item for item in pool["items"]}
    ids = set(keyword_ranks) | set(vector_ranks)
    items = []
    for pid in ids:
        kr = keyword_ranks.get(pid)
        vr, cosine = vector_ranks.get(pid, (None, None))
        kw = ranking["keywordWeight"] / (ranking["rrfK"] + kr) if kr else 0.0
        vw = ranking["vectorWeight"] / (ranking["rrfK"] + vr) if vr else 0.0
        item = copy.deepcopy(constraints[pid])
        item.update(relevanceScore=kw + vw, scoreType="rrf_v1", reasons=["关键词与语义排名融合；硬约束已通过"])
        item["explanationDetails"].append({"code": "HYBRID_RRF", "kind": "factor", "ruleVersion": ranking["version"],
                                           "keywordRank": kr, "vectorRank": vr, "cosine": cosine,
                                           "keywordContribution": kw, "vectorContribution": vw,
                                           "scoreIsProbability": False})
        items.append(item)
    def order(item):
        p = by_id[item["productId"]]
        return (-item["relevanceScore"], -datetime.fromisoformat(p["publishedAt"].replace("Z", "+00:00")).timestamp(), int(p["productId"]))
    result = {"items": sorted(items, key=order), "metadata": copy.deepcopy(baseline["metadata"])}
    result["metadata"].update(schemaVersion="m7-hybrid-result-v1", algorithmVersion=ranking["version"],
                              mode="experimental_hybrid", modelVersion=settings["modelId"] + "@" + settings["revision"],
                              indexIdentity=encoder.identity, deploymentEnabled=False)
    return result
