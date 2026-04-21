-- 005_marketplace_cache.sql
--
-- Purpose:
-- - local cache for marketplace query results / metadata
-- - payload is stored as JSON text for now

CREATE TABLE IF NOT EXISTS marketplace_cache (
  cache_key TEXT PRIMARY KEY,
  query_text TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  expires_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_marketplace_cache_query_text
  ON marketplace_cache(query_text);

CREATE INDEX IF NOT EXISTS idx_marketplace_cache_fetched_at
  ON marketplace_cache(fetched_at DESC);