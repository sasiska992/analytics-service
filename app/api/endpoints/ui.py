from fastapi import APIRouter
from fastapi.responses import FileResponse
import os

# Создаем роутер (если он еще не создан в этом файле)
router = APIRouter()


@router.get("/ui")
def ui():
    """
    Отдает статический HTML файл интерфейса.
    Файл должен лежать по пути: static/ui/index.html
    """
    file_path = os.path.join("static", "index.html")
    print(file_path)

    if not os.path.exists(file_path):
        return {"error": "UI file not found. Please create static/index.html"}

    return FileResponse(file_path)
