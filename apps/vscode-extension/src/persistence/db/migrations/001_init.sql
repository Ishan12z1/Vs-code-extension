-- 001_init.sql
--
-- Purpose:
-- - establish a small baseline app metadata table
-- - keep migration bookkeeping separate in sqlite.ts
--
-- Note:
-- - the migration runner itself creates the _schema_migrations table
-- - that avoids a chicken-and-egg problem during first boot

CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL
);