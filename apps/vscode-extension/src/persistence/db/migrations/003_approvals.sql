-- 003_approvals.sql
--
-- Purpose:
-- - durable approval records tied to runs
-- - this will support future approval UI/history

CREATE TABLE IF NOT EXISTS approvals (
  request_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT,
  decided_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(run_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_approvals_run_id
  ON approvals(run_id);

CREATE INDEX IF NOT EXISTS idx_approvals_decided_at
  ON approvals(decided_at DESC);