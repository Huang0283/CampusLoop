"""Raise, never lower, PostgreSQL sequences after explicit-ID demo imports."""

from sqlalchemy import text


def align_sequences(connection, tables):
    quote = connection.dialect.identifier_preparer.quote
    for table in sorted(tables):
        # Names come from our model/migration allowlist, never an HTTP request.
        connection.execute(text(f"LOCK TABLE {quote(table)} IN SHARE ROW EXCLUSIVE MODE"))
        sequence = connection.scalar(
            text("SELECT pg_get_serial_sequence(:table, 'id')"), {"table": table}
        )
        if not sequence:
            continue
        qualified = ".".join(quote(part) for part in sequence.split("."))
        current = connection.scalar(text(f"SELECT last_value FROM {qualified}"))
        maximum = connection.scalar(text(f"SELECT COALESCE(MAX(id), 0) FROM {quote(table)}"))
        connection.execute(
            text("SELECT setval(CAST(:sequence AS regclass), :value, true)"),
            {"sequence": sequence, "value": max(current, maximum, 1)},
        )
