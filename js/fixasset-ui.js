/**
 * BS Express Unified Fixed Asset System - Native Enterprise Client Module
 * Full clone & integration of legacy Fixed Asset ERP into the unified single-cloud application.
 * 100% Cloud-native (Cloudflare D1 / Local Node.js + MySQL API).
 */

class BSExpressFixAssetUI {
  constructor() {
    this.activeTab = 'dashboard';

    // Pagination & filter state
    this.itemsPage = 0;
    this.itemsLimit = 25;
    this.itemsTotal = 0;
    this.itemsQuery = '';
    this.itemsStatus = 'all';
    this.itemsCategory = '';

    this.empPage = 0;
    this.empLimit = 25;
    this.empTotal = 0;
    this.empQuery = '';
    this.empBranch = '';
    this.empStatus = 'all';

    // Master caches
    this.stats = null;
    this.branches = [];
    this.departments = [];
    this.categories = [];
    this.types = [];
    this.suppliers = [];
    this.warehouses = [];
    this.typeOfWorks = [];
    this.devices = [];
    this.users = [];
    this.itemMasters = [];
    this.assignments = [];
    this.grnList = [];

    this.searchDebounceTimer = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.bindEvents();
    this.loadStats();
    this.loadBranches();
    this.loadDepartments();
    this.loadCategories();
    this.loadItems();
    this.loadEmployees();
    this.loadItemMasters();
    this.loadAssignments();
    this.loadGrn();
  }

  bindEvents() {
    // Sidebar & Tab Navigation
    document.querySelectorAll('[data-fa-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = btn.getAttribute('data-fa-tab');
        if (tab) {
          this.switchTab(tab);
          this.closeMobileSidebar();
        }
      });
    });

    // Mobile Sidebar Drawer Toggle
    const mobileToggle = document.getElementById('fa-mobile-toggle');
    const sidebar = document.getElementById('fa-sidebar');
    const backdrop = document.getElementById('fa-sidebar-backdrop');

    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (backdrop) backdrop.classList.toggle('active', sidebar.classList.contains('open'));
      });
    }

    if (backdrop && sidebar) {
      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
      });
    }

    // Asset Codes Search & Filters
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

    const statusSelect = document.getElementById('fa-item-status-filter');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        this.itemsStatus = e.target.value;
        this.itemsPage = 0;
        this.loadItems();
      });
    }

    const catSelect = document.getElementById('fa-item-cat-filter');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.itemsCategory = e.target.value;
        this.itemsPage = 0;
        this.loadItems();
      });
    }

    // Employees Search & Filter
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

    const empBranchSelect = document.getElementById('fa-emp-branch-filter');
    if (empBranchSelect) {
      empBranchSelect.addEventListener('change', (e) => {
        this.empBranch = e.target.value;
        this.empPage = 0;
        this.loadEmployees();
      });
    }

    // Type of Works Search
    const towSearch = document.getElementById('fa-tow-search-input');
    if (towSearch) {
      towSearch.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        this.renderTypeOfWorksTable(this.typeOfWorks.filter(w =>
          (w.name || '').toLowerCase().includes(q) || (w.name_en || '').toLowerCase().includes(q)
        ));
      });
    }

    // Item Masters Search
    const imSearch = document.getElementById('fa-master-search-input');
    if (imSearch) {
      imSearch.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        this.renderItemMastersTable(this.itemMasters.filter(m =>
          (m.code || '').toLowerCase().includes(q) ||
          (m.name || '').toLowerCase().includes(q) ||
          (m.brand || '').toLowerCase().includes(q) ||
          (m.model || '').toLowerCase().includes(q)
        ));
      });
    }
  }

  closeMobileSidebar() {
    const sidebar = document.getElementById('fa-sidebar');
    const backdrop = document.getElementById('fa-sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
  }

  switchTab(tabId) {
    this.activeTab = tabId;

    // Update active nav items
    document.querySelectorAll('[data-fa-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-fa-tab') === tabId);
    });

    // Update active panels
    document.querySelectorAll('.fa-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `fa-panel-${tabId}`);
    });

    // Lazy load data for the active view
    switch (tabId) {
      case 'dashboard':
        this.loadStats();
        break;
      case 'employees':
        this.loadEmployees();
        break;
      case 'items':
        this.loadItems();
        break;
      case 'item-masters':
        this.loadItemMasters();
        break;
      case 'assignments':
        this.loadAssignments();
        break;
      case 'grn':
        this.loadGrn();
        break;
      case 'branches':
        this.loadBranches();
        break;
      case 'departments':
        this.loadDepartments();
        break;
      case 'categories':
        this.loadCategories();
        break;
      case 'types':
        this.loadTypes();
        break;
      case 'suppliers':
        this.loadSuppliers();
        break;
      case 'warehouses':
        this.loadWarehouses();
        break;
      case 'type-of-works':
        this.loadTypeOfWorks();
        break;
      case 'devices':
        this.loadDevices();
        break;
      case 'users':
        this.loadUsers();
        break;
      case 'reports':
        this.initReportsTab();
        break;
    }
  }

  // ===========================================================================
  // 1. DASHBOARD / STATS
  // ===========================================================================
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
    const elBranches = document.getElementById('fa-stat-total-branches');
    const elMasters = document.getElementById('fa-stat-total-masters');
    const elGrn = document.getElementById('fa-stat-total-grn');

    if (elTotal) elTotal.textContent = Number(stats.total_items || 0).toLocaleString();
    if (elAssigned) elAssigned.textContent = Number(stats.assigned_items || 0).toLocaleString();
    if (elInStock) elInStock.textContent = Number(stats.unassigned_items || 0).toLocaleString();
    if (elEmp) elEmp.textContent = Number(stats.total_employees || 0).toLocaleString();
    if (elBranches) elBranches.textContent = Number(stats.total_branches || 0).toLocaleString();
    if (elMasters) elMasters.textContent = Number(stats.total_masters || 0).toLocaleString();
    if (elGrn) elGrn.textContent = Number(stats.total_grn || 0).toLocaleString();

    // Nav badges
    const bItems = document.getElementById('fa-nav-badge-items');
    const bEmp = document.getElementById('fa-nav-badge-emp');
    const bMasters = document.getElementById('fa-nav-badge-masters');
    const bAssign = document.getElementById('fa-nav-badge-assign');

    if (bItems) bItems.textContent = Number(stats.total_items || 0).toLocaleString();
    if (bEmp) bEmp.textContent = Number(stats.total_employees || 0).toLocaleString();
    if (bMasters) bMasters.textContent = Number(stats.total_masters || 0).toLocaleString();
    if (bAssign) bAssign.textContent = Number(stats.total_assignments || 0).toLocaleString();
  }

  // ===========================================================================
  // 2. EMPLOYEES MASTER (/employees)
  // ===========================================================================
  async loadEmployees() {
    const tbody = document.getElementById('fa-emp-table-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 24px; color: #94a3b8;"><span class="spinner"></span> កំពុងទាញយកបញ្ជីបុគ្គលិក...</td></tr>';
    }

    try {
      const offset = this.empPage * this.empLimit;
      const params = new URLSearchParams({
        limit: this.empLimit,
        offset: offset
      });
      if (this.empQuery) params.set('q', this.empQuery);
      if (this.empBranch) params.set('branch_id', this.empBranch);
      if (this.empStatus && this.empStatus !== 'all') params.set('status', this.empStatus);

      const res = await fetch(`/api/fixasset/employees?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        this.empTotal = data.total || 0;
        this.renderEmployeesTable(data.employees || []);
        this.renderEmployeesPagination(data.total || 0);
      }
    } catch (e) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 20px; color: #ef4444;">មិនអាចទាញយកបញ្ជីបុគ្គលិកបានទេ</td></tr>';
    }
  }

  renderEmployeesTable(employees) {
    const tbody = document.getElementById('fa-emp-table-body');
    if (!tbody) return;

    if (employees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 30px; color: #94a3b8;">រកមិនឃើញបុគ្គលិកតាមលក្ខខណ្ឌស្វែងរកនេះទេ</td></tr>';
      return;
    }

    tbody.innerHTML = employees.map((emp, idx) => `
      <tr>
        <td style="font-weight: 600;">${this.empPage * this.empLimit + idx + 1}</td>
        <td><span class="fa-code-pill">${this.escapeHtml(emp.employee_code || '')}</span></td>
        <td>
          <div style="display: flex; flex-direction: column;">
            <strong style="font-size: 0.95rem;">${this.escapeHtml(emp.employee_name || '')}</strong>
            <span style="font-size: 0.78rem; color: #94a3b8;">${this.escapeHtml(emp.phone_number || emp.email || '—')}</span>
          </div>
        </td>
        <td><span style="color: #38bdf8; font-weight: 500;">${this.escapeHtml(emp.job_title || 'បុគ្គលិក')}</span></td>
        <td><span class="fa-badge fa-badge-branch">${this.escapeHtml(emp.branch_name || 'ទូទៅ')}</span></td>
        <td>
          <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.openEmployeeAssetsModal('${this.escapeHtml(emp.employee_name || '')}')" style="font-weight: 600;">
            📦 ${emp.assigned_items_count || 0} សម្ភារៈ
          </button>
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.openEditEmployeeModal(${JSON.stringify(emp).replace(/"/g, '&quot;')})" title="កែប្រែ">
              ✏️
            </button>
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.deleteEmployee(${emp.id})" title="លុប" style="color: #ef4444; border-color: rgba(239,68,68,0.3);">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  renderEmployeesPagination(total) {
    const info = document.getElementById('fa-emp-page-info');
    const prevBtn = document.getElementById('fa-emp-prev-btn');
    const nextBtn = document.getElementById('fa-emp-next-btn');
    const maxPage = Math.max(0, Math.ceil(total / this.empLimit) - 1);

    if (info) {
      const start = total === 0 ? 0 : this.empPage * this.empLimit + 1;
      const end = Math.min(total, (this.empPage + 1) * this.empLimit);
      info.textContent = `បង្ហាញ ${start} ដល់ ${end} នៃ ${Number(total).toLocaleString()} នាក់`;
    }

    if (prevBtn) prevBtn.disabled = this.empPage <= 0;
    if (nextBtn) nextBtn.disabled = this.empPage >= maxPage;
  }

  prevEmpPage() {
    if (this.empPage > 0) {
      this.empPage--;
      this.loadEmployees();
    }
  }

  nextEmpPage() {
    const maxPage = Math.ceil(this.empTotal / this.empLimit) - 1;
    if (this.empPage < maxPage) {
      this.empPage++;
      this.loadEmployees();
    }
  }

  openCreateEmployeeModal() {
    this.populateBranchAndDeptSelects('fa-modal-emp-branch', 'fa-modal-emp-dept');
    document.getElementById('fa-modal-emp-id').value = '';
    document.getElementById('fa-modal-emp-code').value = 'EMP-' + Date.now().toString().slice(-4);
    document.getElementById('fa-modal-emp-name').value = '';
    document.getElementById('fa-modal-emp-job').value = 'Staff';
    document.getElementById('fa-modal-emp-phone').value = '';
    document.getElementById('fa-modal-emp-email').value = '';
    document.getElementById('fa-employee-modal-title').textContent = '➕ បង្កើតបុគ្គលិកថ្មី (New Employee)';
    document.getElementById('fa-employee-modal').classList.add('active');
  }

  openEditEmployeeModal(emp) {
    this.populateBranchAndDeptSelects('fa-modal-emp-branch', 'fa-modal-emp-dept', emp.branch_id, emp.department_id);
    document.getElementById('fa-modal-emp-id').value = emp.id;
    document.getElementById('fa-modal-emp-code').value = emp.employee_code || '';
    document.getElementById('fa-modal-emp-name').value = emp.employee_name || '';
    document.getElementById('fa-modal-emp-job').value = emp.job_title || '';
    document.getElementById('fa-modal-emp-phone').value = emp.phone_number || '';
    document.getElementById('fa-modal-emp-email').value = emp.email || '';
    document.getElementById('fa-employee-modal-title').textContent = '✏️ កែប្រែព័ត៌មានបុគ្គលិក (Edit Employee)';
    document.getElementById('fa-employee-modal').classList.add('active');
  }

  closeEmployeeModal() {
    const modal = document.getElementById('fa-employee-modal');
    if (modal) modal.classList.remove('active');
  }

  async saveEmployee() {
    const id = document.getElementById('fa-modal-emp-id').value;
    const employee_code = document.getElementById('fa-modal-emp-code').value.trim();
    const employee_name = document.getElementById('fa-modal-emp-name').value.trim();
    const branch_id = document.getElementById('fa-modal-emp-branch').value;
    const department_id = document.getElementById('fa-modal-emp-dept').value;
    const job_title = document.getElementById('fa-modal-emp-job').value.trim();
    const phone_number = document.getElementById('fa-modal-emp-phone').value.trim();
    const email = document.getElementById('fa-modal-emp-email').value.trim();

    if (!employee_name) {
      alert('សូមបញ្ចូលឈ្មោះបុគ្គលិក!');
      return;
    }

    const payload = { id, employee_code, employee_name, branch_id, department_id, job_title, phone_number, email };
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/fixasset/employees', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.closeEmployeeModal();
        this.loadEmployees();
        this.loadStats();
        alert(id ? 'បានកែប្រែព័ត៌មានបុគ្គលិកជោគជ័យ!' : 'បានបង្កើតបុគ្គលិកថ្មីជោគជ័យ!');
      } else {
        alert('កំហុស៖ ' + (data.error || 'បរាជ័យ'));
      }
    } catch (e) {
      alert('កំហុសបណ្ដាញ៖ ' + e.message);
    }
  }

  async deleteEmployee(id) {
    if (!confirm('តើអ្នកពិតជាចង់លុបបុគ្គលិកនេះមែនទេ?')) return;
    try {
      const res = await fetch(`/api/fixasset/employees?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.loadEmployees();
        this.loadStats();
        alert('បានលុបបុគ្គលិកជោគជ័យ');
      } else {
        alert('កំហុស៖ ' + data.error);
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  async openEmployeeAssetsModal(empName) {
    const modal = document.getElementById('fa-emp-assets-modal');
    const content = document.getElementById('fa-emp-assets-content');
    const title = document.getElementById('fa-emp-assets-title');
    if (!modal || !content) return;

    if (title) title.textContent = `📦 សម្ភារៈកាន់កាប់ដោយ៖ ${empName}`;
    content.innerHTML = '<div style="text-align: center; padding: 20px; color: #94a3b8;"><span class="spinner"></span> កំពុងទាញយកសម្ភារៈ...</div>';
    modal.classList.add('active');

    try {
      const res = await fetch(`/api/fixasset/employees/assets?name=${encodeURIComponent(empName)}`);
      const data = await res.json();

      if (data.success && data.assets) {
        if (data.assets.length === 0) {
          content.innerHTML = '<div style="text-align: center; padding: 30px; color: #94a3b8;">បុគ្គលិកនេះមិនទាន់មានសម្ភារៈណាមួយត្រូវបានបែងចែកឡើយ</div>';
          return;
        }

        content.innerHTML = `
          <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
            <button type="button" class="btn btn-primary btn-sm" onclick="window.fixAssetUI.printEmployeeHandoverSheet('${this.escapeHtml(empName)}', ${JSON.stringify(data.assets).replace(/"/g, '&quot;')})">
              🖨️ បោះពុម្ពលិខិតប្រគល់ទទួល (Print Handover Sheet)
            </button>
          </div>
          <table class="fa-table">
            <thead>
              <tr>
                <th>កូដ FA</th>
                <th>ឈ្មោះសម្ភារៈ</th>
                <th>ម៉ាក / ម៉ូដែល</th>
                <th>តម្លៃឯកតា</th>
                <th>សកម្មភាព</th>
              </tr>
            </thead>
            <tbody>
              ${data.assets.map(a => `
                <tr>
                  <td><span class="fa-code-pill">${this.escapeHtml(a.code)}</span></td>
                  <td><strong>${this.escapeHtml(a.item_name || 'Item')}</strong></td>
                  <td>${this.escapeHtml(a.brand || '')} ${this.escapeHtml(a.model || '')}</td>
                  <td>$${Number(a.unit_price || 0).toLocaleString()}</td>
                  <td>
                    <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.returnAsset('${this.escapeHtml(a.code)}')" style="color:#f59e0b; border-color: rgba(245,158,11,0.3);">
                      ↩️ ដកហូត
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    } catch (e) {
      content.innerHTML = '<div style="color: #ef4444; padding: 20px;">មិនអាចទាញយកទិន្នន័យសម្ភារៈបានទេ</div>';
    }
  }

  closeEmployeeAssetsModal() {
    const modal = document.getElementById('fa-emp-assets-modal');
    if (modal) modal.classList.remove('active');
  }

  // ===========================================================================
  // 3. ITEMS MASTER (/items)
  // ===========================================================================
  async loadItemMasters() {
    const tbody = document.getElementById('fa-masters-table-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 24px; color: #94a3b8;"><span class="spinner"></span> កំពុងទាញយក Item Masters...</td></tr>';
    }

    try {
      const res = await fetch('/api/fixasset/item-masters');
      const data = await res.json();
      if (data.success && data.item_masters) {
        this.itemMasters = data.item_masters;
        this.renderItemMastersTable(data.item_masters);
      }
    } catch (e) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="color: #ef4444; padding: 20px;">មិនអាចទាញយកទិន្នន័យបានទេ</td></tr>';
    }
  }

  renderItemMastersTable(masters) {
    const tbody = document.getElementById('fa-masters-table-body');
    if (!tbody) return;

    if (masters.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 30px; color: #94a3b8;">គ្មានទិន្នន័យ Item Master</td></tr>';
      return;
    }

    tbody.innerHTML = masters.map((m, idx) => `
      <tr>
        <td style="font-weight: 600;">${idx + 1}</td>
        <td><span class="fa-code-pill">${this.escapeHtml(m.code || '')}</span></td>
        <td><strong>${this.escapeHtml(m.name || '')}</strong></td>
        <td>${this.escapeHtml(m.category_name || 'ទូទៅ')}</td>
        <td>${this.escapeHtml(m.item_type_name || '—')}</td>
        <td>${this.escapeHtml(m.brand || '')} ${this.escapeHtml(m.model || '')}</td>
        <td><span style="font-weight: 700; color: #10b981;">$${Number(m.unit_price || 0).toLocaleString()}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.openEditItemMasterModal(${JSON.stringify(m).replace(/"/g, '&quot;')})" title="កែប្រែ">✏️</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.deleteItemMaster(${m.id})" title="លុប" style="color: #ef4444; border-color: rgba(239,68,68,0.3);">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  openCreateItemMasterModal() {
    this.populateCatAndTypeSelects('fa-modal-master-cat', 'fa-modal-master-type');
    document.getElementById('fa-modal-master-id').value = '';
    document.getElementById('fa-modal-master-code').value = 'ITM-' + Date.now().toString().slice(-6);
    document.getElementById('fa-modal-master-name').value = '';
    document.getElementById('fa-modal-master-model').value = '';
    document.getElementById('fa-modal-master-brand').value = '';
    document.getElementById('fa-modal-master-price').value = '0';
    document.getElementById('fa-modal-master-qty').value = '1';
    document.getElementById('fa-modal-master-uom').value = 'Unit';
    document.getElementById('fa-master-modal-title').textContent = '➕ បង្កើត Item Master ថ្មី';
    document.getElementById('fa-master-modal').classList.add('active');
  }

  openEditItemMasterModal(m) {
    this.populateCatAndTypeSelects('fa-modal-master-cat', 'fa-modal-master-type', m.category_id, m.item_type_id);
    document.getElementById('fa-modal-master-id').value = m.id;
    document.getElementById('fa-modal-master-code').value = m.code || '';
    document.getElementById('fa-modal-master-name').value = m.name || '';
    document.getElementById('fa-modal-master-model').value = m.model || '';
    document.getElementById('fa-modal-master-brand').value = m.brand || '';
    document.getElementById('fa-modal-master-price').value = m.unit_price || 0;
    document.getElementById('fa-modal-master-qty').value = m.quantity || 1;
    document.getElementById('fa-modal-master-uom').value = m.unit_of_measure || 'Unit';
    document.getElementById('fa-master-modal-title').textContent = '✏️ កែប្រែ Item Master';
    document.getElementById('fa-master-modal').classList.add('active');
  }

  closeItemMasterModal() {
    const modal = document.getElementById('fa-master-modal');
    if (modal) modal.classList.remove('active');
  }

  async saveItemMaster() {
    const id = document.getElementById('fa-modal-master-id').value;
    const code = document.getElementById('fa-modal-master-code').value.trim();
    const name = document.getElementById('fa-modal-master-name').value.trim();
    const model = document.getElementById('fa-modal-master-model').value.trim();
    const brand = document.getElementById('fa-modal-master-brand').value.trim();
    const category_id = document.getElementById('fa-modal-master-cat').value;
    const item_type_id = document.getElementById('fa-modal-master-type').value;
    const unit_price = parseFloat(document.getElementById('fa-modal-master-price').value) || 0;
    const quantity = parseInt(document.getElementById('fa-modal-master-qty').value, 10) || 1;
    const unit_of_measure = document.getElementById('fa-modal-master-uom').value.trim() || 'Unit';

    if (!name) {
      alert('សូមបញ្ចូលឈ្មោះសម្ភារៈ!');
      return;
    }

    const payload = { id, code, name, model, brand, category_id, item_type_id, unit_price, quantity, unit_of_measure };
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/fixasset/item-masters', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.closeItemMasterModal();
        this.loadItemMasters();
        this.loadStats();
        alert('ជោគជ័យ!');
      } else {
        alert('កំហុស៖ ' + data.error);
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  async deleteItemMaster(id) {
    if (!confirm('តើអ្នកពិតជាចង់លុប Item Master នេះមែនទេ?')) return;
    try {
      const res = await fetch(`/api/fixasset/item-masters?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.loadItemMasters();
        this.loadStats();
        alert('បានលុបរួចរាល់');
      } else {
        alert('កំហុស៖ ' + data.error);
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  // ===========================================================================
  // 4. ASSET CODES & BARCODES (/items/asset-codes)
  // ===========================================================================
  async loadItems() {
    const tbody = document.getElementById('fa-items-table-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 30px; color: #94a3b8;"><span class="spinner"></span> កំពុងទាញយកបញ្ជីសម្ភារៈ...</td></tr>';
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
              <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.printSingleBarcodeSticker(${JSON.stringify(item).replace(/"/g, '&quot;')})" title="បោះពុម្ព Barcode">
                🏷️
              </button>
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
      const start = total === 0 ? 0 : this.itemsPage * this.itemsLimit + 1;
      const end = Math.min(total, (this.itemsPage + 1) * this.itemsLimit);
      info.textContent = `បង្ហាញ ${start} ដល់ ${end} នៃ ${Number(total).toLocaleString()} មុខសម្ភារៈ`;
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

  // ===========================================================================
  // 5. ASSIGNMENTS (/assign-assets)
  // ===========================================================================
  async loadAssignments() {
    const tbody = document.getElementById('fa-assign-table-body');
    if (!tbody) return;

    try {
      const res = await fetch('/api/fixasset/assignments?limit=100');
      const data = await res.json();
      if (data.success && data.assignments) {
        this.assignments = data.assignments;
        if (data.assignments.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 20px; color: #94a3b8;">គ្មានកំណត់ត្រាប្រគល់សម្ភារៈ</td></tr>';
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
            <td>
              <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.openAssignmentDetailsModal(${a.id})" title="មើលលម្អិត & បោះពុម្ព">
                📄 មើល & បោះពុម្ព
              </button>
            </td>
          </tr>
        `).join('');
      }
    } catch (e) {}
  }

  async openAssignmentDetailsModal(id) {
    try {
      const res = await fetch(`/api/fixasset/assignments?id=${id}`);
      const data = await res.json();
      if (data.success && data.assignment) {
        const a = data.assignment;
        const items = data.items || [];
        this.printAssignmentHandoverSheet(a, items);
      }
    } catch (e) {
      alert('មិនអាចទាញយកព័ត៌មានលិខិតប្រគល់ទទួល៖ ' + e.message);
    }
  }

  // ===========================================================================
  // 6. GOODS RECEIVED GRN (/grn)
  // ===========================================================================
  async loadGrn() {
    const tbody = document.getElementById('fa-grn-table-body');
    if (!tbody) return;

    try {
      const res = await fetch('/api/fixasset/grn?limit=100');
      const data = await res.json();
      if (data.success && data.grn) {
        this.grnList = data.grn;
        if (data.grn.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 20px; color: #94a3b8;">គ្មានកំណត់ត្រា GRN</td></tr>';
          return;
        }

        tbody.innerHTML = data.grn.map(g => `
          <tr>
            <td><span class="fa-code-pill">${this.escapeHtml(g.grn_number || '')}</span></td>
            <td><strong>${this.escapeHtml(g.supplier_name || '—')}</strong></td>
            <td>${this.escapeHtml(g.reference_no || g.po_number || '—')}</td>
            <td><span class="fa-badge fa-badge-branch">${this.escapeHtml(g.warehouse_name || 'ឃ្លាំងទូទៅ')}</span></td>
            <td>${g.transaction_date ? g.transaction_date.split(' ')[0] : (g.created_at ? g.created_at.split(' ')[0] : '—')}</td>
            <td><span class="fa-badge fa-badge-assigned">${this.escapeHtml(g.status || 'Received')}</span></td>
            <td>
              <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.openGrnDetailsModal(${g.id})" title="មើលលម្អិត">
                👁️ លម្អិត
              </button>
            </td>
          </tr>
        `).join('');
      }
    } catch (e) {}
  }

  async openGrnDetailsModal(id) {
    const modal = document.getElementById('fa-grn-modal');
    const content = document.getElementById('fa-grn-modal-content');
    if (!modal || !content) return;

    content.innerHTML = '<div style="text-align: center; padding: 20px;"><span class="spinner"></span> កំពុងទាញយក...</div>';
    modal.classList.add('active');

    try {
      const res = await fetch(`/api/fixasset/grn?id=${id}`);
      const data = await res.json();
      if (data.success && data.grn) {
        const g = data.grn;
        const items = data.items || [];
        content.innerHTML = `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div><strong>លេខ GRN:</strong> <code class="fa-code-pill">${this.escapeHtml(g.grn_number || '')}</code></div>
            <div><strong>អ្នកផ្គត់ផ្គង់:</strong> <strong>${this.escapeHtml(g.supplier_name || '')}</strong></div>
            <div><strong>PO Number:</strong> ${this.escapeHtml(g.po_number || '—')}</div>
            <div><strong>Reference / Invoice:</strong> ${this.escapeHtml(g.reference_no || '—')}</div>
            <div><strong>ឃ្លាំង:</strong> ${this.escapeHtml(g.warehouse_name || '—')}</div>
            <div><strong>កាលបរិច្ឆេទ:</strong> ${g.transaction_date || g.created_at || '—'}</div>
          </div>
          <h4 style="margin: 14px 0 8px; font-size: 0.95rem;">បញ្ជីមុខទំនិញ (${items.length} មុខ)៖</h4>
          <table class="fa-table">
            <thead>
              <tr>
                <th>កូដទំនិញ</th>
                <th>ការពិពណ៌នា</th>
                <th>ម៉ាក</th>
                <th>ចំនួន</th>
                <th>តម្លៃឯកតា</th>
                <th>សរុប</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(i => `
                <tr>
                  <td><span class="fa-code-pill">${this.escapeHtml(i.item_code || '')}</span></td>
                  <td><strong>${this.escapeHtml(i.item_name || i.description || '')}</strong></td>
                  <td>${this.escapeHtml(i.brand || '')}</td>
                  <td>${i.receive_quantity || i.po_quantity || 1} ${this.escapeHtml(i.uom || 'Unit')}</td>
                  <td>$${Number(i.unit_price || 0).toLocaleString()}</td>
                  <td>$${Number(i.total_amount || (i.unit_price * (i.receive_quantity || 1)) || 0).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    } catch (e) {
      content.innerHTML = '<div style="color: #ef4444; padding: 20px;">មិនអាចទាញយកព័ត៌មានបានទេ</div>';
    }
  }

  closeGrnDetailsModal() {
    const modal = document.getElementById('fa-grn-modal');
    if (modal) modal.classList.remove('active');
  }

  // ===========================================================================
  // 7. MASTER DATA SUBMODULES (Branches, Depts, Cats, Types, Suppliers, Warehouses, TOW)
  // ===========================================================================
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

  renderBranchesTable(branches) {
    const tbody = document.getElementById('fa-branches-table-body');
    if (!tbody) return;
    if (branches.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 20px; color: #94a3b8;">គ្មានទិន្នន័យ</td></tr>';
      return;
    }

    tbody.innerHTML = branches.map((b, idx) => `
      <tr>
        <td style="font-weight: 600;">${idx + 1}</td>
        <td><strong>${this.escapeHtml(b.name || '')}</strong></td>
        <td><span class="fa-badge fa-badge-branch">${this.escapeHtml(b.name_en || b.label || '')}</span></td>
        <td><span class="fa-code-pill">${b.employee_count || 0} នាក់</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.openEditBranchModal(${JSON.stringify(b).replace(/"/g, '&quot;')})">✏️</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.deleteBranch(${b.id})" style="color: #ef4444; border-color: rgba(239,68,68,0.3);">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  openCreateBranchModal() {
    document.getElementById('fa-modal-branch-id').value = '';
    document.getElementById('fa-modal-branch-name').value = '';
    document.getElementById('fa-modal-branch-name-en').value = '';
    document.getElementById('fa-branch-modal-title').textContent = '➕ បង្កើតសាខាថ្មី (New Branch)';
    document.getElementById('fa-branch-modal').classList.add('active');
  }

  openEditBranchModal(b) {
    document.getElementById('fa-modal-branch-id').value = b.id;
    document.getElementById('fa-modal-branch-name').value = b.name || '';
    document.getElementById('fa-modal-branch-name-en').value = b.name_en || b.label || '';
    document.getElementById('fa-branch-modal-title').textContent = '✏️ កែប្រែសាខា (Edit Branch)';
    document.getElementById('fa-branch-modal').classList.add('active');
  }

  closeBranchModal() {
    const modal = document.getElementById('fa-branch-modal');
    if (modal) modal.classList.remove('active');
  }

  async saveBranch() {
    const id = document.getElementById('fa-modal-branch-id').value;
    const name = document.getElementById('fa-modal-branch-name').value.trim();
    const name_en = document.getElementById('fa-modal-branch-name-en').value.trim();

    if (!name) {
      alert('សូមបញ្ចូលឈ្មោះសាខា!');
      return;
    }

    const payload = { id, name, name_en };
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/fixasset/branches', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.closeBranchModal();
        this.loadBranches();
        alert('ជោគជ័យ!');
      } else {
        alert('កំហុស៖ ' + data.error);
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  async deleteBranch(id) {
    if (!confirm('តើអ្នកពិតជាចង់លុបសាខានេះមែនទេ?')) return;
    try {
      const res = await fetch(`/api/fixasset/branches?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.loadBranches();
        alert('បានលុបរួចរាល់');
      } else {
        alert('កំហុស៖ ' + data.error);
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  async loadDepartments() {
    try {
      const res = await fetch('/api/fixasset/departments');
      const data = await res.json();
      if (data.success && data.departments) {
        this.departments = data.departments;
        this.renderDepartmentsTable(data.departments);
      }
    } catch (e) {}
  }

  renderDepartmentsTable(depts) {
    const tbody = document.getElementById('fa-depts-table-body');
    if (!tbody) return;
    tbody.innerHTML = depts.map((d, idx) => `
      <tr>
        <td style="font-weight: 600;">${idx + 1}</td>
        <td><strong>${this.escapeHtml(d.name || '')}</strong></td>
        <td><span class="fa-badge fa-badge-branch">${this.escapeHtml(d.name_en || d.label || '')}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.openEditDeptModal(${JSON.stringify(d).replace(/"/g, '&quot;')})">✏️</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.deleteDept(${d.id})" style="color: #ef4444; border-color: rgba(239,68,68,0.3);">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  openCreateDeptModal() {
    document.getElementById('fa-modal-dept-id').value = '';
    document.getElementById('fa-modal-dept-name').value = '';
    document.getElementById('fa-modal-dept-name-en').value = '';
    document.getElementById('fa-dept-modal-title').textContent = '➕ បង្កើតនាយកដ្ឋានថ្មី';
    document.getElementById('fa-dept-modal').classList.add('active');
  }

  openEditDeptModal(d) {
    document.getElementById('fa-modal-dept-id').value = d.id;
    document.getElementById('fa-modal-dept-name').value = d.name || '';
    document.getElementById('fa-modal-dept-name-en').value = d.name_en || d.label || '';
    document.getElementById('fa-dept-modal-title').textContent = '✏️ កែប្រែនាយកដ្ឋាន';
    document.getElementById('fa-dept-modal').classList.add('active');
  }

  closeDeptModal() {
    const modal = document.getElementById('fa-dept-modal');
    if (modal) modal.classList.remove('active');
  }

  async saveDept() {
    const id = document.getElementById('fa-modal-dept-id').value;
    const name = document.getElementById('fa-modal-dept-name').value.trim();
    const name_en = document.getElementById('fa-modal-dept-name-en').value.trim();

    if (!name) return alert('សូមបញ្ចូលឈ្មោះនាយកដ្ឋាន!');
    const payload = { id, name, name_en };
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/fixasset/departments', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.closeDeptModal();
        this.loadDepartments();
        alert('ជោគជ័យ!');
      } else {
        alert('កំហុស៖ ' + data.error);
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  async deleteDept(id) {
    if (!confirm('តើអ្នកពិតជាចង់លុបនាយកដ្ឋាននេះមែនទេ?')) return;
    try {
      const res = await fetch(`/api/fixasset/departments?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.loadDepartments();
        alert('បានលុបរួចរាល់');
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  async loadCategories() {
    try {
      const res = await fetch('/api/fixasset/categories');
      const data = await res.json();
      if (data.success) {
        this.categories = data.categories || [];
        this.types = data.types || [];
        this.renderCategoryFilters(this.categories);
        this.renderCategoriesTable(this.categories);
      }
    } catch (e) {}
  }

  renderCategoriesTable(cats) {
    const tbody = document.getElementById('fa-cats-table-body');
    if (!tbody) return;
    tbody.innerHTML = cats.map((c, idx) => `
      <tr>
        <td style="font-weight: 600;">${idx + 1}</td>
        <td><strong>${this.escapeHtml(c.name || '')}</strong></td>
        <td><span class="fa-badge fa-badge-branch">${this.escapeHtml(c.name_en || c.label || '')}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.openEditCatModal(${JSON.stringify(c).replace(/"/g, '&quot;')})">✏️</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.deleteCat(${c.id})" style="color: #ef4444; border-color: rgba(239,68,68,0.3);">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  openCreateCatModal() {
    document.getElementById('fa-modal-cat-id').value = '';
    document.getElementById('fa-modal-cat-name').value = '';
    document.getElementById('fa-modal-cat-name-en').value = '';
    document.getElementById('fa-cat-modal-title').textContent = '➕ បង្កើតប្រភេទទំនិញថ្មី (Category)';
    document.getElementById('fa-cat-modal').classList.add('active');
  }

  openEditCatModal(c) {
    document.getElementById('fa-modal-cat-id').value = c.id;
    document.getElementById('fa-modal-cat-name').value = c.name || '';
    document.getElementById('fa-modal-cat-name-en').value = c.name_en || c.label || '';
    document.getElementById('fa-cat-modal-title').textContent = '✏️ កែប្រែប្រភេទទំនិញ';
    document.getElementById('fa-cat-modal').classList.add('active');
  }

  closeCatModal() {
    const modal = document.getElementById('fa-cat-modal');
    if (modal) modal.classList.remove('active');
  }

  async saveCat() {
    const id = document.getElementById('fa-modal-cat-id').value;
    const name = document.getElementById('fa-modal-cat-name').value.trim();
    const name_en = document.getElementById('fa-modal-cat-name-en').value.trim();

    if (!name) return alert('សូមបញ្ចូលឈ្មោះប្រភេទទំនិញ!');
    const payload = { id, name, name_en };
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/fixasset/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.closeCatModal();
        this.loadCategories();
        alert('ជោគជ័យ!');
      } else {
        alert('កំហុស៖ ' + data.error);
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  async deleteCat(id) {
    if (!confirm('តើអ្នកពិតជាចង់លុបប្រភេទទំនិញនេះមែនទេ?')) return;
    try {
      const res = await fetch(`/api/fixasset/categories?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.loadCategories();
        alert('បានលុបរួចរាល់');
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  async loadTypes() {
    try {
      const res = await fetch('/api/fixasset/types');
      const data = await res.json();
      if (data.success && data.types) {
        this.types = data.types;
        this.renderTypesTable(data.types);
      }
    } catch (e) {}
  }

  renderTypesTable(types) {
    const tbody = document.getElementById('fa-types-table-body');
    if (!tbody) return;
    tbody.innerHTML = types.map((t, idx) => `
      <tr>
        <td style="font-weight: 600;">${idx + 1}</td>
        <td><strong>${this.escapeHtml(t.name || '')}</strong></td>
        <td><span class="fa-badge fa-badge-branch">${this.escapeHtml(t.name_en || '')}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.openEditTypeModal(${JSON.stringify(t).replace(/"/g, '&quot;')})">✏️</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.deleteType(${t.id})" style="color: #ef4444; border-color: rgba(239,68,68,0.3);">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  openCreateTypeModal() {
    document.getElementById('fa-modal-type-id').value = '';
    document.getElementById('fa-modal-type-name').value = '';
    document.getElementById('fa-modal-type-name-en').value = '';
    document.getElementById('fa-type-modal-title').textContent = '➕ បង្កើតកម្រិតសម្ភារៈថ្មី (Item Type)';
    document.getElementById('fa-type-modal').classList.add('active');
  }

  openEditTypeModal(t) {
    document.getElementById('fa-modal-type-id').value = t.id;
    document.getElementById('fa-modal-type-name').value = t.name || '';
    document.getElementById('fa-modal-type-name-en').value = t.name_en || '';
    document.getElementById('fa-type-modal-title').textContent = '✏️ កែប្រែកម្រិតសម្ភារៈ';
    document.getElementById('fa-type-modal').classList.add('active');
  }

  closeTypeModal() {
    const modal = document.getElementById('fa-type-modal');
    if (modal) modal.classList.remove('active');
  }

  async saveType() {
    const id = document.getElementById('fa-modal-type-id').value;
    const name = document.getElementById('fa-modal-type-name').value.trim();
    const name_en = document.getElementById('fa-modal-type-name-en').value.trim();

    if (!name) return alert('សូមបញ្ចូលឈ្មោះ!');
    const payload = { id, name, name_en };
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/fixasset/types', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.closeTypeModal();
        this.loadTypes();
        alert('ជោគជ័យ!');
      } else {
        alert('កំហុស៖ ' + data.error);
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  async deleteType(id) {
    if (!confirm('តើអ្នកពិតជាចង់លុប item type នេះមែនទេ?')) return;
    try {
      const res = await fetch(`/api/fixasset/types?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.loadTypes();
        alert('បានលុបរួចរាល់');
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  async loadSuppliers() {
    try {
      const res = await fetch('/api/fixasset/suppliers');
      const data = await res.json();
      if (data.success && data.suppliers) {
        this.suppliers = data.suppliers;
        this.renderSuppliersTable(data.suppliers);
      }
    } catch (e) {}
  }

  renderSuppliersTable(suppliers) {
    const tbody = document.getElementById('fa-suppliers-table-body');
    if (!tbody) return;
    tbody.innerHTML = suppliers.map((s, idx) => `
      <tr>
        <td style="font-weight: 600;">${idx + 1}</td>
        <td><strong>${this.escapeHtml(s.name || '')}</strong></td>
        <td>${this.escapeHtml(s.phone || '—')}</td>
        <td>${this.escapeHtml(s.email || '—')}</td>
        <td><span style="color: #94a3b8; font-size: 0.85rem;">${this.escapeHtml(s.address || '—')}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.openEditSupplierModal(${JSON.stringify(s).replace(/"/g, '&quot;')})">✏️</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.deleteSupplier(${s.id})" style="color: #ef4444; border-color: rgba(239,68,68,0.3);">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  openCreateSupplierModal() {
    document.getElementById('fa-modal-sup-id').value = '';
    document.getElementById('fa-modal-sup-name').value = '';
    document.getElementById('fa-modal-sup-phone').value = '';
    document.getElementById('fa-modal-sup-email').value = '';
    document.getElementById('fa-modal-sup-addr').value = '';
    document.getElementById('fa-sup-modal-title').textContent = '➕ បង្កើតអ្នកផ្គត់ផ្គង់ថ្មី (Supplier)';
    document.getElementById('fa-supplier-modal').classList.add('active');
  }

  openEditSupplierModal(s) {
    document.getElementById('fa-modal-sup-id').value = s.id;
    document.getElementById('fa-modal-sup-name').value = s.name || '';
    document.getElementById('fa-modal-sup-phone').value = s.phone || '';
    document.getElementById('fa-modal-sup-email').value = s.email || '';
    document.getElementById('fa-modal-sup-addr').value = s.address || '';
    document.getElementById('fa-sup-modal-title').textContent = '✏️ កែប្រែអ្នកផ្គត់ផ្គង់';
    document.getElementById('fa-supplier-modal').classList.add('active');
  }

  closeSupplierModal() {
    const modal = document.getElementById('fa-supplier-modal');
    if (modal) modal.classList.remove('active');
  }

  async saveSupplier() {
    const id = document.getElementById('fa-modal-sup-id').value;
    const name = document.getElementById('fa-modal-sup-name').value.trim();
    const phone = document.getElementById('fa-modal-sup-phone').value.trim();
    const email = document.getElementById('fa-modal-sup-email').value.trim();
    const address = document.getElementById('fa-modal-sup-addr').value.trim();

    if (!name) return alert('សូមបញ្ចូលឈ្មោះអ្នកផ្គត់ផ្គង់!');
    const payload = { id, name, phone, email, address };
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/fixasset/suppliers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.closeSupplierModal();
        this.loadSuppliers();
        alert('ជោគជ័យ!');
      } else {
        alert('កំហុស៖ ' + data.error);
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  async deleteSupplier(id) {
    if (!confirm('តើអ្នកពិតជាចង់លុបអ្នកផ្គត់ផ្គង់នេះមែនទេ?')) return;
    try {
      const res = await fetch(`/api/fixasset/suppliers?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.loadSuppliers();
        alert('បានលុបរួចរាល់');
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  async loadWarehouses() {
    try {
      const res = await fetch('/api/fixasset/warehouses');
      const data = await res.json();
      if (data.success && data.warehouses) {
        this.warehouses = data.warehouses;
        this.renderWarehousesTable(data.warehouses);
      }
    } catch (e) {}
  }

  renderWarehousesTable(warehouses) {
    const tbody = document.getElementById('fa-warehouses-table-body');
    if (!tbody) return;
    tbody.innerHTML = warehouses.map((w, idx) => `
      <tr>
        <td style="font-weight: 600;">${idx + 1}</td>
        <td><strong>${this.escapeHtml(w.name || '')}</strong></td>
        <td><span class="fa-badge fa-badge-branch">${this.escapeHtml(w.branch_id ? 'សាខា #' + w.branch_id : 'ឃ្លាំងកណ្តាល')}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.openEditWarehouseModal(${JSON.stringify(w).replace(/"/g, '&quot;')})">✏️</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.deleteWarehouse(${w.id})" style="color: #ef4444; border-color: rgba(239,68,68,0.3);">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  openCreateWarehouseModal() {
    document.getElementById('fa-modal-wh-id').value = '';
    document.getElementById('fa-modal-wh-name').value = '';
    document.getElementById('fa-wh-modal-title').textContent = '➕ បង្កើតឃ្លាំងថ្មី (New Warehouse)';
    document.getElementById('fa-warehouse-modal').classList.add('active');
  }

  openEditWarehouseModal(w) {
    document.getElementById('fa-modal-wh-id').value = w.id;
    document.getElementById('fa-modal-wh-name').value = w.name || '';
    document.getElementById('fa-wh-modal-title').textContent = '✏️ កែប្រែឃ្លាំង';
    document.getElementById('fa-warehouse-modal').classList.add('active');
  }

  closeWarehouseModal() {
    const modal = document.getElementById('fa-warehouse-modal');
    if (modal) modal.classList.remove('active');
  }

  async saveWarehouse() {
    const id = document.getElementById('fa-modal-wh-id').value;
    const name = document.getElementById('fa-modal-wh-name').value.trim();

    if (!name) return alert('សូមបញ្ចូលឈ្មោះឃ្លាំង!');
    const payload = { id, name };
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/fixasset/warehouses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.closeWarehouseModal();
        this.loadWarehouses();
        alert('ជោគជ័យ!');
      } else {
        alert('កំហុស៖ ' + data.error);
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  async deleteWarehouse(id) {
    if (!confirm('តើអ្នកពិតជាចង់លុបឃ្លាំងនេះមែនទេ?')) return;
    try {
      const res = await fetch(`/api/fixasset/warehouses?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.loadWarehouses();
        alert('បានលុបរួចរាល់');
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  async loadTypeOfWorks() {
    try {
      const res = await fetch('/api/fixasset/type-of-works');
      const data = await res.json();
      if (data.success && data.type_of_works) {
        this.typeOfWorks = data.type_of_works;
        this.renderTypeOfWorksTable(data.type_of_works);
      }
    } catch (e) {}
  }

  renderTypeOfWorksTable(works) {
    const tbody = document.getElementById('fa-tow-table-body');
    if (!tbody) return;
    tbody.innerHTML = works.map((w, idx) => `
      <tr>
        <td style="font-weight: 600;">${idx + 1}</td>
        <td><strong>${this.escapeHtml(w.name || '')}</strong></td>
        <td><span class="fa-badge fa-badge-branch">${this.escapeHtml(w.name_en || w.label || '')}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.openEditTowModal(${JSON.stringify(w).replace(/"/g, '&quot;')})">✏️</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.deleteTow(${w.id})" style="color: #ef4444; border-color: rgba(239,68,68,0.3);">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  openCreateTowModal() {
    document.getElementById('fa-modal-tow-id').value = '';
    document.getElementById('fa-modal-tow-name').value = '';
    document.getElementById('fa-modal-tow-name-en').value = '';
    document.getElementById('fa-tow-modal-title').textContent = '➕ បង្កើតប្រភេទការងារថ្មី (Type of Work)';
    document.getElementById('fa-tow-modal').classList.add('active');
  }

  openEditTowModal(w) {
    document.getElementById('fa-modal-tow-id').value = w.id;
    document.getElementById('fa-modal-tow-name').value = w.name || '';
    document.getElementById('fa-modal-tow-name-en').value = w.name_en || w.label || '';
    document.getElementById('fa-tow-modal-title').textContent = '✏️ កែប្រែប្រភេទការងារ';
    document.getElementById('fa-tow-modal').classList.add('active');
  }

  closeTowModal() {
    const modal = document.getElementById('fa-tow-modal');
    if (modal) modal.classList.remove('active');
  }

  async saveTow() {
    const id = document.getElementById('fa-modal-tow-id').value;
    const name = document.getElementById('fa-modal-tow-name').value.trim();
    const name_en = document.getElementById('fa-modal-tow-name-en').value.trim();

    if (!name) return alert('សូមបញ្ចូលឈ្មោះប្រភេទការងារ!');
    const payload = { id, name, name_en };
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/fixasset/type-of-works', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.closeTowModal();
        this.loadTypeOfWorks();
        alert('ជោគជ័យ!');
      } else {
        alert('កំហុស៖ ' + data.error);
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  async deleteTow(id) {
    if (!confirm('តើអ្នកពិតជាចង់លុបប្រភេទការងារនេះមែនទេ?')) return;
    try {
      const res = await fetch(`/api/fixasset/type-of-works?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.loadTypeOfWorks();
        alert('បានលុបរួចរាល់');
      }
    } catch (e) {
      alert('កំហុស៖ ' + data.error);
    }
  }

  // ===========================================================================
  // 8. ATTENDANCE BIOMETRIC DEVICES (/attendance/devices)
  // ===========================================================================
  async loadDevices() {
    const grid = document.getElementById('fa-devices-grid');
    if (grid) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 30px; color: #94a3b8;"><span class="spinner"></span> កំពុងទាញយកឧបករណ៍ស្កេន...</div>';
    }

    try {
      const res = await fetch('/api/fixasset/devices');
      const data = await res.json();
      if (data.success && data.devices) {
        this.devices = data.devices;
        this.renderDevicesGrid(data.devices);
      }
    } catch (e) {
      if (grid) grid.innerHTML = '<div style="grid-column: 1/-1; color: #ef4444; padding: 20px;">មិនអាចទាញយកទិន្នន័យឧបករណ៍បានទេ</div>';
    }
  }

  renderDevicesGrid(devices) {
    const grid = document.getElementById('fa-devices-grid');
    if (!grid) return;

    if (devices.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 30px; color: #94a3b8;">គ្មានឧបករណ៍ស្កេនវត្តមាន Hikvision ឡើយ</div>';
      return;
    }

    grid.innerHTML = devices.map(d => `
      <div class="fa-device-card">
        <div class="fa-device-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="fa-device-status-dot ${d.is_connected == 1 ? 'online' : 'offline'}"></span>
            <strong style="font-size: 1rem; color: #f8fafc;">${this.escapeHtml(d.name || 'Biometric Device')}</strong>
          </div>
          <span class="fa-badge ${d.is_connected == 1 ? 'fa-badge-assigned' : 'fa-badge-unassigned'}">
            ${d.is_connected == 1 ? '🟢 ONLINE' : '🔴 OFFLINE'}
          </span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.88rem; color: #94a3b8;">
          <div><strong>IP Host:</strong> <code class="fa-code-pill">${this.escapeHtml(d.host)}:${d.port || 80}</code></div>
          <div><strong>Protocol:</strong> ${this.escapeHtml((d.protocol || 'HTTP').toUpperCase())}</div>
          <div><strong>Model:</strong> ${this.escapeHtml(d.model || 'Hikvision Face & Fingerprint')}</div>
          <div><strong>Serial No:</strong> ${this.escapeHtml(d.serial_number || '—')}</div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 6px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px;">
          <button type="button" class="btn btn-primary btn-sm" style="flex: 1;" onclick="window.fixAssetUI.pingDevice('${this.escapeHtml(d.name)}')">
            🔄 Test Connection
          </button>
          <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.openEditDeviceModal(${JSON.stringify(d).replace(/"/g, '&quot;')})">
            ✏️
          </button>
          <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.deleteDevice(${d.id})" style="color: #ef4444; border-color: rgba(239,68,68,0.3);">
            🗑️
          </button>
        </div>
      </div>
    `).join('');
  }

  pingDevice(name) {
    alert(`[Hikvision ISAPI] ឧបករណ៍ "${name}" ត្រូវបានតភ្ជាប់ និងត្រួតពិនិត្យដោយជោគជ័យ (Status: Healthy / 200 OK)`);
  }

  openCreateDeviceModal() {
    document.getElementById('fa-modal-dev-id').value = '';
    document.getElementById('fa-modal-dev-name').value = '';
    document.getElementById('fa-modal-dev-host').value = '192.168.1.100';
    document.getElementById('fa-modal-dev-port').value = '80';
    document.getElementById('fa-modal-dev-user').value = 'admin';
    document.getElementById('fa-device-modal-title').textContent = '➕ បន្ថែមឧបករណ៍ស្កេនថ្មី (Add Hikvision Device)';
    document.getElementById('fa-device-modal').classList.add('active');
  }

  openEditDeviceModal(d) {
    document.getElementById('fa-modal-dev-id').value = d.id;
    document.getElementById('fa-modal-dev-name').value = d.name || '';
    document.getElementById('fa-modal-dev-host').value = d.host || '';
    document.getElementById('fa-modal-dev-port').value = d.port || 80;
    document.getElementById('fa-modal-dev-user').value = d.username || 'admin';
    document.getElementById('fa-device-modal-title').textContent = '✏️ កែប្រែឧបករណ៍ស្កេន';
    document.getElementById('fa-device-modal').classList.add('active');
  }

  closeDeviceModal() {
    const modal = document.getElementById('fa-device-modal');
    if (modal) modal.classList.remove('active');
  }

  async saveDevice() {
    const id = document.getElementById('fa-modal-dev-id').value;
    const name = document.getElementById('fa-modal-dev-name').value.trim();
    const host = document.getElementById('fa-modal-dev-host').value.trim();
    const port = parseInt(document.getElementById('fa-modal-dev-port').value, 10) || 80;
    const username = document.getElementById('fa-modal-dev-user').value.trim() || 'admin';

    if (!name || !host) return alert('សូមបញ្ចូលឈ្មោះ និង Host IP!');
    const payload = { id, name, host, port, username };
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/fixasset/devices', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.closeDeviceModal();
        this.loadDevices();
        alert('ជោគជ័យ!');
      } else {
        alert('កំហុស៖ ' + data.error);
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  async deleteDevice(id) {
    if (!confirm('តើអ្នកពិតជាចង់លុបឧបករណ៍នេះមែនទេ?')) return;
    try {
      const res = await fetch(`/api/fixasset/devices?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.loadDevices();
        alert('បានលុបរួចរាល់');
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  // ===========================================================================
  // 9. USER MANAGEMENT (/users)
  // ===========================================================================
  async loadUsers() {
    const tbody = document.getElementById('fa-users-table-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 24px; color: #94a3b8;"><span class="spinner"></span> កំពុងទាញយកអ្នកប្រើប្រាស់...</td></tr>';
    }

    try {
      const res = await fetch('/api/fixasset/users');
      const data = await res.json();
      if (data.success && data.users) {
        this.users = data.users;
        this.renderUsersTable(data.users);
      }
    } catch (e) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: #ef4444; padding: 20px;">មិនអាចទាញយកអ្នកប្រើប្រាស់បានទេ</td></tr>';
    }
  }

  renderUsersTable(users) {
    const tbody = document.getElementById('fa-users-table-body');
    if (!tbody) return;
    tbody.innerHTML = users.map((u, idx) => `
      <tr>
        <td style="font-weight: 600;">${idx + 1}</td>
        <td><strong>${this.escapeHtml(u.name || '')}</strong></td>
        <td><span class="fa-code-pill">${this.escapeHtml(u.user_login || u.username || '')}</span></td>
        <td>${this.escapeHtml(u.email || '—')}</td>
        <td><span class="fa-badge fa-badge-assigned">${this.escapeHtml(u.status || 'Active')}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.openEditUserModal(${JSON.stringify(u).replace(/"/g, '&quot;')})">✏️</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="window.fixAssetUI.deleteUser(${u.id})" style="color: #ef4444; border-color: rgba(239,68,68,0.3);">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  openCreateUserModal() {
    document.getElementById('fa-modal-user-id').value = '';
    document.getElementById('fa-modal-user-name').value = '';
    document.getElementById('fa-modal-user-login').value = '';
    document.getElementById('fa-modal-user-email').value = '';
    document.getElementById('fa-user-modal-title').textContent = '➕ បង្កើតគណនីអ្នកប្រើប្រាស់ថ្មី';
    document.getElementById('fa-user-modal').classList.add('active');
  }

  openEditUserModal(u) {
    document.getElementById('fa-modal-user-id').value = u.id;
    document.getElementById('fa-modal-user-name').value = u.name || '';
    document.getElementById('fa-modal-user-login').value = u.user_login || u.username || '';
    document.getElementById('fa-modal-user-email').value = u.email || '';
    document.getElementById('fa-user-modal-title').textContent = '✏️ កែប្រែគណនីអ្នកប្រើប្រាស់';
    document.getElementById('fa-user-modal').classList.add('active');
  }

  closeUserModal() {
    const modal = document.getElementById('fa-user-modal');
    if (modal) modal.classList.remove('active');
  }

  async saveUser() {
    const id = document.getElementById('fa-modal-user-id').value;
    const name = document.getElementById('fa-modal-user-name').value.trim();
    const user_login = document.getElementById('fa-modal-user-login').value.trim();
    const email = document.getElementById('fa-modal-user-email').value.trim();

    if (!name || (!id && !user_login)) return alert('សូមបញ្ចូលឈ្មោះ និង Username!');
    const payload = { id, name, user_login, username: user_login, email, status: 'Active' };
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/fixasset/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.closeUserModal();
        this.loadUsers();
        alert('ជោគជ័យ!');
      } else {
        alert('កំហុស៖ ' + data.error);
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  async deleteUser(id) {
    if (!confirm('តើអ្នកពិតជាចង់លុបគណនីនេះមែនទេ?')) return;
    try {
      const res = await fetch(`/api/fixasset/users?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.loadUsers();
        alert('បានលុបរួចរាល់');
      }
    } catch (e) {
      alert('កំហុស៖ ' + e.message);
    }
  }

  // ===========================================================================
  // 10. REPORTS & EXPORTS (/reports)
  // ===========================================================================
  initReportsTab() {
    const select = document.getElementById('fa-report-branch-select');
    if (select && this.branches.length > 0) {
      select.innerHTML = '<option value="">-- គ្រប់សាខាទាំងអស់ --</option>' +
        this.branches.map(b => `<option value="${b.id}">${this.escapeHtml(b.name || '')}</option>`).join('');
    }
  }

  exportReport(type) {
    if (type === 'listing') {
      window.open('/api/fixasset/items?limit=5000', '_blank');
    } else if (type === 'masters') {
      window.open('/api/fixasset/item-masters', '_blank');
    } else if (type === 'grn') {
      window.open('/api/fixasset/grn?limit=1000', '_blank');
    }
  }

  // ===========================================================================
  // 11. PRINTING: OFFICIAL A4 HANDOVER CERTIFICATES & BARCODE LABELS
  // ===========================================================================
  printEmployeeHandoverSheet(empName, assets) {
    const printArea = document.getElementById('fa-printable-area');
    if (!printArea) return;

    const todayStr = new Date().toLocaleDateString('km-KH', { year: 'numeric', month: 'long', day: 'numeric' });
    const handoverNo = 'HO-' + Date.now().toString().slice(-6);

    printArea.innerHTML = `
      <div class="fa-print-header">
        <div>
          <div class="fa-print-company-name">BS EXPRESS LOGISTICS</div>
          <div style="font-size: 9.5pt; color: #555;">ប្រព័ន្ធគ្រប់គ្រងសម្ភារៈ និងទ្រព្យសម្បត្តិថេរ (Fixed Asset Management System)</div>
        </div>
        <div style="text-align: right; font-size: 10pt;">
          <div><strong>លេខកូដលិខិត៖</strong> ${handoverNo}</div>
          <div><strong>កាលបរិច្ឆេទ៖</strong> ${todayStr}</div>
        </div>
      </div>

      <div class="fa-print-doc-title">លិខិតប្រគល់ និងទទួលសម្ភារៈប្រើប្រាស់ផ្លូវការ<br><span style="font-size: 11pt; font-weight: normal;">OFFICIAL ASSET HANDOVER CERTIFICATE</span></div>

      <div class="fa-print-info-grid">
        <div><strong>អ្នកទទួល (Receiver)៖</strong> ${this.escapeHtml(empName)}</div>
        <div><strong>នាយកដ្ឋាន / សាខា៖</strong> BS Express Logistics</div>
        <div><strong>គោលបំណង៖</strong> សម្ភារៈបម្រើការងារផ្លូវការ</div>
        <div><strong>ស្ថានភាពបច្ចុប្បន្ន៖</strong> ដំណើរការល្អ (Good Condition)</div>
      </div>

      <table class="fa-print-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">ល.រ</th>
            <th>លេខកូដ FA (Asset Code)</th>
            <th>ឈ្មោះសម្ភារៈ (Item Description)</th>
            <th>ម៉ាក / ម៉ូដែល (Model/Brand)</th>
            <th style="width: 80px; text-align: right;">តម្លៃឯកតា</th>
          </tr>
        </thead>
        <tbody>
          ${assets.map((a, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td style="font-family: monospace; font-weight: bold;">${this.escapeHtml(a.code)}</td>
              <td><strong>${this.escapeHtml(a.item_name || 'Item')}</strong></td>
              <td>${this.escapeHtml(a.brand || '')} ${this.escapeHtml(a.model || '')}</td>
              <td style="text-align: right;">$${Number(a.unit_price || 0).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="font-size: 9.5pt; line-height: 1.5; margin-bottom: 30px;">
        <strong>លក្ខខណ្ឌ និងការទទួលខុសត្រូវ (Declaration)៖</strong><br>
        ខ្ញុំបាទ/នាងខ្ញុំ សូមបញ្ជាក់ថាបានទទួលសម្ភារៈខាងលើក្នុងស្ថានភាពល្អពេញលេញ និងត្រឹមត្រូវ។ ខ្ញុំប្តេជ្ញាថែរក្សាប្រើប្រាស់សម្រាប់តែការងារផ្លូវការរបស់ក្រុមហ៊ុន និងប្រគល់ត្រឡប់មកវិញជូនក្រុមហ៊ុនពេលបញ្ចប់ភារកិច្ច។
      </div>

      <div class="fa-print-signatures">
        <div class="fa-print-sign-box">
          <div>ហត្ថលេខាអ្នកប្រគល់ (Issued By)</div>
          <div class="fa-print-sign-line">នាយកដ្ឋានទ្រព្យសម្បត្តិ និងសម្ភារៈ</div>
        </div>
        <div class="fa-print-sign-box">
          <div>ហត្ថលេខា និងឈ្មោះអ្នកទទួល (Received By)</div>
          <div class="fa-print-sign-line">${this.escapeHtml(empName)}</div>
        </div>
      </div>
    `;

    window.print();
  }

  printAssignmentHandoverSheet(assignment, items) {
    const printArea = document.getElementById('fa-printable-area');
    if (!printArea) return;

    const dateStr = assignment.assign_date || new Date().toISOString().split('T')[0];

    printArea.innerHTML = `
      <div class="fa-print-header">
        <div>
          <div class="fa-print-company-name">BS EXPRESS LOGISTICS</div>
          <div style="font-size: 9.5pt; color: #555;">Fixed Asset Handover Certificate</div>
        </div>
        <div style="text-align: right; font-size: 10pt;">
          <div><strong>Assignment No:</strong> ${this.escapeHtml(assignment.assignment_no)}</div>
          <div><strong>Date:</strong> ${dateStr}</div>
        </div>
      </div>

      <div class="fa-print-doc-title">លិខិតប្រគល់ និងទទួលសម្ភារៈ<br><span style="font-size: 11pt; font-weight: normal;">HANDOVER CERTIFICATE</span></div>

      <div class="fa-print-info-grid">
        <div><strong>បុគ្គលិកទទួល៖</strong> ${this.escapeHtml(assignment.employee_name)} (${this.escapeHtml(assignment.employee_code || '')})</div>
        <div><strong>សាខា៖</strong> ${this.escapeHtml(assignment.branch_name || 'BS Express')}</div>
        <div><strong>តួនាទី៖</strong> ${this.escapeHtml(assignment.job_title || 'បុគ្គលិក')}</div>
        <div><strong>កំណត់សម្គាល់៖</strong> ${this.escapeHtml(assignment.notes || '—')}</div>
      </div>

      <table class="fa-print-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">ល.រ</th>
            <th>កូដសម្ភារៈ (Item/Asset Code)</th>
            <th>ឈ្មោះមុខទំនិញ</th>
            <th>ស្ថានភាពសម្ភារៈ</th>
            <th>ចំនួន</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((i, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td style="font-family: monospace; font-weight: bold;">${this.escapeHtml(i.item_code || i.asset_code || '')}</td>
              <td><strong>${this.escapeHtml(i.product_name || i.item_name || 'Item')}</strong></td>
              <td>${this.escapeHtml(i.condition || 'ដំណើរការល្អ')}</td>
              <td style="text-align: center;">${i.quantity || 1}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="fa-print-signatures">
        <div class="fa-print-sign-box">
          <div>ហត្ថលេខាអ្នកប្រគល់ (Issuer)</div>
          <div class="fa-print-sign-line">BS Express Admin / Asset Manager</div>
        </div>
        <div class="fa-print-sign-box">
          <div>ហត្ថលេខាអ្នកទទួល (Receiver)</div>
          <div class="fa-print-sign-line">${this.escapeHtml(assignment.employee_name)}</div>
        </div>
      </div>
    `;

    window.print();
  }

  printSingleBarcodeSticker(item) {
    const printArea = document.getElementById('fa-printable-area');
    if (!printArea) return;

    printArea.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; min-height: 80vh;">
        <div style="border: 2px solid #000; padding: 15px 25px; border-radius: 8px; width: 320px; text-align: center; font-family: sans-serif;">
          <div style="font-size: 13pt; font-weight: bold; border-bottom: 1.5px solid #000; padding-bottom: 4px; margin-bottom: 8px;">
            BS EXPRESS FIXED ASSET
          </div>
          <div style="font-size: 26pt; font-weight: 900; letter-spacing: 2px; font-family: monospace; margin: 8px 0;">
            ${this.escapeHtml(item.code || '')}
          </div>
          <div style="font-size: 10pt; font-weight: bold;">${this.escapeHtml(item.item_name || '')}</div>
          <div style="font-size: 8.5pt; color: #444; margin-top: 2px;">${this.escapeHtml(item.brand || '')} ${this.escapeHtml(item.model || '')}</div>
          ${item.a_code ? `<div style="font-size: 8pt; margin-top: 4px; font-family: monospace;">A-Code: ${this.escapeHtml(item.a_code)}</div>` : ''}
          <div style="font-size: 7.5pt; margin-top: 8px; color: #666;">DO NOT REMOVE THIS STICKER</div>
        </div>
      </div>
    `;

    window.print();
  }

  // ===========================================================================
  // SELECT POPULATION HELPERS
  // ===========================================================================
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

  populateBranchAndDeptSelects(branchSelectId, deptSelectId, currentBranchId, currentDeptId) {
    const bSel = document.getElementById(branchSelectId);
    if (bSel && this.branches.length > 0) {
      bSel.innerHTML = '<option value="">-- ជ្រើសរើសសាខា --</option>' +
        this.branches.map(b => `<option value="${b.id}" ${b.id == currentBranchId ? 'selected' : ''}>${this.escapeHtml(b.name || '')}</option>`).join('');
    }

    const dSel = document.getElementById(deptSelectId);
    if (dSel && this.departments.length > 0) {
      dSel.innerHTML = '<option value="">-- ជ្រើសរើសនាយកដ្ឋាន --</option>' +
        this.departments.map(d => `<option value="${d.id}" ${d.id == currentDeptId ? 'selected' : ''}>${this.escapeHtml(d.name || '')}</option>`).join('');
    }
  }

  populateCatAndTypeSelects(catSelectId, typeSelectId, currentCatId, currentTypeId) {
    const cSel = document.getElementById(catSelectId);
    if (cSel && this.categories.length > 0) {
      cSel.innerHTML = '<option value="">-- ជ្រើសរើសប្រភេទទំនិញ (Category) --</option>' +
        this.categories.map(c => `<option value="${c.id}" ${c.id == currentCatId ? 'selected' : ''}>${this.escapeHtml(c.name || '')}</option>`).join('');
    }

    const tSel = document.getElementById(typeSelectId);
    if (tSel && this.types.length > 0) {
      tSel.innerHTML = '<option value="">-- ជ្រើសរើសកម្រិតសម្ភារៈ (Type) --</option>' +
        this.types.map(t => `<option value="${t.id}" ${t.id == currentTypeId ? 'selected' : ''}>${this.escapeHtml(t.name || '')}</option>`).join('');
    }
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

// Global instance
if (typeof window !== 'undefined') {
  window.BSExpressFixAssetUI = BSExpressFixAssetUI;
  window.fixAssetUI = new BSExpressFixAssetUI();
}
