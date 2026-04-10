"""
Small Step 1 runtime verification script.

What this verifies:
- the FastAPI app is reachable
- the Postgres connectivity route is reachable

What this does NOT verify:
- extension boot in VS Code
- migrations
- planner behavior

Those belong to other steps or to a manual check.
"""

from __future__ import annotations

import json
import sys
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

BASE_URL = "http://127.0.0.1:8000"


def fetch_json(url: str) -> dict:
    """
    Fetches a JSON response from a local URL and returns it as a dict.

    We use urllib from the standard library so there is no extra dependency.
    """
    with urlopen(url, timeout=5) as response:
        body = response.read().decode("utf-8")
        return json.loads(body)


def main() -> int:
    """
    Runs the Step 1 API/runtime checks.

    Exit codes:
    - 0: success
    - 1: failure
    """
    try:
        health = fetch_json(f"{BASE_URL}/health")
        db_health = fetch_json(f"{BASE_URL}/health/db")
    except HTTPError as exc:
        print(f"[verify] HTTP error while checking local API: {exc}", file=sys.stderr)
        return 1
    except URLError as exc:
        print(
            f"[verify] Could not reach local API at {BASE_URL}: {exc}",
            file=sys.stderr,
        )
        return 1
    except Exception as exc:
        print(f"[verify] Unexpected verification error: {exc}", file=sys.stderr)
        return 1

    if health.get("status") != "ok":
        print(f"[verify] /health failed: {health}", file=sys.stderr)
        return 1

    if db_health.get("status") != "ok":
        print(f"[verify] /health/db failed: {db_health}", file=sys.stderr)
        return 1

    print("[verify] /health -> ok")
    print(
        f"[verify] /health/db -> ok (database={db_health.get('database_name', 'unknown')})"
    )
    print("[verify] Step 1 runtime checks passed.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
