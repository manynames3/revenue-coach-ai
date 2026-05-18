from sqlalchemy import text

from app.database import engine


def handler(event, context):
    if engine.dialect.name == "postgresql":
        ddl = "ALTER TABLE call_analyses ADD COLUMN IF NOT EXISTS sales_psychology JSONB"
    else:
        ddl = "ALTER TABLE call_analyses ADD COLUMN sales_psychology JSON"

    with engine.begin() as connection:
        connection.execute(text(ddl))

    return {"status": "ok", "migration": "sales_psychology"}
