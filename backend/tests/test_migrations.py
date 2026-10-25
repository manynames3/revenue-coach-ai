import os
from pathlib import Path
import subprocess
import sys

from sqlalchemy import create_engine, inspect, text

BACKEND = Path(__file__).resolve().parents[1]


def test_migrations_preserve_legacy_data_but_do_not_activate_unverified_seats(tmp_path):
    url = "sqlite:///" + str(tmp_path / "migrations.db")
    env = {**os.environ, "DATABASE_URL": url}
    def migrate(*args):
        subprocess.run([sys.executable, "-m", "alembic", *args], cwd=BACKEND, env=env,
                       check=True, capture_output=True, text=True)
    migrate("upgrade", "0003_add_evidence_account_trust")
    db = create_engine(url)
    with db.begin() as connection:
        connection.execute(text("INSERT INTO organizations (id, name, created_at) VALUES "
                                "('legacy-org', 'Legacy Team', '2026-01-01 00:00:00')"))
        connection.execute(text("INSERT INTO users (id, email, password_hash, organization_id, created_at) "
                                "VALUES ('legacy-user', 'legacy@example.com', 'unusable-legacy-placeholder', 'legacy-org', '2026-01-01 00:00:00')"))
    migrate("upgrade", "head")
    with db.connect() as connection:
        assert connection.execute(text("SELECT active FROM users WHERE id='legacy-user'")).scalar() == 0
        assert connection.execute(text("SELECT processing_enabled FROM organizations WHERE id='legacy-org'")).scalar() == 0
    migrate("downgrade", "0003_add_evidence_account_trust")
    assert "active" not in {column["name"] for column in inspect(db).get_columns("users")}
    migrate("upgrade", "head")
    with db.connect() as connection:
        assert connection.execute(text("SELECT name FROM organizations WHERE id='legacy-org'")).scalar() == "Legacy Team"
    db.dispose()
