import os

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    """
    Centralized app settings loaded from environment variables.

    We keep this small for Step 1:
    - basic app metadata
    - host/port
    - database URL
    - DB connect timeout
    """

    app_name: str = "VS Code Control Agent API"
    environment: str = "development"
    api_version: str = "0.1.0"
    host: str = "127.0.0.1"
    port: int = 8000

    # Local default points to Docker Postgres exposed on localhost.
    database_url: str | None = os.getenv("DATABASE_URL")

    # Keep DB checks fast in local development.
    database_connect_timeout_seconds: int = 5

    tracing_enabled: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="CONTROL_AGENT_",
        extra="ignore",
    )


settings = Settings()
