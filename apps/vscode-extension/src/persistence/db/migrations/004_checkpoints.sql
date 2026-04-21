-- 004_checkpoints.sql
--
-- Purpose:
-- - durable per-step runtime checkpoints
-- - JSON is stored as TEXT for now
-- - the runtime can deserialize these later

CREATE TABLE IF NOT EXISTS checkpoints (
  checkpoint_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  status TEXT NOT NULL,
  active_surface TEXT,
  note TEXT NOT NULL,
  context_json TEXT NOT NULL DEFAULT '{}',
  pending_tool_call_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(run_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_run_id
  ON checkpoints(run_id);

CREATE INDEX IF NOT EXISTS idx_checkpoints_run_step
  ON checkpoints(run_id, step_index);