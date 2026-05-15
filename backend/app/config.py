from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://revenuecoach:revenuecoach@localhost:5432/revenuecoach"
    zai_api_key: str = ""
    zai_base_url: str = "https://api.z.ai/api/paas/v4"
    zai_model: str = "glm-5.1"
    mock_ai: bool = False

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
