"""Unified Phase 4 regression metrics for baseline/candidate comparisons."""
from __future__ import annotations

from statistics import median


def regression_metrics(rows: list[dict]) -> dict:
    """Compute only from eligible L3 rows; never substitute listing/offer prices."""
    eligible = [
        row for row in rows
        if row.get("labelLevel") == "L3_COMPLETED_TRANSACTION"
        and isinstance(row.get("transactionPriceFen"), int)
        and not isinstance(row.get("transactionPriceFen"), bool)
        and row["transactionPriceFen"] > 0
        and isinstance(row.get("recommendedFen"), int)
        and not isinstance(row.get("recommendedFen"), bool)
        and isinstance(row.get("lowerFen"), int)
        and isinstance(row.get("upperFen"), int)
        and not isinstance(row.get("lowerFen"), bool)
        and not isinstance(row.get("upperFen"), bool)
        and 0 < row["lowerFen"] <= row["upperFen"]
        and row["recommendedFen"] >= 0
        and row["lowerFen"] <= row["recommendedFen"] <= row["upperFen"]
    ]
    if not eligible:
        return {
            "status": "NOT_EVALUATED",
            "eligibleL3Count": 0,
            "maeFen": None,
            "nmae": None,
            "mape": None,
            "intervalCoverage": None,
            "normalizedWidth": None,
            "reason": "No eligible L3_COMPLETED_TRANSACTION rows with valid predictions; listing and accepted-offer prices are not truth.",
        }
    truths = [row["transactionPriceFen"] for row in eligible]
    absolute = [abs(row["recommendedFen"] - row["transactionPriceFen"]) for row in eligible]
    mae = sum(absolute) / len(eligible)
    return {
        "status": "EVALUATED",
        "eligibleL3Count": len(eligible),
        "maeFen": mae,
        "nmae": mae / median(truths),
        "mape": sum(error / row["transactionPriceFen"] for error, row in zip(absolute, eligible)) / len(eligible),
        "intervalCoverage": sum(row["lowerFen"] <= row["transactionPriceFen"] <= row["upperFen"] for row in eligible) / len(eligible),
        "normalizedWidth": sum((row["upperFen"] - row["lowerFen"]) / row["transactionPriceFen"] for row in eligible) / len(eligible),
    }
