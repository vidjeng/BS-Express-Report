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
            (SELECT count(*) FROM asset_assignments) as total_assignments
        `).first();
        return json({ success: true, stats });
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/branches') {
      try {
        const { results } = await db.prepare("SELECT id, name, name_en, label FROM branches ORDER BY id ASC").all();
        return json({ success: true, count: results.length, branches: results });
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/employees') {
      try {
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 1000);
        const { results } = await db.prepare("SELECT id, employee_code, employee_name, job_title, department_id, branch_id, status FROM employees ORDER BY id ASC LIMIT ?").bind(limit).all();
        return json({ success: true, count: results.length, employees: results });
      } catch (e) {
        return json({ success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/fixasset/items') {
      try {
        const q = (url.searchParams.get('q') || '').trim();
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
        const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

        if (q) {
          const filter = `%${q}%`;
          const query = `
            SELECT c.id, c.code, c.a_code, c.is_assigned, c.assigned_to, m.name as item_name, m.model, m.brand
            FROM item_fixed_asset_codes c
            LEFT JOIN item_masters m ON c.item_master_id = m.id
            WHERE c.code LIKE ? OR c.a_code LIKE ? OR c.assigned_to LIKE ? OR m.name LIKE ?
            ORDER BY c.id DESC LIMIT ? OFFSET ?
          `;
          const countQuery = `
            SELECT count(*) as total FROM item_fixed_asset_codes c
            LEFT JOIN item_masters m ON c.item_master_id = m.id
            WHERE c.code LIKE ? OR c.a_code LIKE ? OR c.assigned_to LIKE ? OR m.name LIKE ?
          `;
          const totalRes = await db.prepare(countQuery).bind(filter, filter, filter, filter).first();
          const { results } = await db.prepare(query).bind(filter, filter, filter, filter, limit, offset).all();
          return json({ success: true, total: totalRes ? totalRes.total : results.length, limit, offset, items: results });
        } else {
          const query = `
            SELECT c.id, c.code, c.a_code, c.is_assigned, c.assigned_to, m.name as item_name, m.model, m.brand
            FROM item_fixed_asset_codes c
            LEFT JOIN item_masters m ON c.item_master_id = m.id
            ORDER BY c.id DESC LIMIT ? OFFSET ?
          `;
          const totalRes = await db.prepare("SELECT count(*) as total FROM item_fixed_asset_codes").first();
          const { results } = await db.prepare(query).bind(limit, offset).all();
          return json({ success: true, total: totalRes ? totalRes.total : results.length, limit, offset, items: results });
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
