import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'admin123';
const DB_NAME = process.env.DB_NAME || 'bs_express_report';

let pool = null;
let isConnected = false;
let connectionError = null;

export async function initDatabase() {
  try {
    // 1. Connect to MySQL server (without specific DB initially to ensure DB exists)
    const rootConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD
    });

    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await rootConn.end();

    // 2. Initialize connection pool targeting bs_express_report
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4'
    });

    // 3. Create tables if they do not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(100) NOT NULL PRIMARY KEY,
        branch VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        date_display VARCHAR(50) DEFAULT NULL,
        reporter_name VARCHAR(150) NOT NULL,
        position VARCHAR(100) DEFAULT NULL,

        opening_time VARCHAR(50) DEFAULT NULL,
        present_count INT DEFAULT 0,
        absent_count VARCHAR(150) DEFAULT NULL,
        cleanliness_status TEXT DEFAULT NULL,
        opening_photos LONGTEXT DEFAULT NULL,

        work_status TEXT DEFAULT NULL,
        operation_challenges TEXT DEFAULT NULL,

        accomplished_tasks TEXT DEFAULT NULL,
        unresolved_issues TEXT DEFAULT NULL,
        issues LONGTEXT DEFAULT NULL,
        package_security TEXT DEFAULT NULL,
        closing_time VARCHAR(50) DEFAULT NULL,
        closing_photos LONGTEXT DEFAULT NULL,

        status VARCHAR(50) DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_branch (branch),
        INDEX idx_date (date),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure 'issues' column exists if table was previously created without it
    try {
      await pool.query(`ALTER TABLE reports ADD COLUMN issues LONGTEXT DEFAULT NULL;`);
    } catch (colErr) {
      // Column already exists, ignore
    }

    // 4. Create deleted_records table (Permanent Tombstones)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deleted_records (
        type VARCHAR(50) NOT NULL,
        record_id VARCHAR(191) NOT NULL,
        deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (type, record_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
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
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS branch_drafts (
        branch VARCHAR(100) NOT NULL PRIMARY KEY,
        draft_data LONGTEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed root system admins if table is empty
    const [userRows] = await pool.query(`SELECT COUNT(*) as count FROM users;`);
    if (userRows[0].count === 0) {
      await pool.query(`
        INSERT INTO users (id, username, password, full_name, role, branch, phone, created_at)
        VALUES 
          ('user_admin_root', 'admin', '123', 'System Administrator', 'System Administrator (គ្រប់គ្រងប្រព័ន្ធ)', 'ការិយាល័យកណ្ដាល', '010 888 999', NOW()),
          ('user_sysadmin', 'sysadmin', '123', 'System Administrator', 'System Administrator (គ្រប់គ្រងប្រព័ន្ធ)', 'ការិយាល័យកណ្ដាល', '010 888 999', NOW()),
          ('user_rithjengdavid', 'rithjengdavid', '123', 'Rith Jeng David', 'System Administrator (គ្រប់គ្រងប្រព័ន្ធ)', 'ការិយាល័យកណ្ដាល', '010 888 999', NOW())
        ON DUPLICATE KEY UPDATE id=id;
      `);
    }

    isConnected = true;
    connectionError = null;
    console.log(`✅ [MySQL] Connected to database '${DB_NAME}' on ${DB_HOST}:${DB_PORT}`);
    return true;
  } catch (err) {
    isConnected = false;
    connectionError = err.message;
    console.error(`❌ [MySQL] Database connection/init failed:`, err.message);
    return false;
  }
}

export function getDbStatus() {
  return {
    connected: isConnected,
    database: DB_NAME,
    host: DB_HOST,
    port: DB_PORT,
    error: connectionError
  };
}

// =============================================================================
// DELETED RECORDS / TOMBSTONES
// =============================================================================

export async function getDeletedRecords() {
  if (!pool) return { reports: [], issues: [] };
  try {
    const [rows] = await pool.query(`SELECT type, record_id FROM deleted_records;`);
    return {
      reports: rows.filter(r => r.type === 'report').map(r => r.record_id),
      issues: rows.filter(r => r.type === 'issue').map(r => r.record_id)
    };
  } catch (e) {
    return { reports: [], issues: [] };
  }
}

export async function addDeletedTombstone(type, recordId) {
  if (!pool || !recordId) return false;
  try {
    await pool.execute(
      `INSERT IGNORE INTO deleted_records (type, record_id) VALUES (?, ?);`,
      [type, String(recordId).trim()]
    );
    return true;
  } catch (e) {
    return false;
  }
}

// =============================================================================
// REPORTS CRUD
// =============================================================================

export async function getAllReports() {
  if (!pool) return [];
  const { reports: deletedReports, issues: deletedIssues } = await getDeletedRecords();
  const deletedRepSet = new Set(deletedReports.map(id => String(id).trim()));
  const deletedIssSet = new Set(deletedIssues.map(id => String(id).trim()));

  const [rows] = await pool.query(`
    SELECT * FROM reports 
    ORDER BY date DESC, created_at DESC;
  `);

  return rows
    .filter(r => !deletedRepSet.has(String(r.id).trim()))
    .map(r => {
      let issues = safeParseJson(r.issues, []);
      if (Array.isArray(issues)) {
        issues = issues.filter((iss, idx) => {
          const iId = String(iss.id || '');
          const synId = `iss_${r.id}_${idx}`;
          const iText = String(iss.issue || '').trim();
          return !deletedIssSet.has(iId) && !deletedIssSet.has(synId) && !deletedIssSet.has(iText);
        });
      }

      let unresolved = r.unresolved_issues || '';
      if (deletedIssSet.has(`iss_unresolved_${r.id}`) || deletedIssSet.has(unresolved.trim())) {
        unresolved = '';
      }

      return {
        id: r.id,
        branch: r.branch,
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date || ''),
        dateDisplay: r.date_display,
        reporterName: r.reporter_name,
        position: r.position,
        openingTime: r.opening_time,
        presentCount: r.present_count,
        absentCount: r.absent_count,
        cleanlinessStatus: r.cleanliness_status,
        openingPhotos: safeParseJson(r.opening_photos, []),
        workStatus: r.work_status,
        operationChallenges: r.operation_challenges,
        accomplishedTasks: r.accomplished_tasks,
        unresolvedIssues: unresolved,
        issues: issues,
        packageSecurity: r.package_security,
        closingTime: r.closing_time,
        closingPhotos: safeParseJson(r.closing_photos, []),
        status: r.status,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null
      };
    });
}

export async function saveReport(report) {
  if (!pool || !report) return false;

  const id = String(report.id || ('report_' + Date.now())).trim();
  const branch = report.branch || '';
  const date = report.date ? (report.date.split('T')[0]) : new Date().toISOString().split('T')[0];
  const dateDisplay = report.dateDisplay || '';
  const reporterName = report.reporterName || '';
  const position = report.position || '';
  const openingTime = report.openingTime || '';
  const presentCount = parseInt(report.presentCount, 10) || 0;
  const absentCount = String(report.absentCount || '');
  const cleanlinessStatus = report.cleanlinessStatus || '';
  const openingPhotos = JSON.stringify(Array.isArray(report.openingPhotos) ? report.openingPhotos : []);
  const workStatus = report.workStatus || '';
  const operationChallenges = report.operationChallenges || '';
  const accomplishedTasks = report.accomplishedTasks || '';
  const unresolvedIssues = report.unresolvedIssues || '';
  const issues = JSON.stringify(Array.isArray(report.issues) ? report.issues : []);
  const packageSecurity = report.packageSecurity || '';
  const closingTime = report.closingTime || '';
  const closingPhotos = JSON.stringify(Array.isArray(report.closingPhotos) ? report.closingPhotos : []);
  const status = report.status || 'completed';

  const sql = `
    INSERT INTO reports (
      id, branch, date, date_display, reporter_name, position,
      opening_time, present_count, absent_count, cleanliness_status, opening_photos,
      work_status, operation_challenges, accomplished_tasks, unresolved_issues, issues,
      package_security, closing_time, closing_photos, status, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      branch = VALUES(branch),
      date = VALUES(date),
      date_display = VALUES(date_display),
      reporter_name = VALUES(reporter_name),
      position = VALUES(position),
      opening_time = VALUES(opening_time),
      present_count = VALUES(present_count),
      absent_count = VALUES(absent_count),
      cleanliness_status = VALUES(cleanliness_status),
      opening_photos = VALUES(opening_photos),
      work_status = VALUES(work_status),
      operation_challenges = VALUES(operation_challenges),
      accomplished_tasks = VALUES(accomplished_tasks),
      unresolved_issues = VALUES(unresolved_issues),
      issues = VALUES(issues),
      package_security = VALUES(package_security),
      closing_time = VALUES(closing_time),
      closing_photos = VALUES(closing_photos),
      status = VALUES(status),
      updated_at = NOW();
  `;

  await pool.execute(sql, [
    id, branch, date, dateDisplay, reporterName, position,
    openingTime, presentCount, absentCount, cleanlinessStatus, openingPhotos,
    workStatus, operationChallenges, accomplishedTasks, unresolvedIssues, issues,
    packageSecurity, closingTime, closingPhotos, status
  ]);

  return { id, success: true };
}

export async function deleteReport(id) {
  if (!pool || !id) return false;
  const strId = String(id).trim();
  // 1. Record permanent tombstone in MySQL
  await addDeletedTombstone('report', strId);
  await addDeletedTombstone('issue', `iss_unresolved_${strId}`);

  // 2. Delete from reports table
  const [result] = await pool.execute(`DELETE FROM reports WHERE id = ?;`, [strId]);
  return true;
}

export async function deleteIssue(reportId, issueId) {
  if (!pool) return false;
  const targetIssueId = String(issueId || '').trim();
  const targetReportId = String(reportId || '').trim();

  // 1. Record permanent tombstone for issue
  if (targetIssueId) {
    await addDeletedTombstone('issue', targetIssueId);
  }
  if (targetReportId && targetIssueId.startsWith('iss_unresolved_')) {
    await addDeletedTombstone('issue', `iss_unresolved_${targetReportId}`);
  }

  // 2. Update report in MySQL if targetReportId is given
  if (targetReportId) {
    const [rows] = await pool.execute(`SELECT * FROM reports WHERE id = ?;`, [targetReportId]);
    if (rows.length > 0) {
      const rep = rows[0];
      let issues = safeParseJson(rep.issues, []);
      const beforeLen = issues.length;
      issues = issues.filter((iss, idx) => {
        const iId = String(iss.id || '');
        const synId = `iss_${targetReportId}_${idx}`;
        const iText = String(iss.issue || '').trim();
        return iId !== targetIssueId && synId !== targetIssueId && iText !== targetIssueId;
      });

      let unres = rep.unresolved_issues || '';
      if (targetIssueId === `iss_unresolved_${targetReportId}` || unres.trim() === targetIssueId) {
        unres = '';
      } else if (issues.length !== beforeLen) {
        const remainingIncomplete = issues.filter(i => i && i.status === 'incomplete' && i.issue);
        unres = remainingIncomplete.length === 0 ? '' : remainingIncomplete.map(i => i.note ? `${i.issue} (Note: ${i.note})` : i.issue).join('\n');
      }

      await pool.execute(
        `UPDATE reports SET issues = ?, unresolved_issues = ?, updated_at = NOW() WHERE id = ?;`,
        [JSON.stringify(issues), unres, targetReportId]
      );
    }
  }

  return true;
}

// =============================================================================
// USERS CRUD
// =============================================================================

export async function getAllUsers() {
  if (!pool) return [];
  const [rows] = await pool.query(`SELECT id, username, password, full_name, role, branch, phone, created_at FROM users;`);
  return rows.map(u => ({
    id: u.id,
    username: u.username,
    password: u.password,
    fullName: u.full_name,
    role: u.role,
    branch: u.branch,
    phone: u.phone,
    createdAt: u.created_at
  }));
}

export async function saveUser(user) {
  if (!pool || !user) return false;
  const id = user.id || ('user_' + Date.now());
  const username = (user.username || '').trim().toLowerCase();
  const password = user.password || '';
  const fullName = user.fullName || user.username || '';
  const role = user.role || 'Staff';
  const branch = user.branch || 'Head Office';
  const phone = user.phone || '';

  const sql = `
    INSERT INTO users (id, username, password, full_name, role, branch, phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      password = VALUES(password),
      full_name = VALUES(full_name),
      role = VALUES(role),
      branch = VALUES(branch),
      phone = VALUES(phone);
  `;
  await pool.execute(sql, [id, username, password, fullName, role, branch, phone]);
  return { id, username, fullName, role, branch, phone };
}

export async function deleteUser(id) {
  if (!pool || !id) return false;
  const [result] = await pool.execute(`DELETE FROM users WHERE id = ?;`, [id]);
  return result.affectedRows > 0;
}

// =============================================================================
// BRANCH DRAFTS CRUD
// =============================================================================

export async function getBranchDraft(branch) {
  if (!pool || !branch) return null;
  const [rows] = await pool.execute(`SELECT draft_data FROM branch_drafts WHERE branch = ?;`, [branch]);
  if (rows.length === 0) return null;
  return safeParseJson(rows[0].draft_data, null);
}

export async function saveBranchDraft(branch, draftData) {
  if (!pool || !branch) return false;
  const jsonStr = JSON.stringify(draftData || {});
  const sql = `
    INSERT INTO branch_drafts (branch, draft_data, updated_at)
    VALUES (?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      draft_data = VALUES(draft_data),
      updated_at = NOW();
  `;
  await pool.execute(sql, [branch, jsonStr]);
  return true;
}

// =============================================================================
// FIXED ASSET SYSTEM INTEGRATION (LOCAL MYSQL)
// =============================================================================

export async function getFixAssetStats() {
  if (!pool) return null;
  const [rows] = await pool.query(`
    SELECT 
      (SELECT count(*) FROM item_fixed_asset_codes) as total_items,
      (SELECT count(*) FROM item_fixed_asset_codes WHERE is_assigned = 1) as assigned_items,
      (SELECT count(*) FROM item_fixed_asset_codes WHERE is_assigned = 0) as unassigned_items,
      (SELECT count(*) FROM employees) as total_employees,
      (SELECT count(*) FROM branches) as total_branches,
      (SELECT count(*) FROM item_masters) as total_masters,
      (SELECT count(*) FROM asset_assignments) as total_assignments;
  `);
  return rows[0] || null;
}

export async function getFixAssetBranches() {
  if (!pool) return [];
  const [rows] = await pool.query(`SELECT id, name, name_en, label FROM branches ORDER BY id ASC;`);
  return rows;
}

export async function getFixAssetEmployees(limit = 100) {
  if (!pool) return [];
  const [rows] = await pool.query(`SELECT id, employee_code, employee_name, job_title, department_id, branch_id, status FROM employees ORDER BY id ASC LIMIT ?;`, [limit]);
  return rows;
}

export async function getFixAssetItems(q = '', limit = 50, offset = 0) {
  if (!pool) return { total: 0, items: [] };
  if (q) {
    const filter = `%${q}%`;
    const [countRows] = await pool.query(`
      SELECT count(*) as total FROM item_fixed_asset_codes c
      LEFT JOIN item_masters m ON c.item_master_id = m.id
      WHERE c.code LIKE ? OR c.a_code LIKE ? OR c.assigned_to LIKE ? OR m.name LIKE ?;
    `, [filter, filter, filter, filter]);

    const [rows] = await pool.query(`
      SELECT c.id, c.code, c.a_code, c.is_assigned, c.assigned_to, m.name as item_name, m.model, m.brand
      FROM item_fixed_asset_codes c
      LEFT JOIN item_masters m ON c.item_master_id = m.id
      WHERE c.code LIKE ? OR c.a_code LIKE ? OR c.assigned_to LIKE ? OR m.name LIKE ?
      ORDER BY c.id DESC LIMIT ? OFFSET ?;
    `, [filter, filter, filter, filter, limit, offset]);

    return { total: countRows[0]?.total || 0, items: rows };
  } else {
    const [countRows] = await pool.query(`SELECT count(*) as total FROM item_fixed_asset_codes;`);
    const [rows] = await pool.query(`
      SELECT c.id, c.code, c.a_code, c.is_assigned, c.assigned_to, m.name as item_name, m.model, m.brand
      FROM item_fixed_asset_codes c
      LEFT JOIN item_masters m ON c.item_master_id = m.id
      ORDER BY c.id DESC LIMIT ? OFFSET ?;
    `, [limit, offset]);

    return { total: countRows[0]?.total || 0, items: rows };
  }
}

function safeParseJson(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}

