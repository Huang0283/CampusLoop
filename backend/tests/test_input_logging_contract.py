import logging
import sys

import pytest
from pydantic import ValidationError

from app.core.logging import JsonFormatter, TextFormatter
from app.schemas.business import ProductWrite


def test_nullable_original_price_does_not_relax_required_price():
    fields = dict(
        title="Book",
        category="BOOKS",
        condition="GOOD",
        price=50,
        originalPrice=None,
        campusLocation="Library",
        images=["https://example.invalid/image.jpg"],
    )
    assert ProductWrite(**fields).originalPrice is None
    for field, value in [
        ("price", None),
        ("price", True),
        ("originalPrice", True),
        ("category", "invented"),
        ("condition", "invented"),
    ]:
        with pytest.raises(ValidationError):
            ProductWrite(**(fields | {field: value}))


def test_private_log_fields_and_exception_parameters_are_not_emitted():
    private = "fixture-sensitive-value"
    try:
        raise RuntimeError(private)
    except RuntimeError:
        record = logging.LogRecord(
            "runtime", logging.ERROR, "fixture", 1, "Safe operation failed.", (), sys.exc_info()
        )
    record.extra_data = {
        "email": private,
        "refreshToken": private,
        "nested": [{"password_hash": private, "content": private, "requestId": "safe-id"}],
    }
    for formatter in (JsonFormatter(), TextFormatter()):
        result = formatter.format(record)
        assert private not in result
        assert "safe-id" in result


def test_invalid_request_id_is_sanitized_in_headers_and_error_body(client):
    response = client.post("/auth/login", json={}, headers={"X-Request-ID": "invalid request id"})
    assert response.status_code == 422
    assert response.json()["requestId"] == response.headers["X-Request-ID"]
    assert response.json()["requestId"] != "invalid request id"
