def get_mock_sql(prompt: str) -> dict:
    prompt_lower = prompt.lower()

    # Пример простой логики маппинга
    if "пассажир" in prompt_lower or "рейс" in prompt_lower:
        return {
            "generated_sql": "SELECT flight_id, passenger_count FROM flights WHERE status = 'completed' LIMIT 10;",
            "explanation": "Выборка завершенных рейсов.",
            "is_safe": True
        }

    # Дефолтный ответ (как в примере из доклада про чат-бот)
    return {
        "generated_sql": "SELECT month, count(*) as total FROM chat_bot_logs WHERE date >= '2025-10-01' AND date <= '2026-04-30' GROUP BY month;",
        "explanation": "Группировка обращений в бот по месяцам за указанный период.",
        "is_safe": True
    }