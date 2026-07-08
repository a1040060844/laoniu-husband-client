PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'wife', 'husband')),
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY DEFAULT 'main',
  state_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS system_progress (
  id TEXT PRIMARY KEY DEFAULT 'main',
  level INTEGER NOT NULL DEFAULT 1,
  exp INTEGER NOT NULL DEFAULT 0,
  total_exp INTEGER NOT NULL DEFAULT 0,
  wallet INTEGER NOT NULL DEFAULT 0,
  rewarded_task_ids_json TEXT NOT NULL DEFAULT '[]',
  punishment_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS role_overrides (
  level INTEGER PRIMARY KEY,
  title TEXT,
  english_title TEXT,
  salary INTEGER,
  description TEXT,
  story TEXT,
  illustration_url TEXT,
  benefit_illustration_url TEXT,
  bgm_url TEXT,
  theme_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS custom_roles (
  level INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  english_title TEXT,
  salary INTEGER NOT NULL,
  description TEXT,
  story TEXT NOT NULL,
  illustration_url TEXT NOT NULL,
  benefit_illustration_url TEXT NOT NULL,
  bgm_url TEXT,
  theme_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS benefit_definitions (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('default', 'custom')),
  name TEXT NOT NULL,
  subtitle TEXT,
  description TEXT NOT NULL,
  unlock_level INTEGER NOT NULL DEFAULT 0,
  frequency_label TEXT NOT NULL,
  cooldown_json TEXT NOT NULL DEFAULT '{"amount":0,"unit":"none"}',
  icon TEXT NOT NULL,
  illustration_url TEXT,
  request_button_text TEXT NOT NULL,
  request_success_text TEXT NOT NULL,
  approve_text TEXT NOT NULL,
  reject_text TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS benefit_overrides (
  id TEXT PRIMARY KEY,
  patch_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS benefit_runtime_states (
  benefit_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'locked',
  cooldown_text TEXT,
  last_requested_at TEXT,
  last_approved_at TEXT,
  cooldown_until TEXT,
  available_bonus_count INTEGER NOT NULL DEFAULT 0,
  pending_request_json TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  module_id TEXT,
  module_label TEXT,
  target TEXT,
  action TEXT,
  standard TEXT,
  time_config_json TEXT,
  cycle_id TEXT,
  due_at TEXT,
  expired_at TEXT,
  completed_count INTEGER,
  repeat_count INTEGER,
  reward_exp INTEGER NOT NULL DEFAULT 0,
  reward_money INTEGER NOT NULL DEFAULT 0,
  reward_benefit TEXT,
  deadline TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT,
  submitted_at TEXT,
  confirmed_at TEXT,
  rewarded_at TEXT,
  submit_note TEXT,
  result_text TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);

CREATE TABLE IF NOT EXISTS task_rewards (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  value INTEGER,
  unit TEXT,
  benefit_name TEXT,
  custom_name TEXT,
  custom_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS task_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  module TEXT NOT NULL,
  target TEXT,
  action TEXT,
  standard TEXT,
  default_time_config_json TEXT,
  default_rewards_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  amount INTEGER NOT NULL,
  unit TEXT NOT NULL,
  task_id TEXT,
  task_title TEXT,
  benefit_id TEXT,
  benefit_name TEXT,
  note TEXT,
  month_key TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_created_at ON wallet_ledger(created_at);

CREATE TABLE IF NOT EXISTS experience_ledger (
  id TEXT PRIMARY KEY,
  amount INTEGER NOT NULL,
  from_level INTEGER NOT NULL,
  to_level INTEGER NOT NULL,
  from_exp INTEGER NOT NULL,
  to_exp INTEGER NOT NULL,
  source TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS monthly_allowances (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  settlement_month TEXT NOT NULL,
  status TEXT NOT NULL,
  role_level INTEGER NOT NULL,
  role_title TEXT NOT NULL,
  base_salary INTEGER NOT NULL,
  completed_task_count INTEGER NOT NULL,
  task_bonus INTEGER NOT NULL,
  wife_adjustment_amount INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  wife_confirmed_at TEXT,
  husband_received_at TEXT,
  husband_reported_at TEXT,
  cancelled_at TEXT,
  rebuked_at TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  credited_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  target TEXT NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  tone TEXT NOT NULL,
  created_at TEXT NOT NULL,
  viewed_at TEXT,
  skipped_at TEXT,
  payload_json TEXT
);

CREATE TABLE IF NOT EXISTS decrees (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  tone TEXT NOT NULL,
  target TEXT NOT NULL,
  created_at TEXT NOT NULL,
  read_at TEXT,
  acknowledged_at TEXT,
  source_log_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_id TEXT,
  task_title TEXT,
  benefit_id TEXT,
  benefit_name TEXT,
  amount INTEGER,
  unit TEXT,
  from_level INTEGER,
  to_level INTEGER,
  from_status TEXT,
  to_status TEXT,
  anomaly_key TEXT,
  anomaly_category TEXT,
  anomaly_severity INTEGER,
  resolved_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  sender TEXT NOT NULL CHECK (sender IN ('husband', 'wife')),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  read_by_json TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  used_by_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO app_state (id, state_json, revision) VALUES ('main', '{}', 1);
INSERT OR IGNORE INTO system_progress (id) VALUES ('main');
