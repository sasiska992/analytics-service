from enum import Enum

from pydantic import BaseModel


class CheckEnum(str, Enum):
    OK = "OK"
    FAIL = "FAIL"


class CheckResponse(BaseModel):
    status: CheckEnum
