import logging

from app.mocks.db_data import execute_mock_sql
from app.schemas.db import DBResponse, ExecuteSQLQueryRequest

logger = logging.getLogger(__name__)


async def execute_sql(request: ExecuteSQLQueryRequest) -> DBResponse:
    logger.info("execute_sql_query: sql=%r", request.sql_query)
    result = execute_mock_sql(request.sql_query)
    return DBResponse(
        columns=result["columns"],
        rows_with_column_names=result["rows_with_column_names"],
    )
