from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class Settings(BaseSettings):
    database_url: str = "postgresql://revenuecoach:revenuecoach@localhost:5432/revenuecoach"
    zai_api_key: str = ""
    zai_base_url: str = "https://api.z.ai/api/paas/v4"
    zai_model: str = "glm-5.1"
    mock_ai: bool = False
    auto_create_schema: bool = False
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3010"]
    frontend_url: str = "http://localhost:3000"
    session_cookie_secure: bool = False
    session_cookie_samesite: str = "lax"
    session_hours: int = 8
    analysis_timeout_seconds: int = 45
    max_transcript_characters: int = 80000
    daily_analysis_limit: int = 100
    pilot_price_usd: int | None = Field(default=None, ge=1)
    support_email: str = ""
    auth_email_from: str = ""
    proxy_secret: str = ""

    # AWS Settings
    aws_region: str = "us-east-1"
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_s3_bucket: str = "revenuecoach-audio"
    max_audio_upload_bytes: int = 100 * 1024 * 1024

    @field_validator("database_url")
    @classmethod
    def use_installed_postgres_driver(cls, value):
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg2://", 1)
        return value

    @field_validator("pilot_price_usd", mode="before")
    @classmethod
    def optional_pilot_price(cls, value):
        return None if value == "" else value

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
