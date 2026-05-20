import logging

from app.schemas.check import CheckEnum, CheckResponse
from app.schemas.detail import AppDetail

logger = logging.getLogger(__name__)


async def alive() -> CheckResponse:
    logger.debug("app alive")
    return CheckResponse(status=CheckEnum.OK)


async def ready() -> CheckResponse:
    logger.debug("app ready")
    return CheckResponse(status=CheckEnum.OK)


async def detail() -> AppDetail:
    logger.debug("app detail")
    return AppDetail(
        name="analytic_service",
        description="Mock Backend for S7 Analytics",
        version="1.0.0-mock",
        config_env="development",
    )
