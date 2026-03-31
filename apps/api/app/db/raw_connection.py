from psycopg import connect
from psycopg.rows import dict_row

from app.config import settings


def test_database_connection() -> dict:
    """
    Performs a tiny raw Postgres connectivity check.

    Returns a small structured result for the health route.
    """
    with connect(
        settings.database_url,
        row_factory=dict_row,
        connect_timeout=settings.database_connect_timeout_seconds,
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT current_database() AS database_name;")
            row = cursor.fetchone()

    return {
        "status": "ok",
        "database_name": row["database_name"] if row else None,
    }
