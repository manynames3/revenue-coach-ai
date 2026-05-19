from sqlalchemy import inspect, text

from app.database import engine


def handler(event, context):
    with engine.begin() as connection:
        inspector = inspect(connection)
        table_columns = {
            table: {column["name"] for column in inspector.get_columns(table)}
            for table in ("call_analyses", "calls", "organizations")
        }
        is_postgres = engine.dialect.name == "postgresql"
        json_type = "JSONB" if is_postgres else "JSON"

        additions = [
            ("call_analyses", "sales_psychology", json_type),
            ("call_analyses", "evidence", json_type),
            ("calls", "consent_confirmed", "BOOLEAN DEFAULT FALSE NOT NULL"),
            ("calls", "consent_notes", "TEXT"),
            ("organizations", "coaching_framework", json_type),
            ("organizations", "data_retention_days", "INTEGER DEFAULT 90 NOT NULL"),
            ("organizations", "recording_consent_required", "BOOLEAN DEFAULT TRUE NOT NULL"),
            ("organizations", "pii_redaction_enabled", "BOOLEAN DEFAULT FALSE NOT NULL"),
        ]

        for table, column, definition in additions:
            if column in table_columns.get(table, set()):
                continue
            if is_postgres:
                ddl = f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {definition}"
            else:
                ddl = f"ALTER TABLE {table} ADD COLUMN {column} {definition}"
            connection.execute(text(ddl))

    return {"status": "ok", "migration": "evidence_account_trust"}
