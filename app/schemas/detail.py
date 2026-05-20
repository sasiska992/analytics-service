from pydantic import BaseModel


class AppDetail(BaseModel):
    name: str
    description: str
    version: str
    config_env: str
