from typing import Any

from pydantic import BaseModel


class ExecuteSQLQueryRequest(BaseModel):
    sql_query: str


class DBResponse(BaseModel):
    columns: list[str]
    rows_with_column_names: list[dict[str, Any]]
