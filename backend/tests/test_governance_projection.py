"""Trust privacy contract: unknown advisory extensions cannot become public."""

from app.services.governance import trust_view


def test_projection_removes_internal_fields_including_nested_explanations():
    raw = {
        "status": "AVAILABLE",
        "score": 3.5,
        "validEventCount": 1,
        "ignoredEventCount": 2,
        "email": "private",
        "riskClues": ["private"],
        "evidence": ["private"],
        "chat": "private",
        "password_hash": "private",
        "smoothing": {"priorScore": 3.5, "priorWeight": 5, "internal": "private"},
        "factors": [
            {
                "code": "VALID_COMPLETED_EVENTS",
                "effect": "AGGREGATED",
                "count": 1,
                "evidence": "private",
            },
            {"code": "INTERNAL_RISK", "effect": "private"},
        ],
    }
    public = trust_view(raw, "PUBLIC")
    assert "private" not in str(public)
    assert "smoothing" not in public and "ignoredEventCount" not in public
    assert public["factors"] == [
        {"code": "VALID_COMPLETED_EVENTS", "effect": "AGGREGATED", "count": 1}
    ]
    for visibility in ("SELF", "ADMIN"):
        data = trust_view(raw, visibility)
        assert data["ignoredEventCount"] == 2
        assert data["smoothing"] == {"priorScore": 3.5, "priorWeight": 5}
        assert "private" not in str(data)
