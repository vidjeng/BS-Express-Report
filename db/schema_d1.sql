-- Cloudflare D1 Schema for BS Express Daily Report System

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  branch TEXT NOT NULL,
  date TEXT NOT NULL,
  date_display TEXT,
  reporter_name TEXT NOT NULL,
  position TEXT,
  opening_time TEXT,
  present_count INTEGER DEFAULT 0,
  absent_count TEXT,
  cleanliness_status TEXT,
  opening_photos TEXT,
  work_status TEXT,
  operation_challenges TEXT,
  accomplished_tasks TEXT,
  unresolved_issues TEXT,
  issues TEXT,
  package_security TEXT,
  closing_time TEXT,
  closing_photos TEXT,
  status TEXT DEFAULT 'completed',
  approval_status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_branch ON reports(branch);
CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(date);

CREATE TABLE IF NOT EXISTS deleted_records (
  type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  deleted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (type, record_id)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  branch TEXT NOT NULL,
  phone TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS branch_drafts (
  branch TEXT PRIMARY KEY,
  draft_data TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Seed System Administrators
INSERT OR IGNORE INTO users (id, username, password, full_name, role, branch, phone, created_at)
VALUES 
  ('user_vid', 'vid', '123', 'Vid (System Admin)', 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)', 'ការិយាល័យកណ្ដាល', '010 888 999', CURRENT_TIMESTAMP),
  ('user_admin_root', 'admin', '123', 'System Administrator', 'System Administrator (គ្រប់គ្រងប្រព័ន្ធ)', 'ការិយាល័យកណ្ដាល', '010 888 999', CURRENT_TIMESTAMP),
  ('user_sysadmin', 'sysadmin', '123', 'System Administrator', 'System Administrator (គ្រប់គ្រងប្រព័ន្ធ)', 'ការិយាល័យកណ្ដាល', '010 888 999', CURRENT_TIMESTAMP),
  ('user_rithjengdavid', 'rithjengdavid', '123', 'Rith Jeng David', 'System Administrator (គ្រប់គ្រងប្រព័ន្ធ)', 'ការិយាល័យកណ្ដាល', '010 888 999', CURRENT_TIMESTAMP),
  ('user_1787124671318', 'vif', '123', 'vif', 'គណៈគ្រប់គ្រងជាន់ខ្ពស់ (Top Management)', 'ការិយាល័យកណ្តាល', '123', CURRENT_TIMESTAMP);
