from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB


def json_document_type():
    return JSON().with_variant(JSONB, "postgresql")
