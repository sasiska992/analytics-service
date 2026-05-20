from fastapi import APIRouter

from app.api.endpoints import ai, app_health, db

api_router = APIRouter()

api_router.post("/agent/generate_sql_query")(ai.generate_sql)
api_router.get("/agent/healthcheck")(ai.healthcheck)

api_router.get("/app/alive")(app_health.alive)
api_router.get("/app/detail")(app_health.detail)
api_router.get("/app/ready")(app_health.ready)

api_router.post("/database/execute_sql_query")(db.execute_sql)
