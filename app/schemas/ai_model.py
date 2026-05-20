from pydantic import BaseModel


class AIRequest(BaseModel):
    prompt: str


class HealthStatus(BaseModel):
    status: str
