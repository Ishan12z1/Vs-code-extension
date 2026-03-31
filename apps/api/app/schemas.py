from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str


class DatabaseHealthResponse(BaseModel):
    status: str
    database_name: str | None = None


class VersionResponse(BaseModel):
    name: str
    version: str
    environment: str


class PlanPlaceholderRequest(BaseModel):
    user_request: str


class PlanPlaceholderResponse(BaseModel):
    status: str
    message: str
    received_request: str
