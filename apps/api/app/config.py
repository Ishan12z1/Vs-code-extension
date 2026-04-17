from dotenv import load_dotenv
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load local environment variables from .env during development.
# This keeps local startup easy while still allowing real env vars to override.
load_dotenv()


class Settings(BaseSettings):
    """
    Centralized backend settings.
    We are still keeping this intentionally small.
    """

    # Basic app metadata.
    app_name: str = "VS Code Control Agent API"
    environment: str = "development"
    api_version: str = "0.1.0"
    host: str = "127.0.0.1"
    port: int = 8000

    # Main database URL.
    #
    # We support both:
    # - CONTROL_AGENT_DATABASE_URL
    # - DATABASE_URL
    #
    # The plain "postgresql://" form is convenient for local tooling.
    # We convert it to a SQLAlchemy-specific driver URL below when needed.
    database_url: str = Field(
        default="postgresql://postgres:postgres@127.0.0.1:5432/control_agent",
        validation_alias=AliasChoices(
            "CONTROL_AGENT_DATABASE_URL",
            "DATABASE_URL",
        ),
    )

    # Keep DB checks and failed connections fast in local development.
    database_connect_timeout_seconds: int = Field(default=5, ge=1)

    # SQLAlchemy engine options.
    database_echo: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "CONTROL_AGENT_DATABASE_ECHO",
            "DATABASE_ECHO",
        ),
    )
    database_pool_pre_ping: bool = True

    # Tracing is still just a flag for now.
    tracing_enabled: bool = False

    planner_provider: str = Field(
        default="mock",
        validation_alias=AliasChoices(
            "CONTROL_AGENT_PLANNER_PROVIDER",
            "PLANNER_PROVIDER",
        ),
    )

    # Google provider configuration.
    #
    # Keep names explicit and backend-owned.
    google_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "CONTROL_AGENT_GOOGLE_API_KEY",
            "GOOGLE_API_KEY",
        ),
    )
    google_model: str = Field(
        default="gemini-2.5-flash-lite",
        validation_alias=AliasChoices(
            "CONTROL_AGENT_GOOGLE_MODEL",
            "GOOGLE_MODEL",
        ),
    )
    planner_provider_timeout_seconds: int = Field(
        default=30,
        ge=1,
        validation_alias=AliasChoices(
            "CONTROL_AGENT_PLANNER_PROVIDER_TIMEOUT_SECONDS",
            "PLANNER_PROVIDER_TIMEOUT_SECONDS",
        ),
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @property
    def sqlalchemy_database_url(self) -> str:
        """
        Returns a SQLAlchemy-ready database URL.
        This lets the rest of the app depend on one normalized URL.
        """
        if self.database_url.startswith("postgresql+psycopg://"):
            return self.database_url

        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace(
                "postgresql://",
                "postgresql+psycopg://",
                1,
            )

        # Fall back to the raw value for any future custom driver/use case.
        return self.database_url


settings = Settings()
