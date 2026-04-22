-- 006_approval_requests.sql
--
-- Purpose:
-- - persist approval requests separately from approval decisions
-- - let the runtime and UI query pending approvals later
-- - keep request/decision lifecycle explicit

CREATE TABLE IF NOT EXISTS approval_requests (
  request_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  target_label TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  reason TEXT NOT NULL,
  preview_summary TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(run_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_run_id
  ON approval_requests(run_id);

CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at
  ON approval_requests(created_at DESC);