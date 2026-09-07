/**
 * BS Express Unified Fixed Asset System - Native Client Module
 * High-performance enterprise frontend for items, barcodes, employees, and assignments.
 * 100% Cloud-native (Cloudflare D1 / Local Node.js API).
 */

class BSExpressFixAssetUI {
  constructor() {
    this.activeTab = 'dashboard';
    this.itemsPage = 0;
    this.itemsLimit = 25;
    this.itemsTotal = 0;
    this.itemsQuery = '';
    this.itemsStatus = 'all';
    this.itemsCategory = '';

    this.empPage = 0;
    this.empLimit = 25;
    this.empQuery = '';
    this.empBranch = '';

    this.stats = null;
    this.branches = [];
    this.categories = [];
    this.types = [];

    this.searchDebounceTimer = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.bindEvents();
    this.loadStats();
    this.loadBranches();
    this.loadCategories();
    this.loadItems();
    this.loadEmployees();
    this.loadAssignments();
    this.loadGrn();
  }

  bindEvents() {
    // Tab Switching
    document.querySelectorAll('.fa-nav-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = btn.getAttribute('data-fa-tab');
        if (tab) this.switchTab(tab);
      });
    });

    // Items Search Input
    const searchInput = document.getElementById('fa-item-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
          this.itemsQuery = e.target.value.trim();
          this.itemsPage = 0;
          this.loadItems();
        }, 300);
      });
    }

    // Items Status Filter
    const statusSelect = document.getElementById('fa-item-status-filter');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        this.itemsStatus = e.target.value;
        this.itemsPage = 0;
        this.loadItems();
      });
    }

    // Items Category Filter
    const catSelect = document.getElementById('fa-item-cat-filter');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.itemsCategory = e.target.value;
        this.itemsPage = 0;
        this.loadItems();
      });
    }

    // Employees Search Input
    const empInput = document.getElementById('fa-emp-search-input');
    if (empInput) {
      empInput.addEventListener('input', (e) => {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
          this.empQuery = e.target.value.trim();
          this.empPage = 0;
          this.loadEmployees();
        }, 300);
      });
    }

    // Employees Branch Filter
    const empBranchSelect = document.getElementById('fa-emp-branch-filter');
    if (empBranchSelect) {
      empBranchSelect.addEventListener('change', (e) => {
        this.empBranch = e.target.value;
        this.empPage = 0;
        this.loadEmployees();
      });
    }
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.fa-nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-fa-tab') === tabId);
    });

    document.querySelectorAll('.fa-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `fa-panel-${tabId}`);
    });

    if (tabId === 'items') this.loadItems();
    if (tabId === 'employees') this.loadEmployees();
    if (tabId === 'assignments') this.loadAssignments();
    if (tabId === 'grn') this.loadGrn();
    if (tabId === 'branches') this.loadBranches();
  }

  async loadStats() {
    try {
      const res = await fetch('/api/fixasset/stats');
      const data = await res.json();
      if (data.success && data.stats) {
        this.stats = data.stats;
        this.renderStats(data.stats);
      }
    } catch (e) {
      console.warn('Could not load Fix Asset stats:', e);
    }
  }

  renderStats(stats) {
    const elTotal = document.getElementById('fa-stat-total-items');
    const elAssigned = document.getElementById('fa-stat-assigned');
    const elInStock = document.getElementById('fa-stat-in-stock');
    const elEmp = document.getElementById('fa-stat-total-emp');

    if (elTotal) elTotal.textContent = Number(stats.total_items || 0).toLocaleString();
    if (elAssigned) elAssigned.textContent = Number(stats.assigned_items || 0).toLocaleString();
    if (elInStock) elInStock.textContent = Number(stats.unassigned_items || 0).toLocaleString();
    if (elEmp) elEmp.textContent = Number(stats.total_employees || 0).toLocaleString();

    // Badges in subnav
    const bItems = document.getElementById('fa-nav-badge-items');
    const bEmp = document.getElementById('fa-nav-badge-emp');
    if (bItems) bItems.textContent = Number(stats.total_items || 0).toLocaleString();
    if (bEmp) bEmp.textContent = Number(stats.total_employees || 0).toLocaleString();
  }

  async loadCategories() {
    try {
      const res = await fetch('/api/fixasset/categories');
      const data = await res.json();
      if (data.success) {
        this.categories = data.categories || [];
        this.types = data.types || [];
        this.renderCategoryFilters(this.categories);
      }
    } catch (e) {}
  }

  renderCategoryFilters(cats) {
    const select = document.getElementById('fa-item-cat-filter');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- គ្រប់ប្រភេទទាំងអស់ (All Categories) --</option>';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name || c.name_en || c.label;
      select.appendChild(opt);
    });
    if (currentVal) select.value = currentVal;
  }

  async loadBranches() {
    try {
      const res = await fetch('/api/fixasset/branches');
      const data = await res.json();
      if (data.success && data.branches) {
        this.branches = data.branches;
        this.renderBranchFilters(data.branches);
        this.renderBranchesTable(data.branches);
      }
    } catch (e) {}
  }

  renderBranchFilters(branches) {
    const select = document.getElementById('fa-emp-branch-filter');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- គ្រប់សាខាទាំងអស់ (All Branches) --</option>';
    branches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = `${b.name || b.name_en || b.label}`;
      select.appendChild(opt);
    });
    if (currentVal) select.value = currentVal;
  }

  renderBranchesTable(branches) {
    const tbody = document.getElementById('fa-branches-table-body');
    if (!tbody) return;
    if (branches.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding: 20px; color: #94a3b8;">គ្មានទិន្នន័យ</td></tr>';
      return;
    }

    tbody.innerHTML = branches.map((b, idx) => `
      <tr>
        <td style="font-weight: 600;">${idx + 1}</td>
        <td><strong>${this.escapeHtml(b.name || '')}</strong></td>
        <td><span class="fa-badge fa-badge-branch">${this.escapeHtml(b.name_en || b.label || '')}</span></td>
        <td><span class="fa-code-pill">${b.employee_count || 0} នាក់</span></td>
      </tr>
    `).join('');
  }

  async loadItems() {
    const tbody = document.getElementById('fa-items-table-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 30px; color: #94a3b8;"><span class="spinner" style="display:inline-block; vertical-align:middle; margin-right:8px;"></span> កំពុងទាញយកបញ្ជីសម្ភារៈ...</td></tr>';
    }

    try {
      const offset = this.itemsPage * this.itemsLimit;
      const params = new URLSearchParams({
        limit: this.itemsLimit,
        offset: offset,
        status: this.itemsStatus
      });
      if (this.itemsQuery) params.set('q', this.itemsQuery);
      if (this.itemsCategory) params.set('category_id', this.itemsCategory);

      const res = await fetch(`/api/fixasset/items?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        this.itemsTotal = data.total || 0;
        this.renderItemsTable(data.items || []);
        this.renderItemsPagination(data.total || 0);
      }
    } catch (e) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 20px; color: #ef4444;">មិនអាចទាញយកបញ្ជីសម្ភារៈបានទេ</td></tr>';
    }
  }

  renderItemsTable(items) {
    const tbody = document.getElementById('fa-items-table-body');
    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 30px; color: #94a3b8;">រកមិនឃើញទិន្នន័យសម្ភារៈតាមលក្ខខណ្ឌស្វែងរកនេះទេ</td></tr>';
      return;
    }

    tbody.innerHTML = items.map((item, idx) => {
      const isAssigned = item.is_assigned == 1;
      const statusBadge = isAssigned
        ? `<span class="fa-badge fa-badge-assigned">✓ បានបែងចែក</span>`
        : `<span class="fa-badge fa-badge-unassigned">📦 ក្នុងស្តុក (ទំនេរ)</span>`;

      const assignedDisplay = isAssigned && item.assigned_to
        ? `<strong style="color: #10b981;">👤 ${this.escapeHtml(item.assigned_to)}</strong>`
        : `<span style="color: #64748b;">— មិនទាន់បែងចែក —</span>`;

      return `
        <tr>
          <td>
            <div style="display: flex; flex-direction: column; gap: 3px;">
              <span class="fa-code-pill">${this.escapeHtml(item.code || '')}</span>
              ${item.a_code ? `<span class="fa-acode-pill">${this.escapeHtml(item.a_code)}</span>` : ''}
            </div>
          </td>
          <td>
            <div style="display: flex; flex-direction: column;">
              <strong style="font-size: 0.92rem;">${this.escapeHtml(item.item_name || 'Item #' + item.id)}</strong>
              <span style="font-size: 0.78rem; color: #94a3b8;">
                ${item.brand ? this.escapeHtml(item.brand) : ''} ${item.model ? '• ' + this.escapeHtml(item.model) : ''}
              </span>
            </div>
          </td>
          <td><span style="color: #94a3b8;">${this.escapeHtml(item.category_name || 'ទូទៅ')}</span></td>
          <td>${statusBadge}</td>
          <td>${assignedDisplay}</td>
          <td><span style="font-family: monospace; font-weight: 600;">$${Number(item.unit_price || 0).toLocaleString()}</span></td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.openItemDetailModal(${JSON.stringify(item).replace(/"/g, '&quot;')})" title="មើលលម្អិត">
                👁️
              </button>
              ${!isAssigned ? `
                <button type="button" class="btn btn-primary btn-sm" onclick="window.fixAssetUI.openAssignModal('${this.escapeHtml(item.code || '')}')" title="បែងចែក">
                  ✍️ បែងចែក
                </button>
              ` : `
                <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.returnAsset('${this.escapeHtml(item.code || '')}')" title="ដកហូតមកវិញ" style="color: #f59e0b; border-color: rgba(245,158,11,0.3);">
                  ↩️ ដកហូត
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderItemsPagination(total) {
    const info = document.getElementById('fa-items-page-info');
    const prevBtn = document.getElementById('fa-items-prev-btn');
    const nextBtn = document.getElementById('fa-items-next-btn');
    const maxPage = Math.max(0, Math.ceil(total / this.itemsLimit) - 1);

    if (info) {
      const start = this.itemsPage * this.itemsLimit + 1;
      const end = Math.min(total, (this.itemsPage + 1) * this.itemsLimit);
      info.textContent = total > 0 ? `បង្ហាញ ${start} ដល់ ${end} នៃ ${Number(total).toLocaleString()} មុខសម្ភារៈ` : 'គ្មានទិន្នន័យ';
    }

    if (prevBtn) prevBtn.disabled = this.itemsPage <= 0;
    if (nextBtn) nextBtn.disabled = this.itemsPage >= maxPage;
  }

  prevItemsPage() {
    if (this.itemsPage > 0) {
      this.itemsPage--;
      this.loadItems();
    }
  }

  nextItemsPage() {
    const maxPage = Math.ceil(this.itemsTotal / this.itemsLimit) - 1;
    if (this.itemsPage < maxPage) {
      this.itemsPage++;
      this.loadItems();
    }
  }

  async loadEmployees() {
    const tbody = document.getElementById('fa-emp-table-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 30px; color: #94a3b8;"><span class="spinner" style="display:inline-block; vertical-align:middle; margin-right:8px;"></span> កំពុងទាញយកបញ្ជីបុគ្គលិក...</td></tr>';
    }

    try {
      const offset = this.empPage * this.empLimit;
      const params = new URLSearchParams({
        limit: this.empLimit,
        offset: offset
      });
      if (this.empQuery) params.set('q', this.empQuery);
      if (this.empBranch) params.set('branch_id', this.empBranch);

      const res = await fetch(`/api/fixasset/employees?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        this.renderEmployeesTable(data.employees || []);
        const info = document.getElementById('fa-emp-page-info');
        if (info) {
          info.textContent = `ទិន្នន័យបុគ្គលិកសរុប ${Number(this.stats?.total_employees || 615).toLocaleString()} នាក់`;
        }
      }
    } catch (e) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 20px; color: #ef4444;">មិនអាចទាញយកបញ្ជីបុគ្គលិកបានទេ</td></tr>';
    }
  }

  renderEmployeesTable(employees) {
    const tbody = document.getElementById('fa-emp-table-body');
    if (!tbody) return;

    if (employees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 30px; color: #94a3b8;">រកមិនឃើញបុគ្គលិកតាមលក្ខខណ្ឌស្វែងរកនេះទេ</td></tr>';
      return;
    }

    tbody.innerHTML = employees.map(emp => `
      <tr>
        <td><span class="fa-code-pill">${this.escapeHtml(emp.employee_code || '')}</span></td>
        <td>
          <div style="display: flex; flex-direction: column;">
            <strong style="font-size: 0.95rem;">${this.escapeHtml(emp.employee_name || '')}</strong>
            <span style="font-size: 0.78rem; color: #94a3b8;">${this.escapeHtml(emp.phone_number || emp.email || '—')}</span>
          </div>
        </td>
        <td><span style="color: #38bdf8; font-weight: 500;">${this.escapeHtml(emp.job_title || 'បុគ្គលិក')}</span></td>
        <td><span class="fa-badge fa-badge-branch">${this.escapeHtml(emp.branch_name || 'ទូទៅ')}</span></td>
        <td><span style="color: #94a3b8;">${this.escapeHtml(emp.department_name || '—')}</span></td>
        <td>
          <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.filterItemsByEmployee('${this.escapeHtml(emp.employee_name || '')}')" style="font-weight: 600;">
            📦 ${emp.assigned_items_count || 0} សម្ភារៈ
          </button>
        </td>
      </tr>
    `).join('');
  }

  async loadAssignments() {
    const tbody = document.getElementById('fa-assign-table-body');
    if (!tbody) return;

    try {
      const res = await fetch('/api/fixasset/assignments?limit=50');
      const data = await res.json();
      if (data.success && data.assignments) {
        if (data.assignments.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 20px; color: #94a3b8;">គ្មានកំណត់ត្រាប្រគល់សម្ភារៈ</td></tr>';
          return;
        }

        tbody.innerHTML = data.assignments.map(a => `
          <tr>
            <td><span class="fa-code-pill">${this.escapeHtml(a.assignment_no || '')}</span></td>
            <td><strong>${this.escapeHtml(a.employee_name || '—')}</strong> <span style="color:#94a3b8; font-size:0.8rem;">(${this.escapeHtml(a.employee_code || '')})</span></td>
            <td><span class="fa-badge fa-badge-branch">${this.escapeHtml(a.branch_name || 'ទូទៅ')}</span></td>
            <td>${a.assign_date ? a.assign_date.split(' ')[0] : '—'}</td>
            <td><span class="fa-badge fa-badge-assigned">✓ ${this.escapeHtml(a.status || 'Assigned')}</span></td>
            <td><span style="color: #94a3b8; font-size: 0.85rem;">${this.escapeHtml(a.notes || '—')}</span></td>
          </tr>
        `).join('');
      }
    } catch (e) {}
  }

  async loadGrn() {
    const tbody = document.getElementById('fa-grn-table-body');
    if (!tbody) return;

    try {
      const res = await fetch('/api/fixasset/grn?limit=50');
      const data = await res.json();
      if (data.success && data.grn) {
        if (data.grn.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 20px; color: #94a3b8;">គ្មានកំណត់ត្រា GRN</td></tr>';
          return;
        }

        tbody.innerHTML = data.grn.map(g => `
          <tr>
            <td><span class="fa-code-pill">${this.escapeHtml(g.grn_no || '')}</span></td>
            <td><strong>${this.escapeHtml(g.supplier_name || '—')}</strong></td>
            <td>${this.escapeHtml(g.invoice_no || g.po_no || '—')}</td>
            <td><span class="fa-badge fa-badge-branch">${this.escapeHtml(g.branch_name || 'ទូទៅ')}</span></td>
            <td>${g.created_at ? g.created_at.split(' ')[0] : '—'}</td>
            <td><span class="fa-badge fa-badge-assigned">${this.escapeHtml(g.status || 'Received')}</span></td>
          </tr>
        `).join('');
      }
    } catch (e) {}
  }

  openItemDetailModal(item) {
    const modal = document.getElementById('fa-item-modal');
    if (!modal) return;
    const body = document.getElementById('fa-item-modal-content');
    if (body) {
      body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px;">
          <div>
            <h4 style="margin: 0; font-size: 1.15rem; color: #f8fafc;">${this.escapeHtml(item.item_name || 'សម្ភារៈ')}</h4>
            <span style="color: #94a3b8; font-size: 0.85rem;">${this.escapeHtml(item.brand || '')} • ${this.escapeHtml(item.model || '')}</span>
          </div>
          <span class="fa-badge ${item.is_assigned == 1 ? 'fa-badge-assigned' : 'fa-badge-unassigned'}">
            ${item.is_assigned == 1 ? '✓ បានបែងចែក' : '📦 ក្នុងស្តុក (ទំនេរ)'}
          </span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.9rem; margin-top: 10px;">
          <div><strong>លេខកូដ FA:</strong> <code class="fa-code-pill">${this.escapeHtml(item.code || '—')}</code></div>
          <div><strong>លេខកូដសម្ភារៈ (A-Code):</strong> <code class="fa-acode-pill">${this.escapeHtml(item.a_code || '—')}</code></div>
          <div><strong>ប្រភេទ:</strong> ${this.escapeHtml(item.category_name || 'ទូទៅ')}</div>
          <div><strong>ខ្នាតរង្វាស់:</strong> ${this.escapeHtml(item.unit_of_measure || 'Pcs')}</div>
          <div><strong>តម្លៃឯកតា:</strong> <span style="color: #10b981; font-weight: 700;">$${Number(item.unit_price || 0).toLocaleString()}</span></div>
          <div><strong>អ្នកកាន់កាប់:</strong> <strong>${this.escapeHtml(item.assigned_to || '— មិនទាន់មាន —')}</strong></div>
        </div>
      `;
    }
    modal.classList.add('active');
  }

  closeItemDetailModal() {
    const modal = document.getElementById('fa-item-modal');
    if (modal) modal.classList.remove('active');
  }

  openAssignModal(itemCode) {
    const codeInput = document.getElementById('fa-assign-item-code');
    const modal = document.getElementById('fa-assign-modal');
    if (codeInput) codeInput.value = itemCode || '';
    if (modal) modal.classList.add('active');
  }

  closeAssignModal() {
    const modal = document.getElementById('fa-assign-modal');
    if (modal) modal.classList.remove('active');
  }

  async submitAssign() {
    const empName = document.getElementById('fa-assign-emp-name')?.value?.trim();
    const itemCode = document.getElementById('fa-assign-item-code')?.value?.trim();

    if (!empName || !itemCode) {
      alert('សូមបញ្ចូលឈ្មោះបុគ្គលិក និងលេខកូដសម្ភារៈ!');
      return;
    }

    try {
      const res = await fetch('/api/fixasset/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_name: empName, item_code: itemCode })
      });
      const data = await res.json();
      if (data.success) {
        this.closeAssignModal();
        alert(`បានបែងចែកសម្ភារៈ ${itemCode} ទៅកាន់ ${empName} ដោយជោគជ័យ!`);
        this.loadStats();
        this.loadItems();
        this.loadAssignments();
      } else {
        alert('កំហុស៖ ' + (data.error || 'មិនអាចបែងចែកបានទេ'));
      }
    } catch (e) {
      alert('កំហុសប្រព័ន្ធ៖ ' + e.message);
    }
  }

  async returnAsset(itemCode) {
    if (!confirm(`តើអ្នកពិតជាចង់ដកហូតសម្ភារៈ ${itemCode} ត្រឡប់មកស្តុកវិញមែនទេ?`)) return;

    try {
      const res = await fetch('/api/fixasset/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_code: itemCode })
      });
      const data = await res.json();
      if (data.success) {
        alert(`បានដកហូតសម្ភារៈ ${itemCode} ត្រឡប់មកស្តុកវិញរួចរាល់!`);
        this.loadStats();
        this.loadItems();
        this.loadAssignments();
      } else {
        alert('កំហុស៖ ' + (data.error || 'មិនអាចដកហូតបានទេ'));
      }
    } catch (e) {
      alert('កំហុសប្រព័ន្ធ៖ ' + e.message);
    }
  }

  filterItemsByEmployee(empName) {
    this.switchTab('items');
    const searchInput = document.getElementById('fa-item-search-input');
    if (searchInput) {
      searchInput.value = empName;
      this.itemsQuery = empName;
      this.itemsPage = 0;
      this.loadItems();
    }
  }

  exportItemsExcel() {
    const q = this.itemsQuery;
    const status = this.itemsStatus;
    const cat = this.itemsCategory;
    alert('កំពុងបង្កើត និងទាញយកឯកសារ Excel បញ្ជីសម្ភារៈ Fixed Asset...');
    window.open(`/api/fixasset/items?limit=5000&status=${status}&q=${encodeURIComponent(q)}&category_id=${cat}`, '_blank');
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Instantiate and expose to window
if (typeof window !== 'undefined') {
  window.BSExpressFixAssetUI = BSExpressFixAssetUI;
  window.fixAssetUI = new BSExpressFixAssetUI();
}
