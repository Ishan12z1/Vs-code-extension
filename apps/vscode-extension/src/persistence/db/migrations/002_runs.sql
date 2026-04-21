-- 002_runs.sql
--
-- Purpose:
-- - durable metadata for one agent run
-- - enough to support later run history and status tracking

CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  goal_text TEXT NOT NULL,
  status TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 0,
  max_steps INTEGER NOT NULL,
  active_surface TEXT,
  final_summary TEXT,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_runs_status
  ON runs(status);

CREATE INDEX IF NOT EXISTS idx_runs_started_at
  ON runs(started_at DESC);