import fallbackData from './fallback_data.json';
/**
 * Cloudflare Pages Functions - Fullstack API Router with Cloudflare D1
 * Provides 100% serverless persistence for BS Express Daily Report System
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  const db = env.DB;
  if (!db) {
    return json({ 
      success: false, 
      error: 'Cloudflare D1 binding [DB] is not configured in this environment.' 
    }, 500);
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Database Health Check
    // -------------------------------------------------------------------------
    if (pathname === '/api/db/status' || pathname === '/api/health') {
      try {
        await db.prepare("SELECT 1").first();
        return json({
          success: true,
          connected: true,
          database: 'bs-express-db (Cloudflare D1)',
          host: 'Cloudflare APAC Edge Network',
          port: 443,
          provider: 'cloudflare-d1'
        });
      } catch (dbErr) {
        return json({ success: false, connected: false, error: dbErr.message }, 500);
      }
    }

    // -------------------------------------------------------------------------
    // 2. Reports API
    // -------------------------------------------------------------------------
    if (pathname === '/api/reports') {
      if (method === 'GET') {
        try {
          const tombstones = await db.prepare("SELECT record_id FROM deleted_records WHERE type = 'report'").all();
          const deletedReportIds = new Set((tombstones.results || []).map(t => String(t.record_id).trim()));

          const issueTombstones = await db.prepare("SELECT record_id FROM deleted_records WHERE type = 'issue'").all();
          const deletedIssueIds = new Set((issueTombstones.results || []).map(t => String(t.record_id).trim()));

          const { results: rows } = await db.prepare("SELECT * FROM reports ORDER BY date DESC, created_at DESC").all();
          
          const reports = (rows || [])
            .filter(r => !deletedReportIds.has(String(r.id).trim()))
            .map(r => {
              let issues = [];
              try { issues = JSON.parse(r.issues || '[]'); } catch(e){}
              if (Array.isArray(issues)) {
                issues = issues.filter((iss, idx) => {
                  const iId = String(iss.id || '');
                  const synId = `iss_${r.id}_${idx}`;
                  const iText = String(iss.issue || '').trim();
                  return !deletedIssueIds.has(iId) && !deletedIssueIds.has(synId) && !deletedIssueIds.has(iText);
                });
              }

              let unres = r.unresolved_issues || '';
              if (deletedIssueIds.has(`iss_unresolved_${r.id}`) || deletedIssueIds.has(unres.trim())) {
                unres = '';
              }

              let openPhotos = [];
              try { openPhotos = JSON.parse(r.opening_photos || '[]'); } catch(e){}

              let closePhotos = [];
              try { closePhotos = JSON.parse(r.closing_photos || '[]'); } catch(e){}

              return {
                id: r.id,
                branch: r.branch,
                date: r.date,
                dateDisplay: r.date_display,
                reporterName: r.reporter_name,
                position: r.position,
                openingTime: r.opening_time,
                presentCount: r.present_count,
                absentCount: r.absent_count,
                cleanlinessStatus: r.cleanliness_status,
                openingPhotos: openPhotos,
                workStatus: r.work_status,
                operationChallenges: r.operation_challenges,
                accomplishedTasks: r.accomplished_tasks,
                unresolvedIssues: unres,
                issues,
                packageSecurity: r.package_security,
                closingTime: r.closing_time,
                closingPhotos: closePhotos,
                status: r.status || 'completed',
                approvalStatus: r.approval_status || 'pending',
                createdAt: r.created_at,
                updatedAt: r.updated_at
              };
            });

          return json({ success: true, count: reports.length, reports });
        } catch (d1Err) {
          const reports = (fallbackData.reports || []).map(r => {
            let issues = [];
            try { issues = JSON.parse(r.issues || '[]'); } catch(e){}
            let openPhotos = [];
            try { openPhotos = JSON.parse(r.opening_photos || '[]'); } catch(e){}
            let closePhotos = [];
            try { closePhotos = JSON.parse(r.closing_photos || '[]'); } catch(e){}
            return {
              ...r,
              issues,
              openingPhotos: openPhotos,
              closingPhotos: closePhotos,
              dateDisplay: r.date_display || r.date,
              reporterName: r.reporter_name || 'Reporter',
              openingTime: r.opening_time,
              presentCount: r.present_count,
              absentCount: r.absent_count,
              cleanlinessStatus: r.cleanliness_status,
              workStatus: r.work_status,
              operationChallenges: r.operation_challenges,
              accomplishedTasks: r.accomplished_tasks,
              unresolvedIssues: r.unresolved_issues || '',
              packageSecurity: r.package_security,
              closingTime: r.closing_time,
              status: r.status || 'completed',
              approvalStatus: r.approval_status || 'pending'
            };
          });
          return json({ success: true, count: reports.length, reports, fallback: true });
        }
      }

      if (method === 'POST') {
        const body = await request.json();
        if (!body || !body.branch || !body.reporterName) {
          return json({ success: false, error: 'Missing required report fields (branch, reporterName)' }, 400);
        }

        const id = String(body.id || ('report_' + Date.now())).trim();
        const branch = body.branch || '';
        const date = body.date || new Date().toISOString().split('T')[0];
        const dateDisplay = body.dateDisplay || '';
        const reporterName = body.reporterName || '';
        const position = body.position || '';
        const openingTime = body.openingTime || '';
        const presentCount = parseInt(body.presentCount, 10) || 0;
        const absentCount = String(body.absentCount || '');
        const cleanlinessStatus = body.cleanlinessStatus || '';
        const openingPhotos = JSON.stringify(Array.isArray(body.openingPhotos) ? body.openingPhotos : []);
        const workStatus = body.workStatus || '';
        const operationChallenges = body.operationChallenges || '';
        const accomplishedTasks = body.accomplishedTasks || '';
        const unresolvedIssues = body.unresolvedIssues || '';
        const issues = JSON.stringify(Array.isArray(body.issues) ? body.issues : []);
        const packageSecurity = body.packageSecurity || '';
        const closingTime = body.closingTime || '';
        const closingPhotos = JSON.stringify(Array.isArray(body.closingPhotos) ? body.closingPhotos : []);
        const status = body.status || 'completed';
        const approvalStatus = body.approvalStatus || 'pending';

        await db.prepare(`
          INSERT OR REPLACE INTO reports (
            id, branch, date, date_display, reporter_name, position,
            opening_time, present_count, absent_count, cleanliness_status,
            opening_photos, work_status, operation_challenges, accomplished_tasks,
            unresolved_issues, issues, package_security, closing_time, closing_photos,
            status, approval_status, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
          id, branch, date, dateDisplay, reporterName, position,
          openingTime, presentCount, absentCount, cleanlinessStatus,
          openingPhotos, workStatus, operationChallenges, accomplishedTasks,
          unresolvedIssues, issues, packageSecurity, closingTime, closingPhotos,
          status, approvalStatus
        ).run();

        return json({ success: true, report: body, id });
      }
    }

    if (pathname.startsWith('/api/reports/')) {
      const reportId = decodeURIComponent(pathname.replace('/api/reports/', ''));
      if (method === 'DELETE') {
        await db.prepare("INSERT OR IGNORE INTO deleted_records (type, record_id, deleted_at) VALUES ('report', ?, CURRENT_TIMESTAMP)").bind(reportId).run();
        await db.prepare("DELETE FROM reports WHERE id = ?").bind(reportId).run();
        return json({ success: true, deleted: true, id: reportId });
      }
    }

    // -------------------------------------------------------------------------
    // 3. Issues Delete API
    // -------------------------------------------------------------------------
    if (pathname.startsWith('/api/issues/')) {
      const issueId = decodeURIComponent(pathname.replace('/api/issues/', ''));
      if (method === 'DELETE') {
        await db.prepare("INSERT OR IGNORE INTO deleted_records (type, record_id, deleted_at) VALUES ('issue', ?, CURRENT_TIMESTAMP)").bind(issueId).run();
        return json({ success: true, deleted: true, id: issueId });
      }
    }

    // -------------------------------------------------------------------------
    // 4. Deleted Records (Tombstones) API
    // -------------------------------------------------------------------------
    if (pathname === '/api/deleted-records') {
      if (method === 'GET') {
        const { results } = await db.prepare("SELECT type, record_id FROM deleted_records").all();
        const list = results || [];
        return json({
          reports: list.filter(r => r.type === 'report').map(r => r.record_id),
          issues: list.filter(r => r.type === 'issue').map(r => r.record_id)
        });
      }

      if (method === 'POST') {
        const body = await request.json();
        if (body && body.type && body.recordId) {
          await db.prepare("INSERT OR IGNORE INTO deleted_records (type, record_id, deleted_at) VALUES (?, ?, CURRENT_TIMESTAMP)").bind(body.type, String(body.recordId).trim()).run();
          return json({ success: true });
        }
        return json({ success: false, error: 'Invalid tombstone format' }, 400);
      }
    }

    // -------------------------------------------------------------------------
    // 5. Users API
    // -------------------------------------------------------------------------
    if (pathname === '/api/users') {
      if (method === 'GET') {
        const { results } = await db.prepare("SELECT id, username, password, full_name, role, branch, phone, created_at FROM users ORDER BY created_at ASC").all();
        const users = (results || []).map(u => ({
          id: u.id,
          username: u.username,
          password: u.password,
          fullName: u.full_name,
          role: u.role,
          branch: u.branch,
          phone: u.phone,
          createdAt: u.created_at
        }));
        return json({ success: true, count: users.length, users });
      }

      if (method === 'POST') {
        const body = await request.json();
        if (!body || !body.username) {
          return json({ success: false, error: 'Username is required' }, 400);
        }

        const id = body.id || ('user_' + Date.now());
        const username = body.username.trim();
        const password = body.password || '123';
        const fullName = body.fullName || username;
        const role = body.role || 'បុគ្គលិកប្រតិបត្តិការ';
        const branch = body.branch || 'ក្រចេះ';
        const phone = body.phone || '';
        const createdAt = body.createdAt || new Date().toISOString();

        await db.prepare(`
          INSERT OR REPLACE INTO users (id, username, password, full_name, role, branch, phone, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, username, password, fullName, role, branch, phone, createdAt).run();

        return json({ success: true, user: body, id });
      }
    }

    if (pathname.startsWith('/api/users/')) {
      const userId = decodeURIComponent(pathname.replace('/api/users/', ''));
      if (method === 'DELETE') {
        await db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
        return json({ success: true, deleted: true, id: userId });
      }
    }

    // -------------------------------------------------------------------------
    // 6. Branch Drafts API
    // -------------------------------------------------------------------------
    if (pathname.startsWith('/api/drafts/')) {
      const branchName = decodeURIComponent(pathname.replace('/api/drafts/', ''));
      if (method === 'GET') {
        const row = await db.prepare("SELECT draft_data FROM branch_drafts WHERE branch = ?").bind(branchName).first();
        let draft = null;
        if (row && row.draft_data) {
          try { draft = JSON.parse(row.draft_data); } catch(e){}
        }
        return json({ success: true, branch: branchName, draft });
      }

      if (method === 'POST') {
        const body = await request.json();
        await db.prepare(`
          INSERT OR REPLACE INTO branch_drafts (branch, draft_data, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `).bind(branchName, JSON.stringify(body)).run();
        return json({ success: true, branch: branchName });
      }
    }

    // -------------------------------------------------------------------------
    // 7. Fix Asset System API (Cloudflare D1)
    // -------------------------------------------------------------------------
    if (pathname === '/api/fixasset/summary' || pathname === '/api/fixasset/stats') {
      try {
        try {
          const stats = await db.prepare(`
            SELECT 
              (SELECT count(*) FROM item_fixed_asset_codes) as total_items,
              (SELECT count(*) FROM item_fixed_asset_codes WHERE is_assigned = 1) as assigned_items,
              (SELECT count(*) FROM item_fixed_asset_codes WHERE is_assigned = 0) as unassigned_items,
              (SELECT count(*) FROM employees) as total_employees,
              (SELECT count(*) FROM branches) as total_branches,
              (SELECT count(*) FROM item_masters) as total_masters,
              (SELECT count(*) FROM asset_assignments) as total_assignments,
              (SELECT count(*) FROM grns) as total_grn
          `).first();
          return json({ success: true, stats });
        } catch (d1Err) {
          return json({ success: true, stats: fallbackData.stats, fallback: true });
        }
      } catch (e) {
        return json({ success: true, stats: fallbackData.stats, fallback: true });
      }
    }

    if (pathname === '/api/fixasset/branches') {
      try {
        if (method === 'GET') {
          try {
            const { results } = await db.prepare(`
              SELECT b.id, b.name, b.name_en, b.label,
                (SELECT count(*) FROM employees e WHERE e.branch_id = b.id) as employee_count
              FROM branches b
              ORDER BY b.id ASC
            `).all();
            return json({ success: true, count: results.length, branches: results });
          } catch (d1Err) {
            return json({ success: true, count: fallbackData.branches.length, branches: fallbackData.branches, fallback: true });
          }
        }
        if (method === 'POST') {
          const body = await request.json();
          const { name, name_en } = body;
          if (!name) return json({ success: false, error: 'Branch name is required' }, 400);
          await db.prepare("INSERT INTO branches (name, name_en, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").bind(name, name_en || null).run();
          return json({ success: true, message: 'Branch created successfully' });
        }
        if (method === 'PUT') {
          const body = await request.json();
          const { id, name, name_en } = body;
          if (!id || !name) return json({ success: false, error: 'ID and name required' }, 400);
          await db.prepare("UPDATE branches SET name = ?, name_en = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(name, name_en || null, id).run();
          return json({ success: true, message: 'Branch updated successfully' });
        }
        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          if (!id) return json({ success: false, error: 'ID required' }, 400);
          await db.prepare("DELETE FROM branches WHERE id = ?").bind(id).run();
          return json({ success: true, message: 'Branch deleted' });
        }
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/departments') {
      try {
        if (method === 'GET') {
          try {
            const { results } = await db.prepare("SELECT id, name, name_en, label FROM departments ORDER BY id ASC").all();
            return json({ success: true, count: results.length, departments: results });
          } catch (d1Err) {
            return json({ success: true, count: fallbackData.departments.length, departments: fallbackData.departments, fallback: true });
          }
        }
        if (method === 'POST') {
          const body = await request.json();
          const { name, name_en } = body;
          if (!name) return json({ success: false, error: 'Department name required' }, 400);
          await db.prepare("INSERT INTO departments (name, name_en, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").bind(name, name_en || null).run();
          return json({ success: true, message: 'Department created successfully' });
        }
        if (method === 'PUT') {
          const body = await request.json();
          const { id, name, name_en } = body;
          if (!id || !name) return json({ success: false, error: 'ID and name required' }, 400);
          await db.prepare("UPDATE departments SET name = ?, name_en = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(name, name_en || null, id).run();
          return json({ success: true, message: 'Department updated successfully' });
        }
        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          if (!id) return json({ success: false, error: 'ID required' }, 400);
          await db.prepare("DELETE FROM departments WHERE id = ?").bind(id).run();
          return json({ success: true, message: 'Department deleted' });
        }
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/categories') {
      try {
        if (method === 'GET') {
          try {
            const categories = await db.prepare("SELECT id, name, name_en, label FROM item_categories ORDER BY id ASC").all();
            const types = await db.prepare("SELECT id, name, name_en FROM item_types ORDER BY id ASC").all();
            return json({ success: true, categories: categories.results || [], types: types.results || [] });
          } catch (d1Err) {
            return json({ success: true, categories: fallbackData.categories, types: fallbackData.types, fallback: true });
          }
        }
        if (method === 'POST') {
          const body = await request.json();
          const { name, name_en } = body;
          if (!name) return json({ success: false, error: 'Category name required' }, 400);
          await db.prepare("INSERT INTO item_categories (name, name_en, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").bind(name, name_en || null).run();
          return json({ success: true, message: 'Category created' });
        }
        if (method === 'PUT') {
          const body = await request.json();
          const { id, name, name_en } = body;
          await db.prepare("UPDATE item_categories SET name = ?, name_en = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(name, name_en || null, id).run();
          return json({ success: true, message: 'Category updated' });
        }
        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          await db.prepare("DELETE FROM item_categories WHERE id = ?").bind(id).run();
          return json({ success: true, message: 'Category deleted' });
        }
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/types') {
      try {
        if (method === 'GET') {
          try {
            const { results } = await db.prepare("SELECT id, name, name_en FROM item_types ORDER BY id ASC").all();
            return json({ success: true, types: results });
          } catch (d1Err) {
            return json({ success: true, types: fallbackData.types, fallback: true });
          }
        }
        if (method === 'POST') {
          const body = await request.json();
          const { name, name_en } = body;
          await db.prepare("INSERT INTO item_types (name, name_en, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").bind(name, name_en || null).run();
          return json({ success: true, message: 'Item type created' });
        }
        if (method === 'PUT') {
          const body = await request.json();
          const { id, name, name_en } = body;
          await db.prepare("UPDATE item_types SET name = ?, name_en = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(name, name_en || null, id).run();
          return json({ success: true, message: 'Item type updated' });
        }
        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          await db.prepare("DELETE FROM item_types WHERE id = ?").bind(id).run();
          return json({ success: true, message: 'Item type deleted' });
        }
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/suppliers') {
      try {
        if (method === 'GET') {
          try {
            const { results } = await db.prepare("SELECT id, name, phone, email, address, created_at FROM suppliers ORDER BY id ASC").all();
            return json({ success: true, count: results.length, suppliers: results });
          } catch (d1Err) {
            return json({ success: true, count: fallbackData.suppliers.length, suppliers: fallbackData.suppliers, fallback: true });
          }
        }
        if (method === 'POST') {
          const body = await request.json();
          const { name, phone, email, address } = body;
          if (!name) return json({ success: false, error: 'Supplier name required' }, 400);
          await db.prepare("INSERT INTO suppliers (name, phone, email, address, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").bind(name, phone || null, email || null, address || null).run();
          return json({ success: true, message: 'Supplier created' });
        }
        if (method === 'PUT') {
          const body = await request.json();
          const { id, name, phone, email, address } = body;
          await db.prepare("UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(name, phone || null, email || null, address || null, id).run();
          return json({ success: true, message: 'Supplier updated' });
        }
        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          await db.prepare("DELETE FROM suppliers WHERE id = ?").bind(id).run();
          return json({ success: true, message: 'Supplier deleted' });
        }
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/warehouses') {
      try {
        if (method === 'GET') {
          try {
            const { results } = await db.prepare("SELECT id, name, branch_id, created_at FROM warehouses ORDER BY id ASC").all();
            return json({ success: true, count: results.length, warehouses: results });
          } catch (d1Err) {
            return json({
              success: true,
              count: 2,
              warehouses: [
                { id: 1, name: 'IT warehouse', branch_id: null, created_at: '2026-06-14 22:54:38' },
                { id: 2, name: 'Admin warehouse', branch_id: null, created_at: '2026-06-14 22:54:48' }
              ]
            });
          }
        }
        if (method === 'POST') {
          const body = await request.json();
          const { name, branch_id } = body;
          if (!name) return json({ success: false, error: 'Warehouse name required' }, 400);
          await db.prepare("INSERT INTO warehouses (name, branch_id, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").bind(name, branch_id || null).run();
          return json({ success: true, message: 'Warehouse created' });
        }
        if (method === 'PUT') {
          const body = await request.json();
          const { id, name, branch_id } = body;
          await db.prepare("UPDATE warehouses SET name = ?, branch_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(name, branch_id || null, id).run();
          return json({ success: true, message: 'Warehouse updated' });
        }
        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          await db.prepare("DELETE FROM warehouses WHERE id = ?").bind(id).run();
          return json({ success: true, message: 'Warehouse deleted' });
        }
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/type-of-works') {
      try {
        if (method === 'GET') {
          try {
            const { results } = await db.prepare("SELECT id, name, name_en, label, created_at FROM type_of_works ORDER BY id ASC").all();
            return json({ success: true, count: results.length, type_of_works: results });
          } catch (d1Err) {
            return json({ success: true, count: fallbackData.typeOfWorks.length, type_of_works: fallbackData.typeOfWorks, fallback: true });
          }
        }
        if (method === 'POST') {
          const body = await request.json();
          const { name, name_en, label } = body;
          if (!name) return json({ success: false, error: 'Name required' }, 400);
          await db.prepare("INSERT INTO type_of_works (name, name_en, label, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").bind(name, name_en || null, label || null).run();
          return json({ success: true, message: 'Type of work created' });
        }
        if (method === 'PUT') {
          const body = await request.json();
          const { id, name, name_en, label } = body;
          await db.prepare("UPDATE type_of_works SET name = ?, name_en = ?, label = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(name, name_en || null, label || null, id).run();
          return json({ success: true, message: 'Type of work updated' });
        }
        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          await db.prepare("DELETE FROM type_of_works WHERE id = ?").bind(id).run();
          return json({ success: true, message: 'Type of work deleted' });
        }
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/devices') {
      try {
        if (method === 'GET') {
          try {
            const { results } = await db.prepare("SELECT id, name, host, port, protocol, username, serial_number, model, firmware_version, is_connected, last_connected_at FROM hikvision_devices ORDER BY id ASC").all();
            return json({ success: true, count: results.length, devices: results });
          } catch (d1Err) {
            return json({ success: true, count: fallbackData.devices.length, devices: fallbackData.devices, fallback: true });
          }
        }
        if (method === 'POST') {
          const body = await request.json();
          const { name, host, port, protocol, username, password } = body;
          if (!name || !host) return json({ success: false, error: 'Name and Host required' }, 400);
          await db.prepare("INSERT INTO hikvision_devices (name, host, port, protocol, username, password, is_connected, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").bind(name, host, port || 80, protocol || 'http', username || 'admin', password || '').run();
          return json({ success: true, message: 'Device added' });
        }
        if (method === 'PUT') {
          const body = await request.json();
          const { id, name, host, port, protocol, username } = body;
          await db.prepare("UPDATE hikvision_devices SET name = ?, host = ?, port = ?, protocol = ?, username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(name, host, port || 80, protocol || 'http', username || 'admin', id).run();
          return json({ success: true, message: 'Device updated' });
        }
        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          await db.prepare("DELETE FROM hikvision_devices WHERE id = ?").bind(id).run();
          return json({ success: true, message: 'Device deleted' });
        }
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/users') {
      try {
        if (method === 'GET') {
          try {
            const { results } = await db.prepare("SELECT id, name, name_en, user_login, email, phone_number, status, created_at FROM fixasset_users ORDER BY id ASC").all();
            return json({ success: true, count: results.length, users: results });
          } catch (d1Err) {
            return json({ success: true, count: fallbackData.users.length, users: fallbackData.users, fallback: true });
          }
        }
        if (method === 'POST') {
          const body = await request.json();
          const { name, user_login, username, email, status } = body;
          const loginName = user_login || username;
          if (!name || !loginName) return json({ success: false, error: 'Name and Username required' }, 400);
          await db.prepare("INSERT INTO fixasset_users (name, user_login, email, password, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").bind(name, loginName, email || null, '123', status || 'Active').run();
          return json({ success: true, message: 'User created' });
        }
        if (method === 'PUT') {
          const body = await request.json();
          const { id, name, email, status } = body;
          await db.prepare("UPDATE fixasset_users SET name = ?, email = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(name, email || null, status || 'Active', id).run();
          return json({ success: true, message: 'User updated' });
        }
        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          await db.prepare("DELETE FROM fixasset_users WHERE id = ?").bind(id).run();
          return json({ success: true, message: 'User deleted' });
        }
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/item-masters') {
      try {
        if (method === 'GET') {
          try {
            const { results } = await db.prepare(`
              SELECT m.id, m.code, m.name, m.model, m.brand, m.unit_price, m.unit_of_measure, m.quantity,
                     cat.name as category_name, t.name as item_type_name,
                     (SELECT count(*) FROM item_fixed_asset_codes c WHERE c.item_master_id = m.id AND c.is_assigned = 1) as assigned_count
              FROM item_masters m
              LEFT JOIN item_categories cat ON m.category_id = cat.id
              LEFT JOIN item_types t ON m.item_type_id = t.id
              ORDER BY m.id ASC
            `).all();
            return json({ success: true, count: results.length, item_masters: results });
          } catch (d1Err) {
            return json({ success: true, count: fallbackData.itemMasters.length, item_masters: fallbackData.itemMasters, fallback: true });
          }
        }
        if (method === 'POST') {
          const body = await request.json();
          const { code, name, model, brand, category_id, item_type_id, unit_price, quantity, unit_of_measure } = body;
          if (!name) return json({ success: false, error: 'Name required' }, 400);
          await db.prepare(`
            INSERT INTO item_masters (code, name, model, brand, category_id, item_type_id, unit_price, quantity, unit_of_measure, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).bind(code || ('ITM-' + Date.now().toString().slice(-6)), name, model || null, brand || null, category_id || null, item_type_id || null, unit_price || 0, quantity || 1, unit_of_measure || 'Unit').run();
          return json({ success: true, message: 'Item master created' });
        }
        if (method === 'PUT') {
          const body = await request.json();
          const { id, code, name, model, brand, category_id, item_type_id, unit_price, quantity, unit_of_measure } = body;
          await db.prepare(`
            UPDATE item_masters
            SET code = ?, name = ?, model = ?, brand = ?, category_id = ?, item_type_id = ?, unit_price = ?, quantity = ?, unit_of_measure = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(code, name, model || null, brand || null, category_id || null, item_type_id || null, unit_price || 0, quantity || 1, unit_of_measure || 'Unit', id).run();
          return json({ success: true, message: 'Item master updated' });
        }
        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          await db.prepare("DELETE FROM item_masters WHERE id = ?").bind(id).run();
          return json({ success: true, message: 'Item master deleted' });
        }
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/employees') {
      try {
        if (method === 'GET') {
          try {
            const q = (url.searchParams.get('q') || '').trim();
            const branchId = url.searchParams.get('branch_id');
            const status = url.searchParams.get('status');
            const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 1000);
            const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

            let query = `
              SELECT e.id, e.employee_code, e.employee_name, e.job_title, e.phone_number, e.email, e.status, e.date_of_hired,
                     b.name as branch_name, d.name as department_name, e.branch_id, e.department_id,
                     (SELECT count(*) FROM item_fixed_asset_codes c WHERE c.assigned_to = e.employee_name) as assigned_items_count
              FROM employees e
              LEFT JOIN branches b ON e.branch_id = b.id
              LEFT JOIN departments d ON e.department_id = d.id
            `;
            let whereClauses = [];
            let params = [];

            if (q) {
              whereClauses.push("(e.employee_code LIKE ? OR e.employee_name LIKE ? OR e.job_title LIKE ?)");
              const f = `%${q}%`;
              params.push(f, f, f);
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

            query += " ORDER BY e.id ASC LIMIT ? OFFSET ?";
            params.push(limit, offset);

            const countQuery = `SELECT count(*) as total FROM employees e ${whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : ""}`;
            const countStmt = params.length > 2 ? db.prepare(countQuery).bind(...params.slice(0, -2)) : db.prepare(countQuery);
            const countRes = await countStmt.first();

            const { results } = await db.prepare(query).bind(...params).all();
            return json({ success: true, count: results.length, total: countRes ? countRes.total : results.length, employees: results });
          } catch (d1Err) {
            let emps = fallbackData.employees || [];
            const q = (url.searchParams.get('q') || '').toLowerCase().trim();
            const branchId = url.searchParams.get('branch_id');
            const status = url.searchParams.get('status');
            const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 1000);
            const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

            if (q) {
              emps = emps.filter(e => (e.employee_name || '').toLowerCase().includes(q) || (e.employee_code || '').toLowerCase().includes(q) || (e.job_title || '').toLowerCase().includes(q));
            }
            if (branchId) {
              emps = emps.filter(e => String(e.branch_id) === String(branchId));
            }
            if (status && status !== 'all') {
              emps = emps.filter(e => String(e.status) === String(status));
            }

            const total = emps.length;
            const sliced = emps.slice(offset, offset + limit);
            return json({ success: true, total, limit, offset, count: sliced.length, employees: sliced, fallback: true });
          }
        }

        if (method === 'POST') {
          const body = await request.json();
          const { employee_code, employee_name, branch_id, department_id, job_title, phone_number, email, status } = body;
          if (!employee_name) return json({ success: false, error: 'Employee name required' }, 400);
          await db.prepare(`
            INSERT INTO employees (employee_code, employee_name, branch_id, department_id, job_title, phone_number, email, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).bind(employee_code || ('EMP-' + Date.now().toString().slice(-4)), employee_name, branch_id || null, department_id || null, job_title || 'Staff', phone_number || null, email || null, status || 'Hired').run();
          return json({ success: true, message: 'Employee created' });
        }

        if (method === 'PUT') {
          const body = await request.json();
          const { id, employee_code, employee_name, branch_id, department_id, job_title, phone_number, email, status } = body;
          await db.prepare(`
            UPDATE employees
            SET employee_code = ?, employee_name = ?, branch_id = ?, department_id = ?, job_title = ?, phone_number = ?, email = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(employee_code, employee_name, branch_id || null, department_id || null, job_title || 'Staff', phone_number || null, email || null, status || 'Hired', id).run();
          return json({ success: true, message: 'Employee updated' });
        }

        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          await db.prepare("DELETE FROM employees WHERE id = ?").bind(id).run();
          return json({ success: true, message: 'Employee deleted' });
        }
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/employees/assets') {
      try {
        const empName = url.searchParams.get('name') || '';
        try {
          const { results } = await db.prepare(`
            SELECT c.id, c.code, c.a_code, c.item_master_id, m.name as item_name, m.brand, m.model, m.unit_price, cat.name as category_name
            FROM item_fixed_asset_codes c
            LEFT JOIN item_masters m ON c.item_master_id = m.id
            LEFT JOIN item_categories cat ON m.category_id = cat.id
            WHERE c.assigned_to = ? AND c.is_assigned = 1
          `).bind(empName).all();
          return json({ success: true, count: results.length, assets: results });
        } catch (d1Err) {
          const assets = (fallbackData.items || []).filter(i => i.assigned_to === empName && i.is_assigned === 1);
          return json({ success: true, count: assets.length, assets, fallback: true });
        }
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/items') {
      try {
        if (method === 'GET') {
          try {
            const q = (url.searchParams.get('q') || '').trim();
            const status = (url.searchParams.get('status') || 'all').toLowerCase();
            const categoryId = url.searchParams.get('category_id');
            const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
            const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

            let whereClauses = [];
            let params = [];

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

            const countQuery = `
              SELECT count(*) as total
              FROM item_fixed_asset_codes c
              LEFT JOIN item_masters m ON c.item_master_id = m.id
              ${whereSql}
            `;
            const countStmt = params.length > 0 ? db.prepare(countQuery).bind(...params) : db.prepare(countQuery);
            const totalRes = await countStmt.first();

            const dataQuery = `
              SELECT c.id, c.code, c.a_code, c.is_assigned, c.assigned_to, c.created_at,
                     m.name as item_name, m.model, m.brand, m.unit_price, m.unit_of_measure,
                     cat.name as category_name
              FROM item_fixed_asset_codes c
              LEFT JOIN item_masters m ON c.item_master_id = m.id
              LEFT JOIN item_categories cat ON m.category_id = cat.id
              ${whereSql}
              ORDER BY c.id DESC LIMIT ? OFFSET ?
            `;
            const dataParams = [...params, limit, offset];
            const { results } = await db.prepare(dataQuery).bind(...dataParams).all();

            return json({ success: true, total: totalRes ? totalRes.total : results.length, limit, offset, items: results });
          } catch (d1Err) {
            let items = fallbackData.items || [];
            const q = (url.searchParams.get('q') || '').toLowerCase().trim();
            const status = (url.searchParams.get('status') || 'all').toLowerCase();
            const categoryId = url.searchParams.get('category_id');
            const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
            const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

            if (q) {
              items = items.filter(i => (i.code || '').toLowerCase().includes(q) || (i.a_code || '').toLowerCase().includes(q) || (i.assigned_to || '').toLowerCase().includes(q) || (i.item_name || '').toLowerCase().includes(q) || (i.model || '').toLowerCase().includes(q) || (i.brand || '').toLowerCase().includes(q));
            }
            if (status === 'assigned') {
              items = items.filter(i => i.is_assigned === 1);
            } else if (status === 'unassigned') {
              items = items.filter(i => i.is_assigned === 0);
            }
            if (categoryId) {
              items = items.filter(i => String(i.category_id) === String(categoryId));
            }

            const total = items.length;
            const sliced = items.slice(offset, offset + limit);
            return json({ success: true, total, limit, offset, count: sliced.length, items: sliced, fallback: true });
          }
        }

        if (method === 'POST') {
          const body = await request.json();
          const { code, a_code, item_master_id, assigned_to } = body;
          if (!code) {
            return json({ success: false, error: 'Asset Code is required' }, 400);
          }

          const isAssigned = assigned_to && assigned_to.trim() ? 1 : 0;
          await db.prepare(`
            INSERT INTO item_fixed_asset_codes (code, a_code, item_master_id, is_assigned, assigned_to, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).bind(code, a_code || null, item_master_id || 1, isAssigned, assigned_to || null).run();

          return json({ success: true, message: 'Item created successfully' });
        }

        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          await db.prepare("DELETE FROM item_fixed_asset_codes WHERE id = ?").bind(id).run();
          return json({ success: true, message: 'Item deleted' });
        }
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/assignments') {
      try {
        if (method === 'GET') {
          try {
            const id = url.searchParams.get('id');
            if (id) {
              const assignment = await db.prepare(`
                SELECT a.*, e.employee_code, e.employee_name, b.name as branch_name, d.name as department_name
                FROM asset_assignments a
                LEFT JOIN employees e ON a.employee_id = e.id
                LEFT JOIN branches b ON e.branch_id = b.id
                LEFT JOIN departments d ON e.department_id = d.id
                WHERE a.id = ?
              `).bind(id).first();

              const items = await db.prepare(`
                SELECT * FROM asset_assignment_items WHERE assignment_id = ?
              `).bind(id).all();

              return json({ success: true, assignment, items: items.results || [] });
            }

            const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
            const { results } = await db.prepare(`
              SELECT a.id, a.assignment_no, a.assign_date, a.return_date, a.status, a.notes,
                     e.employee_code, e.employee_name, b.name as branch_name
              FROM asset_assignments a
              LEFT JOIN employees e ON a.employee_id = e.id
              LEFT JOIN branches b ON e.branch_id = b.id
              ORDER BY a.id DESC LIMIT ?
            `).bind(limit).all();
            return json({ success: true, count: results.length, assignments: results });
          } catch (d1Err) {
            return json({ success: true, count: fallbackData.assignments.length, assignments: fallbackData.assignments, fallback: true });
          }
        }

        if (method === 'POST') {
          const body = await request.json();
          const { employee_name, employee_id, item_code, notes, assign_date } = body;
          if (!employee_name || !item_code) {
            return json({ success: false, error: 'Employee name and item code are required' }, 400);
          }

          const assignNo = 'ASN-' + Date.now().toString().slice(-6);
          await db.prepare(`
            INSERT INTO asset_assignments (assignment_no, employee_id, assign_date, status, notes, created_at, updated_at)
            VALUES (?, ?, ?, 'assigned', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).bind(assignNo, employee_id || 1, assign_date || new Date().toISOString().split('T')[0], notes || 'Handover').run();

          await db.prepare(`
            UPDATE item_fixed_asset_codes
            SET is_assigned = 1, assigned_to = ?, updated_at = CURRENT_TIMESTAMP
            WHERE code = ? OR a_code = ?
          `).bind(employee_name, item_code, item_code).run();

          return json({ success: true, assignment_no: assignNo, message: `Successfully assigned ${item_code} to ${employee_name}` });
        }
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/return') {
      try {
        if (method === 'POST') {
          const body = await request.json();
          const { item_code } = body;
          if (!item_code) {
            return json({ success: false, error: 'Item code is required' }, 400);
          }

          await db.prepare(`
            UPDATE item_fixed_asset_codes
            SET is_assigned = 0, assigned_to = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE code = ? OR a_code = ? OR id = ?
          `).bind(item_code, item_code, item_code).run();

          return json({ success: true, message: `Successfully marked ${item_code} as returned` });
        }
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/grn') {
      try {
        if (method === 'GET') {
          try {
            const id = url.searchParams.get('id');
            if (id) {
              const grn = await db.prepare(`
                SELECT g.id, g.grn_number, g.reference_no, g.po_number, g.grn_type, g.status, g.transaction_date, g.note, g.created_at,
                       s.name as supplier_name, s.phone as supplier_phone, w.name as warehouse_name
                FROM grns g
                LEFT JOIN suppliers s ON g.supplier_id = s.id
                LEFT JOIN warehouses w ON g.warehouse_id = w.id
                WHERE g.id = ?
              `).bind(id).first();

              const items = await db.prepare(`
                SELECT gi.id, gi.item_code, gi.description, gi.brand, gi.po_quantity, gi.receive_quantity, gi.unit_price, gi.total_amount, gi.uom, gi.remark,
                       m.name as item_name
                FROM grn_items gi
                LEFT JOIN item_masters m ON gi.item_master_id = m.id
                WHERE gi.grn_id = ?
              `).bind(id).all();

              return json({ success: true, grn, items: items.results || [] });
            }

            const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
            const { results } = await db.prepare(`
              SELECT g.id, g.grn_number, g.reference_no, g.po_number, g.grn_type, g.status, g.transaction_date, g.created_at,
                     s.name as supplier_name, w.name as warehouse_name
              FROM grns g
              LEFT JOIN suppliers s ON g.supplier_id = s.id
              LEFT JOIN warehouses w ON g.warehouse_id = w.id
              ORDER BY g.id DESC LIMIT ?
            `).bind(limit).all();
            return json({ success: true, count: results.length, grn: results });
          } catch (d1Err) {
            return json({ success: true, count: fallbackData.grns.length, grn: fallbackData.grns, fallback: true });
          }
        }

        if (method === 'POST') {
          const body = await request.json();
          const { grn_number, supplier_id, reference_no, po_number, warehouse_id, status } = body;
          const no = grn_number || ('GRN-' + Date.now().toString().slice(-6));
          await db.prepare(`
            INSERT INTO grns (grn_number, supplier_id, reference_no, po_number, warehouse_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).bind(no, supplier_id || null, reference_no || null, po_number || null, warehouse_id || null, status || 'Received').run();
          return json({ success: true, grn_number: no, message: 'GRN created successfully' });
        }
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    return json({ success: false, error: `Endpoint ${pathname} not found` }, 404);
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
