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


class DatabaseProofOfLifeResponse(BaseModel):
    """
    Response model for the internal DB proof-of-life route.

    This keeps the route output explicit and stable while Step C is still
    focused on backend foundation rather than business logic.
    """

    status: str
    created_run_id: str
    request_text: str
    run_status: str
    message: str
