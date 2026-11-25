"""Malformed PNGs fail before any media or database write, for every upload route."""

import io
from unittest.mock import Mock, patch

import pytest
from PIL import Image

from app.core.errors import BusinessError
from app.services.storage import upload


def corrupt_png():
    output = io.BytesIO()
    Image.new("RGB", (4, 4), "blue").save(output, format="PNG")
    content = bytearray(output.getvalue())
    chunk = content.index(b"IDAT")
    length = int.from_bytes(content[chunk - 4 : chunk], "big")
    content[chunk + 4 + length] ^= 1
    return bytes(content)


@pytest.mark.parametrize("purpose", ["product", "avatar", "chat", "report", "appeal"])
def test_bad_png_crc_is_a_client_error_without_side_effects(purpose):
    database = Mock()
    with patch("app.services.storage.storage_client") as storage:
        with pytest.raises(BusinessError) as error:
            upload(database, Mock(id=1), corrupt_png(), purpose)
        assert error.value.status == 415 and error.value.code == "UNSUPPORTED_IMAGE"
        storage.assert_not_called()
        database.add.assert_not_called()
        database.commit.assert_not_called()
