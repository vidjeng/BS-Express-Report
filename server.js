import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import {
  initDatabase,
  getDbStatus,
  getAllReports,
  saveReport,
  deleteReport,
  deleteIssue,
  getDeletedRecords,
  addDeletedTombstone,
  getAllUsers,
  saveUser,
  deleteUser,
  getBranchDraft,
  saveBranchDraft,
  getFixAssetStats,
  getFixAssetBranches,
  createFixAssetBranch,
  updateFixAssetBranch,
  deleteFixAssetBranch,
  getFixAssetDepartments,
  createFixAssetDepartment,
  updateFixAssetDepartment,
  deleteFixAssetDepartment,
  getFixAssetCategories,
  createFixAssetCategory,
  updateFixAssetCategory,
  deleteFixAssetCategory,
  getFixAssetTypes,
  createFixAssetType,
  updateFixAssetType,
  deleteFixAssetType,
  getFixAssetSuppliers,
  createFixAssetSupplier,
  updateFixAssetSupplier,
  deleteFixAssetSupplier,
  getFixAssetWarehouses,
  createFixAssetWarehouse,
  updateFixAssetWarehouse,
  deleteFixAssetWarehouse,
  getFixAssetTypeOfWorks,
  createFixAssetTypeOfWork,
  updateFixAssetTypeOfWork,
  deleteFixAssetTypeOfWork,
  getFixAssetDevices,
  createFixAssetDevice,
  updateFixAssetDevice,
  deleteFixAssetDevice,
  getFixAssetUsers,
  createFixAssetUser,
  updateFixAssetUser,
  deleteFixAssetUser,
  getFixAssetItemMasters,
  createFixAssetItemMaster,
  updateFixAssetItemMaster,
  deleteFixAssetItemMaster,
  getFixAssetEmployees,
  createFixAssetEmployee,
  updateFixAssetEmployee,
  deleteFixAssetEmployee,
  getEmployeeAssignedAssets,
  getFixAssetItems,
  deleteFixAssetItem,
  getFixAssetAssignments,
  getFixAssetAssignmentDetails,
  assignFixAssetItem,
  returnFixAssetItem,
  getFixAssetGrn,
  getFixAssetGrnDetails
} from './db/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Allow up to 50MB for reports containing watermarked photo data
      if (body.length > 50 * 1024 * 1024) {
        reject(new Error('Payload Too Large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format: ' + err.message));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // ===========================================================================
  // REST API ENDPOINTS FOR MYSQL PERSISTENCE
  // ===========================================================================
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Database Health & Status
      if ((pathname === '/api/db/status' || pathname === '/api/health') && req.method === 'GET') {
        const status = getDbStatus();
        return sendJson(res, 200, { success: true, ...status });
      }

      // 2. Reports API
      if (pathname === '/api/reports') {
        if (req.method === 'GET') {
          const reports = await getAllReports();
          return sendJson(res, 200, { success: true, count: reports.length, reports });
        }

        if (req.method === 'POST') {
          const reportData = await parseJsonBody(req);
          if (!reportData || !reportData.branch || !reportData.reporterName) {
            return sendJson(res, 400, { success: false, error: 'Missing required report fields (branch, reporterName)' });
          }
          const result = await saveReport(reportData);
          return sendJson(res, 200, { success: true, report: reportData, result });
        }
      }

      if (pathname.startsWith('/api/reports/')) {
        const reportId = decodeURIComponent(pathname.replace('/api/reports/', ''));
        if (req.method === 'DELETE') {
          const deleted = await deleteReport(reportId);
          return sendJson(res, 200, { success: true, deleted, id: reportId });
        }
      }

      // 3. Issues Delete API
      if (pathname.startsWith('/api/issues/')) {
        const issueId = decodeURIComponent(pathname.replace('/api/issues/', ''));
        if (req.method === 'DELETE') {
          const reportId = urlObj.searchParams.get('reportId') || '';
          await deleteIssue(reportId, issueId);
          return sendJson(res, 200, { success: true, id: issueId, reportId });
        }
      }

      // 4. Deleted Records / Tombstones API
      if (pathname === '/api/deleted-records') {
        if (req.method === 'GET') {
          const records = await getDeletedRecords();
          return sendJson(res, 200, { success: true, ...records });
        }
        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const recordId = body?.recordId || body?.id || body?.record_id;
          if (body && body.type && recordId) {
            await addDeletedTombstone(body.type, recordId);
          }
          return sendJson(res, 200, { success: true });
        }
      }

      // 5. Users API
      if (pathname === '/api/users') {
        if (req.method === 'GET') {
          const users = await getAllUsers();
          return sendJson(res, 200, { success: true, count: users.length, users });
        }

        if (req.method === 'POST') {
          const userData = await parseJsonBody(req);
          if (!userData || !userData.username || !userData.password) {
            return sendJson(res, 400, { success: false, error: 'Missing username or password' });
          }
          const saved = await saveUser(userData);
          return sendJson(res, 200, { success: true, user: saved });
        }
      }

      if (pathname.startsWith('/api/users/')) {
        const userId = decodeURIComponent(pathname.replace('/api/users/', ''));
        if (req.method === 'DELETE') {
          const deleted = await deleteUser(userId);
          return sendJson(res, 200, { success: true, deleted, id: userId });
        }
      }

      // 4. Branch Drafts API
      if (pathname.startsWith('/api/drafts/')) {
        const branchName = decodeURIComponent(pathname.replace('/api/drafts/', ''));
        if (req.method === 'GET') {
          const draft = await getBranchDraft(branchName);
          return sendJson(res, 200, { success: true, branch: branchName, draft });
        }
        if (req.method === 'POST') {
          const draftData = await parseJsonBody(req);
          await saveBranchDraft(branchName, draftData);
          return sendJson(res, 200, { success: true, branch: branchName });
        }
      }

      // -----------------------------------------------------------------------
      // 7. FIX ASSET SYSTEM API
      // -----------------------------------------------------------------------
      if (pathname === '/api/fixasset/summary' || pathname === '/api/fixasset/stats') {
        const stats = await getFixAssetStats();
        return sendJson(res, 200, { success: true, stats });
      }

      if (pathname === '/api/fixasset/branches') {
        if (req.method === 'GET') {
          const branches = await getFixAssetBranches();
          return sendJson(res, 200, { success: true, count: branches.length, branches });
        }
        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const { name, name_en } = body;
          if (!name) return sendJson(res, 400, { success: false, error: 'Name required' });
          const id = await createFixAssetBranch(name, name_en);
          return sendJson(res, 200, { success: true, message: 'Branch created', id });
        }
        if (req.method === 'PUT') {
          const body = await parseJsonBody(req);
          const { id, name, name_en } = body;
          if (!id || !name) return sendJson(res, 400, { success: false, error: 'ID and Name required' });
          await updateFixAssetBranch(id, name, name_en);
          return sendJson(res, 200, { success: true, message: 'Branch updated' });
        }
        if (req.method === 'DELETE') {
          const id = urlObj.searchParams.get('id');
          if (!id) return sendJson(res, 400, { success: false, error: 'ID required' });
          await deleteFixAssetBranch(id);
          return sendJson(res, 200, { success: true, message: 'Branch deleted' });
        }
      }

      if (pathname === '/api/fixasset/departments') {
        if (req.method === 'GET') {
          const departments = await getFixAssetDepartments();
          return sendJson(res, 200, { success: true, count: departments.length, departments });
        }
        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const { name, name_en } = body;
          if (!name) return sendJson(res, 400, { success: false, error: 'Department name required' });
          const id = await createFixAssetDepartment(name, name_en);
          return sendJson(res, 200, { success: true, message: 'Department created', id });
        }
        if (req.method === 'PUT') {
          const body = await parseJsonBody(req);
          const { id, name, name_en } = body;
          if (!id || !name) return sendJson(res, 400, { success: false, error: 'ID and Name required' });
          await updateFixAssetDepartment(id, name, name_en);
          return sendJson(res, 200, { success: true, message: 'Department updated' });
        }
        if (req.method === 'DELETE') {
          const id = urlObj.searchParams.get('id');
          if (!id) return sendJson(res, 400, { success: false, error: 'ID required' });
          await deleteFixAssetDepartment(id);
          return sendJson(res, 200, { success: true, message: 'Department deleted' });
        }
      }

      if (pathname === '/api/fixasset/categories') {
        if (req.method === 'GET') {
          const data = await getFixAssetCategories();
          return sendJson(res, 200, { success: true, ...data });
        }
        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const { name, name_en } = body;
          if (!name) return sendJson(res, 400, { success: false, error: 'Category name required' });
          const id = await createFixAssetCategory(name, name_en);
          return sendJson(res, 200, { success: true, message: 'Category created', id });
        }
        if (req.method === 'PUT') {
          const body = await parseJsonBody(req);
          const { id, name, name_en } = body;
          await updateFixAssetCategory(id, name, name_en);
          return sendJson(res, 200, { success: true, message: 'Category updated' });
        }
        if (req.method === 'DELETE') {
          const id = urlObj.searchParams.get('id');
          await deleteFixAssetCategory(id);
          return sendJson(res, 200, { success: true, message: 'Category deleted' });
        }
      }

      if (pathname === '/api/fixasset/types') {
        if (req.method === 'GET') {
          const types = await getFixAssetTypes();
          return sendJson(res, 200, { success: true, types });
        }
        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const { name, name_en, category_id } = body;
          const id = await createFixAssetType(name, name_en, category_id);
          return sendJson(res, 200, { success: true, message: 'Item type created', id });
        }
        if (req.method === 'PUT') {
          const body = await parseJsonBody(req);
          const { id, name, name_en, category_id } = body;
          await updateFixAssetType(id, name, name_en, category_id);
          return sendJson(res, 200, { success: true, message: 'Item type updated' });
        }
        if (req.method === 'DELETE') {
          const id = urlObj.searchParams.get('id');
          await deleteFixAssetType(id);
          return sendJson(res, 200, { success: true, message: 'Item type deleted' });
        }
      }

      if (pathname === '/api/fixasset/suppliers') {
        if (req.method === 'GET') {
          const suppliers = await getFixAssetSuppliers();
          return sendJson(res, 200, { success: true, count: suppliers.length, suppliers });
        }
        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const id = await createFixAssetSupplier(body);
          return sendJson(res, 200, { success: true, message: 'Supplier created', id });
        }
        if (req.method === 'PUT') {
          const body = await parseJsonBody(req);
          await updateFixAssetSupplier(body);
          return sendJson(res, 200, { success: true, message: 'Supplier updated' });
        }
        if (req.method === 'DELETE') {
          const id = urlObj.searchParams.get('id');
          await deleteFixAssetSupplier(id);
          return sendJson(res, 200, { success: true, message: 'Supplier deleted' });
        }
      }

      if (pathname === '/api/fixasset/warehouses') {
        if (req.method === 'GET') {
          const warehouses = await getFixAssetWarehouses();
          return sendJson(res, 200, { success: true, count: warehouses.length, warehouses });
        }
        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const id = await createFixAssetWarehouse(body);
          return sendJson(res, 200, { success: true, message: 'Warehouse created', id });
        }
        if (req.method === 'PUT') {
          const body = await parseJsonBody(req);
          await updateFixAssetWarehouse(body);
          return sendJson(res, 200, { success: true, message: 'Warehouse updated' });
        }
        if (req.method === 'DELETE') {
          const id = urlObj.searchParams.get('id');
          await deleteFixAssetWarehouse(id);
          return sendJson(res, 200, { success: true, message: 'Warehouse deleted' });
        }
      }

      if (pathname === '/api/fixasset/type-of-works') {
        if (req.method === 'GET') {
          const typeOfWorks = await getFixAssetTypeOfWorks();
          return sendJson(res, 200, { success: true, count: typeOfWorks.length, type_of_works: typeOfWorks });
        }
        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const id = await createFixAssetTypeOfWork(body);
          return sendJson(res, 200, { success: true, message: 'Type of work created', id });
        }
        if (req.method === 'PUT') {
          const body = await parseJsonBody(req);
          await updateFixAssetTypeOfWork(body);
          return sendJson(res, 200, { success: true, message: 'Type of work updated' });
        }
        if (req.method === 'DELETE') {
          const id = urlObj.searchParams.get('id');
          await deleteFixAssetTypeOfWork(id);
          return sendJson(res, 200, { success: true, message: 'Type of work deleted' });
        }
      }

      if (pathname === '/api/fixasset/devices') {
        if (req.method === 'GET') {
          const devices = await getFixAssetDevices();
          return sendJson(res, 200, { success: true, count: devices.length, devices });
        }
        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const id = await createFixAssetDevice(body);
          return sendJson(res, 200, { success: true, message: 'Device added', id });
        }
        if (req.method === 'PUT') {
          const body = await parseJsonBody(req);
          await updateFixAssetDevice(body);
          return sendJson(res, 200, { success: true, message: 'Device updated' });
        }
        if (req.method === 'DELETE') {
          const id = urlObj.searchParams.get('id');
          await deleteFixAssetDevice(id);
          return sendJson(res, 200, { success: true, message: 'Device deleted' });
        }
      }

      if (pathname === '/api/fixasset/users') {
        if (req.method === 'GET') {
          const users = await getFixAssetUsers();
          return sendJson(res, 200, { success: true, count: users.length, users });
        }
        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const id = await createFixAssetUser(body);
          return sendJson(res, 200, { success: true, message: 'User created', id });
        }
        if (req.method === 'PUT') {
          const body = await parseJsonBody(req);
          await updateFixAssetUser(body);
          return sendJson(res, 200, { success: true, message: 'User updated' });
        }
        if (req.method === 'DELETE') {
          const id = urlObj.searchParams.get('id');
          await deleteFixAssetUser(id);
          return sendJson(res, 200, { success: true, message: 'User deleted' });
        }
      }

      if (pathname === '/api/fixasset/item-masters') {
        if (req.method === 'GET') {
          const masters = await getFixAssetItemMasters();
          return sendJson(res, 200, { success: true, count: masters.length, item_masters: masters });
        }
        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const id = await createFixAssetItemMaster(body);
          return sendJson(res, 200, { success: true, message: 'Item master created', id });
        }
        if (req.method === 'PUT') {
          const body = await parseJsonBody(req);
          await updateFixAssetItemMaster(body);
          return sendJson(res, 200, { success: true, message: 'Item master updated' });
        }
        if (req.method === 'DELETE') {
          const id = urlObj.searchParams.get('id');
          await deleteFixAssetItemMaster(id);
          return sendJson(res, 200, { success: true, message: 'Item master deleted' });
        }
      }

      if (pathname === '/api/fixasset/employees') {
        if (req.method === 'GET') {
          const q = (urlObj.searchParams.get('q') || '').trim();
          const branchId = urlObj.searchParams.get('branch_id');
          const status = urlObj.searchParams.get('status');
          const limit = Math.min(parseInt(urlObj.searchParams.get('limit') || '100', 10), 1000);
          const offset = Math.max(parseInt(urlObj.searchParams.get('offset') || '0', 10), 0);
          const result = await getFixAssetEmployees(q, branchId, status, limit, offset);
          return sendJson(res, 200, { success: true, count: result.employees.length, total: result.total, employees: result.employees });
        }
        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const id = await createFixAssetEmployee(body);
          return sendJson(res, 200, { success: true, message: 'Employee created', id });
        }
        if (req.method === 'PUT') {
          const body = await parseJsonBody(req);
          await updateFixAssetEmployee(body);
          return sendJson(res, 200, { success: true, message: 'Employee updated' });
        }
        if (req.method === 'DELETE') {
          const id = urlObj.searchParams.get('id');
          await deleteFixAssetEmployee(id);
          return sendJson(res, 200, { success: true, message: 'Employee deleted' });
        }
      }

      if (pathname === '/api/fixasset/employees/assets') {
        const name = urlObj.searchParams.get('name') || '';
        const assets = await getEmployeeAssignedAssets(name);
        return sendJson(res, 200, { success: true, count: assets.length, assets });
      }

      if (pathname === '/api/fixasset/items') {
        if (req.method === 'GET') {
          const q = (urlObj.searchParams.get('q') || '').trim();
          const status = (urlObj.searchParams.get('status') || 'all').toLowerCase();
          const categoryId = urlObj.searchParams.get('category_id');
          const limit = Math.min(parseInt(urlObj.searchParams.get('limit') || '50', 10), 200);
          const offset = Math.max(parseInt(urlObj.searchParams.get('offset') || '0', 10), 0);
          const result = await getFixAssetItems(q, status, categoryId, limit, offset);
          return sendJson(res, 200, { success: true, total: result.total, limit, offset, items: result.items });
        }
        if (req.method === 'DELETE') {
          const id = urlObj.searchParams.get('id');
          await deleteFixAssetItem(id);
          return sendJson(res, 200, { success: true, message: 'Item deleted' });
        }
      }

      if (pathname === '/api/fixasset/assignments') {
        if (req.method === 'GET') {
          const id = urlObj.searchParams.get('id');
          if (id) {
            const details = await getFixAssetAssignmentDetails(id);
            if (!details) return sendJson(res, 404, { success: false, error: 'Assignment not found' });
            return sendJson(res, 200, { success: true, ...details });
          }
          const limit = Math.min(parseInt(urlObj.searchParams.get('limit') || '50', 10), 200);
          const assignments = await getFixAssetAssignments(limit);
          return sendJson(res, 200, { success: true, count: assignments.length, assignments });
        }
        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const { employee_name, item_code } = body;
          if (!employee_name || !item_code) {
            return sendJson(res, 400, { success: false, error: 'employee_name and item_code are required' });
          }
          await assignFixAssetItem(employee_name, item_code);
          return sendJson(res, 200, { success: true, message: `Assigned ${item_code} to ${employee_name}` });
        }
      }

      if (pathname === '/api/fixasset/return' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { item_code } = body;
        if (!item_code) {
          return sendJson(res, 400, { success: false, error: 'item_code is required' });
        }
        await returnFixAssetItem(item_code);
        return sendJson(res, 200, { success: true, message: `Returned ${item_code}` });
      }

      if (pathname === '/api/fixasset/grn') {
        if (req.method === 'GET') {
          const id = urlObj.searchParams.get('id');
          if (id) {
            const details = await getFixAssetGrnDetails(id);
            if (!details) return sendJson(res, 404, { success: false, error: 'GRN not found' });
            return sendJson(res, 200, { success: true, ...details });
          }
          const limit = Math.min(parseInt(urlObj.searchParams.get('limit') || '50', 10), 200);
          const grn = await getFixAssetGrn(limit);
          return sendJson(res, 200, { success: true, count: grn.length, grn });
        }
      }

      return sendJson(res, 404, { success: false, error: `Endpoint ${pathname} not found` });
    } catch (apiErr) {
      console.error('API Error on ' + req.method + ' ' + pathname + ':', apiErr);
      return sendJson(res, 500, { success: false, error: apiErr.message });
    }
  }

  // ===========================================================================
  // STATIC FILE SERVING
  // ===========================================================================
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.join(__dirname, relativePath);

  // Security check: ensure path is within __dirname
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n==================================================`);
  console.log(`🚀 BS Express Report Server is running!`);
  console.log(`--------------------------------------------------`);
  console.log(`📍 Localhost:                 http://localhost:${PORT}`);
  
  const localIPs = getLocalIPs();
  if (localIPs.length > 0) {
    localIPs.forEach(ip => {
      console.log(`🌐 Local Network (LAN/Wi-Fi): http://${ip}:${PORT}`);
    });
  }

  // Initialize MySQL Connection & Schema
  console.log(`🔌 Initializing MySQL Database connection...`);
  const dbOk = await initDatabase();
  if (dbOk) {
    console.log(`🗄️  MySQL Database 'bs_express_report' is READY!`);
  } else {
    console.log(`⚠️  Running in LocalStorage fallback mode until MySQL connects.`);
  }
  console.log(`==================================================\n`);
});
