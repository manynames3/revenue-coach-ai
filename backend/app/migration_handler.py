from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory


def handler(event, context):
    root = Path(__file__).resolve().parent.parent
    config = Config(str(root / "alembic.ini"))
    config.set_main_option("script_location", str(root / "alembic"))
    command.upgrade(config, "head")
    return {"status": "ok", "migration": ScriptDirectory.from_config(config).get_current_head()}
