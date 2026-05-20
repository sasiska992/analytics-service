def execute_mock_sql(sql: str) -> dict:
    sql_lower = sql.lower()

    if "chat_bot" in sql_lower or "month" in sql_lower:
        return {
            "columns": ["month", "total"],
            "rows_with_column_names": [
                {"month": "2025-10", "total": 120},
                {"month": "2025-11", "total": 145},
                {"month": "2025-12", "total": 200},
                {"month": "2026-01", "total": 180},
                {"month": "2026-02", "total": 190},
                {"month": "2026-03", "total": 210},
                {"month": "2026-04", "total": 230}
            ]
        }
    elif "flight" in sql_lower or "passenger" in sql_lower:
        return {
            "columns": ["flight_id", "passenger_count"],
            "rows_with_column_names": [
                {"flight_id": "S7-101", "passenger_count": 150},
                {"flight_id": "S7-102", "passenger_count": 142},
                {"flight_id": "S7-103", "passenger_count": 160}
            ]
        }
    else:
        # Фоллбэк, если паттерн не распознан
        return {
            "columns": ["info"],
            "rows_with_column_names": [
                {"info": "Mock data for unknown query pattern"}
            ]
        }