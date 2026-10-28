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
        "Cookie": private,
        "set-cookie": private,
        "browser_token": private,
        "token-hash": private,
        "api-key": private,
        "refresh_token_hash": private,
        "userEmail": private,
        "privateEvidenceUrl": private,
        "requestBodyContent": private,
        "sessionCookie": private,
    }
    for formatter in (JsonFormatter(), TextFormatter()):
        result = formatter.format(record)
        assert private not in result
        assert "safe-id" in result


@pytest.mark.parametrize("original", [None, 2, 2.5])
def test_product_original_price_accepts_unknown_equal_or_higher(original):
    body = ProductWrite(
        title="Book",
        category="BOOKS",
        condition="GOOD",
        price=2,
        originalPrice=original,
        campusLocation="Library",
        images=["https://example.invalid/image.jpg"],
    )
    assert body.originalPrice == original


def test_product_original_price_below_sale_is_a_field_validation_error():
    with pytest.raises(ValidationError) as error:
        ProductWrite(
            title="Book",
            category="BOOKS",
            condition="GOOD",
            price=2,
            originalPrice=0.5,
            campusLocation="Library",
            images=["https://example.invalid/image.jpg"],
        )
    assert error.value.errors()[0]["loc"] == ("originalPrice",)


def test_invalid_request_id_is_sanitized_in_headers_and_error_body(client):
    response = client.post("/auth/login", json={}, headers={"X-Request-ID": "invalid request id"})
    assert response.status_code == 422
    assert response.json()["requestId"] == response.headers["X-Request-ID"]
    assert response.json()["requestId"] != "invalid request id"
