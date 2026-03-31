from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "VS code control agent api"
    environment: str = "development"
    api_version: str = "0.1.0"
    host: str = "127.0.0.1"
    port: int = 8000

    database_url: str = "postgresql://postgres:postgres@127.0.0.1:5432/control_agent"
    tracing_enabled: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_prefix="CONTROL_AGENT_", extra="ignore")


settings = Settings()
