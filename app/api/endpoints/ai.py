import logging
from app.mocks.sql_responses import get_mock_sql
from pydantic import BaseModel


class AIRequest(BaseModel):
    prompt: str = 'выведи мне какая была автоматизация общая с октября 25 года по апрель 26 года, по месяцам в %'


class AIResponse(BaseModel):
    content: str
    model: str | None = None


class HealthStatus(BaseModel):
    status: str


logger = logging.getLogger(__name__)


async def generate_sql(request: AIRequest) -> AIResponse:
    logger.info("generate_sql_query: prompt=%r", request.prompt)

    mock_data = get_mock_sql(request.prompt)

    return AIResponse(
        content=mock_data["generated_sql"],
        model="mock-llm-v1"
    )


async def healthcheck() -> HealthStatus:
    logger.debug("agent healthcheck")
    return HealthStatus(status="ready")
