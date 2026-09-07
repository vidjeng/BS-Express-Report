-- =============================================================================
-- BS EXPRESS DAILY REPORT SYSTEM - MYSQL DATABASE SCHEMA
-- =============================================================================

CREATE DATABASE IF NOT EXISTS bs_express_report
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bs_express_report;

-- -----------------------------------------------------------------------------
-- 1. Reports Table (Stores all daily submitted branch reports)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(100) NOT NULL PRIMARY KEY,
  branch VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  date_display VARCHAR(50) DEFAULT NULL,
  reporter_name VARCHAR(150) NOT NULL,
  position VARCHAR(100) DEFAULT NULL,

  -- Section 1: Opening Shift
  opening_time VARCHAR(50) DEFAULT NULL,
  present_count INT DEFAULT 0,
  absent_count VARCHAR(150) DEFAULT NULL,
  cleanliness_status TEXT DEFAULT NULL,
  opening_photos LONGTEXT DEFAULT NULL,

  -- Section 2: Daily Operation
  work_status TEXT DEFAULT NULL,
  operation_challenges TEXT DEFAULT NULL,

  -- Section 3: Closing Shift
  accomplished_tasks TEXT DEFAULT NULL,
  unresolved_issues TEXT DEFAULT NULL,
  issues LONGTEXT DEFAULT NULL, -- Structured JSON array of issues [{id, issue, status, note, comments}]
  package_security TEXT DEFAULT NULL,
  closing_time VARCHAR(50) DEFAULT NULL,
  closing_photos LONGTEXT DEFAULT NULL,

  -- Metadata & Timestamps
  status VARCHAR(50) DEFAULT 'completed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_branch (branch),
  INDEX idx_date (date),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Deleted Records Tombstone Table (Permanently prevents resurrection)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deleted_records (
  type VARCHAR(50) NOT NULL, -- 'report' or 'issue'
  record_id VARCHAR(191) NOT NULL,
  deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (type, record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Users Table (System Administrators, Branch Managers, Staff)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) NOT NULL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  role VARCHAR(100) NOT NULL,
  branch VARCHAR(100) NOT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_username (username),
  INDEX idx_role (role),
  INDEX idx_branch (branch)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Branch Drafts Table (Auto-saved in-progress drafts per branch)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS branch_drafts (
  branch VARCHAR(100) NOT NULL PRIMARY KEY,
  draft_data LONGTEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Seed Initial Default Users if not exist
-- -----------------------------------------------------------------------------
INSERT INTO users (id, username, password, full_name, role, branch, phone, created_at)
VALUES 
  ('user_admin_root', 'admin', '123', 'System Administrator', 'System Administrator (គ្រប់គ្រងប្រព័ន្ធ)', 'ការិយាល័យកណ្ដាល', '010 888 999', NOW()),
  ('user_sysadmin', 'sysadmin', '123', 'System Administrator', 'System Administrator (គ្រប់គ្រងប្រព័ន្ធ)', 'ការិយាល័យកណ្ដាល', '010 888 999', NOW()),
  ('user_rithjengdavid', 'rithjengdavid', '123', 'Rith Jeng David', 'System Administrator (គ្រប់គ្រងប្រព័ន្ធ)', 'ការិយាល័យកណ្ដាល', '010 888 999', NOW())
ON DUPLICATE KEY UPDATE id=id;
