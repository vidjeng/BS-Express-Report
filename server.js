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
  getFixAssetDepartments,
  getFixAssetCategories,
  getFixAssetEmployees,
  getFixAssetItems,
  getFixAssetAssignments,
  assignFixAssetItem,
  returnFixAssetItem,
  getFixAssetGrn
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
        const branches = await getFixAssetBranches();
        return sendJson(res, 200, { success: true, count: branches.length, branches });
      }

      if (pathname === '/api/fixasset/departments') {
        const departments = await getFixAssetDepartments();
        return sendJson(res, 200, { success: true, count: departments.length, departments });
      }

      if (pathname === '/api/fixasset/categories') {
        const data = await getFixAssetCategories();
        return sendJson(res, 200, { success: true, ...data });
      }

      if (pathname === '/api/fixasset/employees') {
        const q = (urlObj.searchParams.get('q') || '').trim();
        const branchId = urlObj.searchParams.get('branch_id');
        const limit = Math.min(parseInt(urlObj.searchParams.get('limit') || '100', 10), 1000);
        const offset = Math.max(parseInt(urlObj.searchParams.get('offset') || '0', 10), 0);
        const employees = await getFixAssetEmployees(q, branchId, limit, offset);
        return sendJson(res, 200, { success: true, count: employees.length, employees });
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
      }

      if (pathname === '/api/fixasset/assignments') {
        if (req.method === 'GET') {
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
        const limit = Math.min(parseInt(urlObj.searchParams.get('limit') || '50', 10), 200);
        const grn = await getFixAssetGrn(limit);
        return sendJson(res, 200, { success: true, count: grn.length, grn });
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
