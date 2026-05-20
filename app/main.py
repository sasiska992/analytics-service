import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.api.endpoints.ui import router as ui_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

BASE_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(
    title="Analytic Service Mock",
    description="Mock backend for S7 Airlines analytics project",
    version="1.0.0",
)

app.include_router(api_router, prefix="/api/v1")

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(ui_router)
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
