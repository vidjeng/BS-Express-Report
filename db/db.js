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
      (SELECT count(*) FROM asset_assignments) as total_assignments,
      (SELECT count(*) FROM grns) as total_grn;
  `);
  return rows[0] || null;
}

export async function getFixAssetBranches() {
  if (!pool) return [];
  const [rows] = await pool.query(`
    SELECT b.id, b.name, b.name_en, b.label,
      (SELECT count(*) FROM employees e WHERE e.branch_id = b.id) as employee_count
    FROM branches b
    ORDER BY b.id ASC;
  `);
  return rows;
}

export async function createFixAssetBranch(name, name_en) {
  if (!pool) return false;
  const [res] = await pool.query(`INSERT INTO branches (name, name_en, created_at, updated_at) VALUES (?, ?, NOW(), NOW())`, [name, name_en || null]);
  return res.insertId;
}

export async function updateFixAssetBranch(id, name, name_en) {
  if (!pool) return false;
  await pool.query(`UPDATE branches SET name = ?, name_en = ?, updated_at = NOW() WHERE id = ?`, [name, name_en || null, id]);
  return true;
}

export async function deleteFixAssetBranch(id) {
  if (!pool) return false;
  await pool.query(`DELETE FROM branches WHERE id = ?`, [id]);
  return true;
}

export async function getFixAssetDepartments() {
  if (!pool) return [];
  const [rows] = await pool.query(`SELECT id, name, name_en, label FROM departments ORDER BY id ASC;`);
  return rows;
}

export async function createFixAssetDepartment(name, name_en) {
  if (!pool) return false;
  const [res] = await pool.query(`INSERT INTO departments (name, name_en, created_at, updated_at) VALUES (?, ?, NOW(), NOW())`, [name, name_en || null]);
  return res.insertId;
}

export async function updateFixAssetDepartment(id, name, name_en) {
  if (!pool) return false;
  await pool.query(`UPDATE departments SET name = ?, name_en = ?, updated_at = NOW() WHERE id = ?`, [name, name_en || null, id]);
  return true;
}

export async function deleteFixAssetDepartment(id) {
  if (!pool) return false;
  await pool.query(`DELETE FROM departments WHERE id = ?`, [id]);
  return true;
}

export async function getFixAssetCategories() {
  if (!pool) return { categories: [], types: [] };
  const [cats] = await pool.query(`SELECT id, name, name_en, label FROM item_categories ORDER BY id ASC;`);
  const [types] = await pool.query(`SELECT id, name, name_en FROM item_types ORDER BY id ASC;`);
  return { categories: cats, types };
}

export async function createFixAssetCategory(name, name_en) {
  if (!pool) return false;
  const [res] = await pool.query(`INSERT INTO item_categories (name, name_en, created_at, updated_at) VALUES (?, ?, NOW(), NOW())`, [name, name_en || null]);
  return res.insertId;
}

export async function updateFixAssetCategory(id, name, name_en) {
  if (!pool) return false;
  await pool.query(`UPDATE item_categories SET name = ?, name_en = ?, updated_at = NOW() WHERE id = ?`, [name, name_en || null, id]);
  return true;
}

export async function deleteFixAssetCategory(id) {
  if (!pool) return false;
  await pool.query(`DELETE FROM item_categories WHERE id = ?`, [id]);
  return true;
}

export async function getFixAssetTypes() {
  if (!pool) return [];
  const [types] = await pool.query(`SELECT id, name, name_en FROM item_types ORDER BY id ASC;`);
  return types;
}

export async function createFixAssetType(name, name_en) {
  if (!pool) return false;
  const [res] = await pool.query(`INSERT INTO item_types (name, name_en, created_at, updated_at) VALUES (?, ?, NOW(), NOW())`, [name, name_en || null]);
  return res.insertId;
}

export async function updateFixAssetType(id, name, name_en) {
  if (!pool) return false;
  await pool.query(`UPDATE item_types SET name = ?, name_en = ?, updated_at = NOW() WHERE id = ?`, [name, name_en || null, id]);
  return true;
}

export async function deleteFixAssetType(id) {
  if (!pool) return false;
  await pool.query(`DELETE FROM item_types WHERE id = ?`, [id]);
  return true;
}

export async function getFixAssetSuppliers() {
  if (!pool) return [];
  const [rows] = await pool.query(`SELECT id, name, phone, email, address, created_at FROM suppliers ORDER BY id ASC;`);
  return rows;
}

export async function createFixAssetSupplier(data) {
  if (!pool) return false;
  const [res] = await pool.query(`
    INSERT INTO suppliers (name, phone, email, address, created_at, updated_at)
    VALUES (?, ?, ?, ?, NOW(), NOW())
  `, [data.name, data.phone || null, data.email || null, data.address || null]);
  return res.insertId;
}

export async function updateFixAssetSupplier(data) {
  if (!pool) return false;
  await pool.query(`
    UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ?, updated_at = NOW()
    WHERE id = ?
  `, [data.name, data.phone || null, data.email || null, data.address || null, data.id]);
  return true;
}

export async function deleteFixAssetSupplier(id) {
  if (!pool) return false;
  await pool.query(`DELETE FROM suppliers WHERE id = ?`, [id]);
  return true;
}

export async function getFixAssetWarehouses() {
  if (!pool) return [];
  const [rows] = await pool.query(`SELECT id, name, branch_id, created_at FROM warehouses ORDER BY id ASC;`);
  return rows;
}

export async function createFixAssetWarehouse(data) {
  if (!pool) return false;
  const [res] = await pool.query(`
    INSERT INTO warehouses (name, branch_id, created_at, updated_at)
    VALUES (?, ?, NOW(), NOW())
  `, [data.name, data.branch_id || null]);
  return res.insertId;
}

export async function updateFixAssetWarehouse(data) {
  if (!pool) return false;
  await pool.query(`
    UPDATE warehouses SET name = ?, branch_id = ?, updated_at = NOW()
    WHERE id = ?
  `, [data.name, data.branch_id || null, data.id]);
  return true;
}

export async function deleteFixAssetWarehouse(id) {
  if (!pool) return false;
  await pool.query(`DELETE FROM warehouses WHERE id = ?`, [id]);
  return true;
}

export async function getFixAssetTypeOfWorks() {
  if (!pool) return [];
  const [rows] = await pool.query(`SELECT id, name, name_en, label, created_at FROM type_of_works ORDER BY id ASC;`);
  return rows;
}

export async function createFixAssetTypeOfWork(data) {
  if (!pool) return false;
  const [res] = await pool.query(`
    INSERT INTO type_of_works (name, name_en, label, created_at, updated_at)
    VALUES (?, ?, ?, NOW(), NOW())
  `, [data.name, data.name_en || null, data.label || null]);
  return res.insertId;
}

export async function updateFixAssetTypeOfWork(data) {
  if (!pool) return false;
  await pool.query(`
    UPDATE type_of_works SET name = ?, name_en = ?, label = ?, updated_at = NOW()
    WHERE id = ?
  `, [data.name, data.name_en || null, data.label || null, data.id]);
  return true;
}

export async function deleteFixAssetTypeOfWork(id) {
  if (!pool) return false;
  await pool.query(`DELETE FROM type_of_works WHERE id = ?`, [id]);
  return true;
}

export async function getFixAssetDevices() {
  if (!pool) return [];
  const [rows] = await pool.query(`
    SELECT id, name, host, port, protocol, username, serial_number, model, firmware_version, is_connected, last_connected_at
    FROM hikvision_devices ORDER BY id ASC;
  `);
  return rows;
}

export async function createFixAssetDevice(data) {
  if (!pool) return false;
  const [res] = await pool.query(`
    INSERT INTO hikvision_devices (name, host, port, protocol, username, password, is_connected, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
  `, [data.name, data.host, data.port || 80, data.protocol || 'http', data.username || 'admin', data.password || '']);
  return res.insertId;
}

export async function updateFixAssetDevice(data) {
  if (!pool) return false;
  await pool.query(`
    UPDATE hikvision_devices
    SET name = ?, host = ?, port = ?, protocol = ?, username = ?, updated_at = NOW()
    WHERE id = ?
  `, [data.name, data.host, data.port || 80, data.protocol || 'http', data.username || 'admin', data.id]);
  return true;
}

export async function deleteFixAssetDevice(id) {
  if (!pool) return false;
  await pool.query(`DELETE FROM hikvision_devices WHERE id = ?`, [id]);
  return true;
}

export async function getFixAssetUsers() {
  if (!pool) return [];
  const [rows] = await pool.query(`SELECT id, name, name_en, user_login, email, phone_number, status, created_at FROM fixasset_users ORDER BY id ASC;`);
  return rows;
}

export async function createFixAssetUser(data) {
  if (!pool) return false;
  const [res] = await pool.query(`
    INSERT INTO fixasset_users (name, user_login, email, password, status, created_at, updated_at)
    VALUES (?, ?, ?, '123', ?, NOW(), NOW())
  `, [data.name, data.user_login || data.username, data.email || null, data.status || 'Active']);
  return res.insertId;
}

export async function updateFixAssetUser(data) {
  if (!pool) return false;
  await pool.query(`
    UPDATE fixasset_users
    SET name = ?, email = ?, status = ?, updated_at = NOW()
    WHERE id = ?
  `, [data.name, data.email || null, data.status || 'Active', data.id]);
  return true;
}

export async function deleteFixAssetUser(id) {
  if (!pool) return false;
  await pool.query(`DELETE FROM fixasset_users WHERE id = ?`, [id]);
  return true;
}

export async function getFixAssetItemMasters() {
  if (!pool) return [];
  const [rows] = await pool.query(`
    SELECT m.id, m.code, m.name, m.model, m.brand, m.unit_price, m.unit_of_measure, m.quantity,
           cat.name as category_name, t.name as item_type_name,
           (SELECT count(*) FROM item_fixed_asset_codes c WHERE c.item_master_id = m.id AND c.is_assigned = 1) as assigned_count
    FROM item_masters m
    LEFT JOIN item_categories cat ON m.category_id = cat.id
    LEFT JOIN item_types t ON m.item_type_id = t.id
    ORDER BY m.id ASC;
  `);
  return rows;
}

export async function createFixAssetItemMaster(data) {
  if (!pool) return false;
  const code = data.code || ('ITM-' + Date.now().toString().slice(-6));
  const [res] = await pool.query(`
    INSERT INTO item_masters (code, name, model, brand, category_id, item_type_id, unit_price, quantity, unit_of_measure, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `, [code, data.name, data.model || null, data.brand || null, data.category_id || null, data.item_type_id || null, data.unit_price || 0, data.quantity || 1, data.unit_of_measure || 'Unit']);
  return res.insertId;
}

export async function updateFixAssetItemMaster(data) {
  if (!pool) return false;
  await pool.query(`
    UPDATE item_masters
    SET code = ?, name = ?, model = ?, brand = ?, category_id = ?, item_type_id = ?, unit_price = ?, quantity = ?, unit_of_measure = ?, updated_at = NOW()
    WHERE id = ?
  `, [data.code, data.name, data.model || null, data.brand || null, data.category_id || null, data.item_type_id || null, data.unit_price || 0, data.quantity || 1, data.unit_of_measure || 'Unit', data.id]);
  return true;
}

export async function deleteFixAssetItemMaster(id) {
  if (!pool) return false;
  await pool.query(`DELETE FROM item_masters WHERE id = ?`, [id]);
  return true;
}

export async function getFixAssetEmployees(q = '', branchId = null, status = 'all', limit = 100, offset = 0) {
  if (!pool) return { total: 0, employees: [] };
  let query = `
    SELECT e.id, e.employee_code, e.employee_name, e.job_title, e.phone_number, e.email, e.status, e.date_of_hired,
           b.name as branch_name, d.name as department_name, e.branch_id, e.department_id,
           (SELECT count(*) FROM item_fixed_asset_codes c WHERE c.assigned_to = e.employee_name) as assigned_items_count
    FROM employees e
    LEFT JOIN branches b ON e.branch_id = b.id
    LEFT JOIN departments d ON e.department_id = d.id
  `;
  const params = [];
  const whereClauses = [];

  if (q) {
    whereClauses.push("(e.employee_code LIKE ? OR e.employee_name LIKE ? OR e.job_title LIKE ?)");
    const filter = `%${q}%`;
    params.push(filter, filter, filter);
  }
  if (branchId) {
    whereClauses.push("e.branch_id = ?");
    params.push(parseInt(branchId, 10));
  }
  if (status && status !== 'all') {
    whereClauses.push("e.status = ?");
    params.push(status);
  }

  if (whereClauses.length > 0) {
    query += " WHERE " + whereClauses.join(" AND ");
  }

  const [countRows] = await pool.query(`
    SELECT count(*) as total FROM employees e ${whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : ""}
  `, params);

  query += " ORDER BY e.id ASC LIMIT ? OFFSET ?;";
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const [rows] = await pool.query(query, params);
  return { total: countRows[0]?.total || 0, employees: rows };
}

export async function createFixAssetEmployee(data) {
  if (!pool) return false;
  const code = data.employee_code || ('EMP-' + Date.now().toString().slice(-4));
  const [res] = await pool.query(`
    INSERT INTO employees (employee_code, employee_name, branch_id, department_id, job_title, phone_number, email, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `, [code, data.employee_name, data.branch_id || null, data.department_id || null, data.job_title || 'Staff', data.phone_number || null, data.email || null, data.status || 'Hired']);
  return res.insertId;
}

export async function updateFixAssetEmployee(data) {
  if (!pool) return false;
  await pool.query(`
    UPDATE employees
    SET employee_code = ?, employee_name = ?, branch_id = ?, department_id = ?, job_title = ?, phone_number = ?, email = ?, status = ?, updated_at = NOW()
    WHERE id = ?
  `, [data.employee_code, data.employee_name, data.branch_id || null, data.department_id || null, data.job_title || 'Staff', data.phone_number || null, data.email || null, data.status || 'Hired', data.id]);
  return true;
}

export async function deleteFixAssetEmployee(id) {
  if (!pool) return false;
  await pool.query(`DELETE FROM employees WHERE id = ?`, [id]);
  return true;
}

export async function getEmployeeAssignedAssets(empName) {
  if (!pool) return [];
  const [rows] = await pool.query(`
    SELECT c.id, c.code, c.a_code, c.item_master_id, m.name as item_name, m.brand, m.model, m.unit_price, cat.name as category_name
    FROM item_fixed_asset_codes c
    LEFT JOIN item_masters m ON c.item_master_id = m.id
    LEFT JOIN item_categories cat ON m.category_id = cat.id
    WHERE c.assigned_to = ? AND c.is_assigned = 1
  `, [empName]);
  return rows;
}

export async function getFixAssetItems(q = '', status = 'all', categoryId = null, limit = 50, offset = 0) {
  if (!pool) return { total: 0, items: [] };

  const whereClauses = [];
  const params = [];

  if (q) {
    whereClauses.push("(c.code LIKE ? OR c.a_code LIKE ? OR c.assigned_to LIKE ? OR m.name LIKE ? OR m.model LIKE ? OR m.brand LIKE ?)");
    const filter = `%${q}%`;
    params.push(filter, filter, filter, filter, filter, filter);
  }

  if (status === 'assigned') {
    whereClauses.push("c.is_assigned = 1");
  } else if (status === 'unassigned') {
    whereClauses.push("c.is_assigned = 0");
  }

  if (categoryId) {
    whereClauses.push("m.category_id = ?");
    params.push(parseInt(categoryId, 10));
  }

  const whereSql = whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : "";

  const [countRows] = await pool.query(`
    SELECT count(*) as total
    FROM item_fixed_asset_codes c
    LEFT JOIN item_masters m ON c.item_master_id = m.id
    ${whereSql};
  `, params);

  const [rows] = await pool.query(`
    SELECT c.id, c.code, c.a_code, c.is_assigned, c.assigned_to, c.created_at,
           m.name as item_name, m.model, m.brand, m.unit_price, m.unit_of_measure,
           cat.name as category_name
    FROM item_fixed_asset_codes c
    LEFT JOIN item_masters m ON c.item_master_id = m.id
    LEFT JOIN item_categories cat ON m.category_id = cat.id
    ${whereSql}
    ORDER BY c.id DESC LIMIT ? OFFSET ?;
  `, [...params, parseInt(limit, 10), parseInt(offset, 10)]);

  return { total: countRows[0]?.total || 0, items: rows };
}

export async function deleteFixAssetItem(id) {
  if (!pool) return false;
  await pool.query(`DELETE FROM item_fixed_asset_codes WHERE id = ?`, [id]);
  return true;
}

export async function getFixAssetAssignments(limit = 50) {
  if (!pool) return [];
  const [rows] = await pool.query(`
    SELECT a.id, a.assignment_no, a.assign_date, a.return_date, a.status, a.notes,
           e.employee_code, e.employee_name, b.name as branch_name
    FROM asset_assignments a
    LEFT JOIN employees e ON a.employee_id = e.id
    LEFT JOIN branches b ON e.branch_id = b.id
    ORDER BY a.id DESC LIMIT ?;
  `, [parseInt(limit, 10)]);
  return rows;
}

export async function getFixAssetAssignmentDetails(id) {
  if (!pool) return null;
  const [assignRows] = await pool.query(`
    SELECT a.id, a.assignment_no, a.assign_date, a.return_date, a.status, a.notes,
           e.employee_code, e.employee_name, e.job_title, b.name as branch_name, d.name as department_name
    FROM asset_assignments a
    LEFT JOIN employees e ON a.employee_id = e.id
    LEFT JOIN branches b ON e.branch_id = b.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE a.id = ?
  `, [id]);

  if (!assignRows || assignRows.length === 0) return null;

  const [items] = await pool.query(`
    SELECT i.id, i.item_code, i.product_name, i.asset_code, i.brand, i.condition, i.remark, i.quantity
    FROM asset_assignment_items i
    WHERE i.assignment_id = ?
  `, [id]);

  return { assignment: assignRows[0], items };
}

export async function assignFixAssetItem(employeeName, itemCode) {
  if (!pool) return false;
  await pool.query(`
    UPDATE item_fixed_asset_codes
    SET is_assigned = 1, assigned_to = ?, updated_at = NOW()
    WHERE code = ? OR a_code = ?;
  `, [employeeName, itemCode, itemCode]);
  return true;
}

export async function returnFixAssetItem(itemCode) {
  if (!pool) return false;
  await pool.query(`
    UPDATE item_fixed_asset_codes
    SET is_assigned = 0, assigned_to = NULL, updated_at = NOW()
    WHERE code = ? OR a_code = ?;
  `, [itemCode, itemCode]);
  return true;
}

export async function getFixAssetGrn(limit = 50) {
  if (!pool) return [];
  const [rows] = await pool.query(`
    SELECT g.id, g.grn_number, g.reference_no, g.po_number, g.grn_type, g.status, g.transaction_date, g.created_at,
           s.name as supplier_name, w.name as warehouse_name
    FROM grns g
    LEFT JOIN suppliers s ON g.supplier_id = s.id
    LEFT JOIN warehouses w ON g.warehouse_id = w.id
    ORDER BY g.id DESC LIMIT ?;
  `, [parseInt(limit, 10)]);
  return rows;
}

export async function getFixAssetGrnDetails(id) {
  if (!pool) return null;
  const [grnRows] = await pool.query(`
    SELECT g.id, g.grn_number, g.reference_no, g.po_number, g.grn_type, g.status, g.transaction_date, g.note, g.created_at,
           s.name as supplier_name, s.phone as supplier_phone, w.name as warehouse_name
    FROM grns g
    LEFT JOIN suppliers s ON g.supplier_id = s.id
    LEFT JOIN warehouses w ON g.warehouse_id = w.id
    WHERE g.id = ?
  `, [id]);

  if (!grnRows || grnRows.length === 0) return null;

  const [items] = await pool.query(`
    SELECT gi.id, gi.item_code, gi.description, gi.brand, gi.po_quantity, gi.receive_quantity, gi.unit_price, gi.total_amount, gi.uom, gi.remark,
           m.name as item_name
    FROM grn_items gi
    LEFT JOIN item_masters m ON gi.item_master_id = m.id
    WHERE gi.grn_id = ?
  `, [id]);

  return { grn: grnRows[0], items };
}

function safeParseJson(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}

