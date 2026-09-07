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
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/branches') {
      try {
        const { results } = await db.prepare(`
          SELECT b.id, b.name, b.name_en, b.label,
            (SELECT count(*) FROM employees e WHERE e.branch_id = b.id) as employee_count
          FROM branches b
          ORDER BY b.id ASC
        `).all();
        return json({ success: true, count: results.length, branches: results });
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/departments') {
      try {
        const { results } = await db.prepare("SELECT id, name, name_en, label FROM departments ORDER BY id ASC").all();
        return json({ success: true, count: results.length, departments: results });
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/categories') {
      try {
        const categories = await db.prepare("SELECT id, name, name_en, label FROM item_categories ORDER BY id ASC").all();
        const types = await db.prepare("SELECT id, name, name_en, label, category_id FROM item_types ORDER BY id ASC").all();
        return json({ success: true, categories: categories.results || [], types: types.results || [] });
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/employees') {
      try {
        const q = (url.searchParams.get('q') || '').trim();
        const branchId = url.searchParams.get('branch_id');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 1000);
        const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

        let query = `
          SELECT e.id, e.employee_code, e.employee_name, e.job_title, e.phone_number, e.email, e.status,
                 b.name as branch_name, d.name as department_name,
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
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/items') {
      try {
        if (method === 'GET') {
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
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/assignments') {
      try {
        if (method === 'GET') {
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
        }

        if (method === 'POST') {
          const body = await request.json();
          const { employee_name, item_code } = body;
          if (!employee_name || !item_code) {
            return json({ success: false, error: 'Employee name and item code are required' }, 400);
          }

          await db.prepare(`
            UPDATE item_fixed_asset_codes
            SET is_assigned = 1, assigned_to = ?, updated_at = CURRENT_TIMESTAMP
            WHERE code = ? OR a_code = ?
          `).bind(employee_name, item_code, item_code).run();

          return json({ success: true, message: `Successfully assigned ${item_code} to ${employee_name}` });
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
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
        const { results } = await db.prepare(`
          SELECT g.id, g.grn_no, g.invoice_no, g.po_no, g.status, g.created_at,
                 s.name as supplier_name, b.name as branch_name
          FROM grns g
          LEFT JOIN suppliers s ON g.supplier_id = s.id
          LEFT JOIN branches b ON g.branch_id = b.id
          ORDER BY g.id DESC LIMIT ?
        `).bind(limit).all();
        return json({ success: true, count: results.length, grn: results });
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    return json({ success: false, error: `Endpoint ${pathname} not found` }, 404);
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
