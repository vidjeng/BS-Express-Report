/**
 * BS Express Daily Report System - Main Application Orchestrator
 * Universal script support for Google Chrome local files and servers
 */

(() => {
  const Storage = (typeof window !== 'undefined' && window.Storage) ? window.Storage : null;
  const SAMPLE_REPORT = (typeof window !== 'undefined' && window.SAMPLE_REPORT) ? window.SAMPLE_REPORT : {};
  const BRANCH_LIST = (typeof window !== 'undefined' && window.BRANCH_LIST) ? window.BRANCH_LIST : [];
  const WatermarkUtil = (typeof window !== 'undefined' && window.WatermarkUtil) ? window.WatermarkUtil : {};
  const ExportUtil = (typeof window !== 'undefined' && window.ExportUtil) ? window.ExportUtil : {};
  const translations = (typeof window !== 'undefined' && window.translations) ? window.translations : {};

  class BSExpressApp {
  constructor() {
    this.currentLang = 'km';
    this.currentUser = null;
    this.currentReport = { ...SAMPLE_REPORT };
    this.openingPhotos = [];
    this.closingPhotos = [];
    this.activeTab = 'form-tab';

    this.init();
  }

  init() {
    this.initLang();
    this.initTheme();
    this.initAuth();
    this.populateBranchDropdowns();
    this.bindEvents();
    this.bindAuthEvents();
    this.loadCurrentFormData(this.currentReport);
    this.updateLivePreview();
    this.renderReportsTable();
    this.updateStats();
    this.startClock();
    this.applyTranslations();
  }

  initLang() {
    this.currentLang = localStorage.getItem('bs_express_lang') || 'km';
    document.documentElement.setAttribute('lang', this.currentLang);
    this.updateLangButtons();
  }

  setLanguage(lang) {
    if (lang !== 'km' && lang !== 'en') return;
    this.currentLang = lang;
    localStorage.setItem('bs_express_lang', lang);
    document.documentElement.setAttribute('lang', lang);
    if (lang === 'en') {
      document.title = 'BS Express - Daily Branch Work Report';
    } else {
      document.title = 'BS Express - របាយការណ៍ការងារប្រចាំថ្ងៃ';
    }
    this.updateLangButtons();
    this.applyTranslations();
    this.updateLivePreview();
    this.renderReportsTable();
    this.showToast(this.t('toastLangSwitched'), 'success');
  }

  updateLangButtons() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === this.currentLang);
    });
  }

  t(key) {
    const dict = translations[this.currentLang] || translations.km;
    return dict[key] || key;
  }

  applyTranslations() {
    const dict = translations[this.currentLang] || translations.km;

    // Text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    // Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (dict[key]) {
        el.placeholder = dict[key];
      }
    });

    // Tooltips / Titles
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.dataset.i18nTitle;
      if (dict[key]) {
        el.title = dict[key];
      }
    });
  }

  initTheme() {
    const savedTheme = localStorage.getItem('bs_express_theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('bs_express_theme', newTheme);
    this.showToast(newTheme === 'dark' ? this.t('toastDarkMode') : this.t('toastLightMode'), 'primary');
  }

  startClock() {
    const updateTime = () => {
      const clockEl = document.getElementById('live-time-display');
      if (clockEl) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        clockEl.textContent = timeStr;
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  populateBranchDropdowns() {
    const branchSelect = document.getElementById('form-branch');
    const sidebarBranchSelect = document.getElementById('sidebar-branch-select');
    const filterBranch = document.getElementById('filter-branch');
    const regBranchSelect = document.getElementById('reg-branch');

    const allBranches = ['ការិយាល័យកណ្តាល (HQ)', ...BRANCH_LIST];

    const populateSelect = (el) => {
      if (!el) return;
      el.innerHTML = '';
      allBranches.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        if (b === 'ក្រចេះ') opt.selected = true;
        el.appendChild(opt);
      });
    };

    populateSelect(regBranchSelect);
    populateSelect(document.getElementById('screen-reg-branch'));
    populateSelect(document.getElementById('admin-add-branch'));

    if (!branchSelect) return;

    // Preserve existing options or fill with standard branches
    BRANCH_LIST.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b;
      branchSelect.appendChild(opt);

      if (sidebarBranchSelect) {
        const optSidebar = document.createElement('option');
        optSidebar.value = b;
        optSidebar.textContent = b;
        sidebarBranchSelect.appendChild(optSidebar);
      }

      if (filterBranch) {
        const optFilter = document.createElement('option');
        optFilter.value = b;
        optFilter.textContent = b;
        filterBranch.appendChild(optFilter);
      }
    });

    if (sidebarBranchSelect) {
      sidebarBranchSelect.addEventListener('change', (e) => {
        branchSelect.value = e.target.value;
        this.syncFormToReport();
        this.updateLivePreview();
      });
    }
  }

  bindEvents() {
    // Tab Navigation (Supports sidebar items & top nav items)
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.dataset.tab;
        this.switchTab(targetTab);
      });
    });

    // Form Input Change Listeners for Live Preview Sync
    const form = document.getElementById('report-form');
    if (form) {
      form.addEventListener('input', () => {
        this.syncFormToReport();
        this.updateLivePreview();
      });

      form.addEventListener('change', () => {
        this.syncFormToReport();
        this.updateLivePreview();
      });
    }

    // Quick tag chips click
    document.querySelectorAll('.quick-tag').forEach(tag => {
      tag.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target;
        const text = e.currentTarget.textContent;
        const targetInput = document.getElementById(targetId);
        if (targetInput) {
          if (targetInput.value) {
            targetInput.value += ' ' + text;
          } else {
            targetInput.value = text;
          }
          this.syncFormToReport();
          this.updateLivePreview();
          this.showToast(this.t('toastQuickAdd'), 'success');
        }
      });
    });

    // Language Switcher (KM / EN)
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const lang = e.currentTarget.dataset.lang;
        this.setLanguage(lang);
      });
    });

    // Theme toggle button
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Action Buttons
    document.getElementById('btn-load-sample')?.addEventListener('click', () => {
      this.loadSampleData();
    });

    document.getElementById('btn-save-report')?.addEventListener('click', () => {
      this.saveCurrentReport();
    });

    document.getElementById('btn-reset-form')?.addEventListener('click', () => {
      this.resetForm();
    });

    document.getElementById('btn-print-doc')?.addEventListener('click', () => {
      ExportUtil.printReport();
    });

    document.getElementById('btn-copy-telegram')?.addEventListener('click', () => {
      this.openTelegramModal();
    });

    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      const reports = Storage.getReports();
      ExportUtil.exportToCsv(reports);
      this.showToast(this.t('toastExportedCsv'), 'success');
    });

    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      Storage.exportAllAsJson();
      this.showToast(this.t('toastBackupJson'), 'success');
    });

    // Photo Uploads with Timestamp Watermark
    this.setupPhotoUploader('opening-photo-input', 'opening-photo-preview', 'opening');
    this.setupPhotoUploader('closing-photo-input', 'closing-photo-preview', 'closing');

    // Table Search & Filter
    document.getElementById('search-reports')?.addEventListener('input', () => this.renderReportsTable());
    document.getElementById('filter-branch')?.addEventListener('change', () => this.renderReportsTable());
    document.getElementById('filter-date')?.addEventListener('change', () => this.renderReportsTable());

    // Telegram Modal actions
    document.getElementById('btn-modal-copy-tg')?.addEventListener('click', () => {
      const text = document.getElementById('telegram-content').textContent;
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('បានចម្លងអត្ថបទសម្រាប់ Telegram រួចរាល់!', 'success');
        this.closeModal('telegram-modal');
      });
    });

    // Stepwise Wizard Next & Previous Buttons
    document.querySelectorAll('.btn-wizard-next').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const nextStep = parseInt(e.currentTarget.dataset.next);
        this.goToStep(nextStep);
      });
    });

    document.querySelectorAll('.btn-wizard-prev').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prevStep = parseInt(e.currentTarget.dataset.prev);
        this.goToStep(prevStep);
      });
    });

    // Stepperize Step Item Click
    document.querySelectorAll('.stepperize-step-item, .step-node').forEach(node => {
      node.addEventListener('click', (e) => {
        const stepNum = parseInt(e.currentTarget.dataset.step);
        this.goToStep(stepNum);
      });
    });

    // Close Modals
    document.querySelectorAll('.modal-close-btn, .modal-close-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      });
    });
  }

  goToStep(stepNum) {
    if (stepNum < 1 || stepNum > 5) return;
    this.currentStep = stepNum;

    // Update Stepperize Progress Header & Bar
    const percent = stepNum * 20;
    const currentLabel = document.getElementById('stepperize-current-label');
    const percentLabel = document.getElementById('stepperize-percent-label');
    const progressBar = document.getElementById('stepperize-progress-bar');

    const currentTextTemplate = this.t('stepStatusCurrent');
    const percentTextTemplate = this.t('stepStatusPercent');

    if (currentTextTemplate && currentLabel) {
      currentLabel.textContent = currentTextTemplate.replace(/\d+/, String(stepNum));
    }
    if (percentTextTemplate && percentLabel) {
      percentLabel.textContent = percentTextTemplate.replace(/\d+%/, `${percent}%`);
    }
    if (progressBar) progressBar.style.width = `${percent}%`;

    // Update Step Items in Stepperize Bar
    document.querySelectorAll('.stepperize-step-item, .step-node').forEach(node => {
      const s = parseInt(node.dataset.step);
      node.classList.toggle('active', s === stepNum);
      node.classList.toggle('completed', s < stepNum);
    });

    // Show Active Step Pane
    document.querySelectorAll('.step-pane').forEach((pane, idx) => {
      pane.classList.toggle('active', (idx + 1) === stepNum);
    });

    // Sync live preview
    this.syncFormToReport();
    this.updateLivePreview();
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('.tab-panel, .tab-content').forEach(c => c.classList.toggle('active', c.id === tabId));

    if (tabId === 'document-tab' || tabId === 'form-tab') {
      this.updateLivePreview();
    }
    if (tabId === 'history-tab') {
      this.renderReportsTable();
      this.updateStats();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  loadSampleData() {
    this.currentReport = JSON.parse(JSON.stringify(SAMPLE_REPORT));
    this.currentReport.id = 'report_' + Date.now();
    this.loadCurrentFormData(this.currentReport);
    this.updateLivePreview();
    this.showToast(this.t('toastSampleLoaded'), 'success');
  }

  loadCurrentFormData(report) {
    document.getElementById('form-branch').value = report.branch || 'ក្រចេះ';
    document.getElementById('form-date').value = report.date || new Date().toISOString().split('T')[0];
    document.getElementById('form-name').value = report.reporterName || '';
    document.getElementById('form-position').value = report.position || 'ប្រធានសាខា';

    // Section 1
    document.getElementById('form-opening-time').value = report.openingTime || '6:00Am';
    document.getElementById('form-present-count').value = report.presentCount ?? 14;
    document.getElementById('form-absent-count').value = report.absentCount || 'Day Off 1នាក់';
    document.getElementById('form-cleanliness').value = report.cleanlinessStatus || '';

    // Section 2
    document.getElementById('form-work-status').value = report.workStatus || '';
    document.getElementById('form-challenges').value = report.operationChallenges || '';

    // Section 3
    document.getElementById('form-accomplished').value = report.accomplishedTasks || '';
    document.getElementById('form-unresolved').value = report.unresolvedIssues || '';
    document.getElementById('form-security').value = report.packageSecurity || '';
    document.getElementById('form-closing-time').value = report.closingTime || '11:00Pm';
  }

  syncFormToReport() {
    const rawDate = document.getElementById('form-date').value || new Date().toISOString().split('T')[0];
    const dateParts = rawDate.split('-');
    const dateDisplay = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0].slice(2)}` : rawDate;

    this.currentReport = {
      ...this.currentReport,
      branch: document.getElementById('form-branch').value,
      date: rawDate,
      dateDisplay: dateDisplay,
      reporterName: document.getElementById('form-name').value,
      position: document.getElementById('form-position').value,
      openingTime: document.getElementById('form-opening-time').value,
      presentCount: document.getElementById('form-present-count').value,
      absentCount: document.getElementById('form-absent-count').value,
      cleanlinessStatus: document.getElementById('form-cleanliness').value,
      workStatus: document.getElementById('form-work-status').value,
      operationChallenges: document.getElementById('form-challenges').value,
      accomplishedTasks: document.getElementById('form-accomplished').value,
      unresolvedIssues: document.getElementById('form-unresolved').value,
      packageSecurity: document.getElementById('form-security').value,
      closingTime: document.getElementById('form-closing-time').value,
      openingPhotos: this.openingPhotos,
      closingPhotos: this.closingPhotos
    };
  }

  updateLivePreview() {
    const r = this.currentReport;

    // Header & Sidebar sync
    const headerBranchEl = document.getElementById('header-branch-name');
    if (headerBranchEl) headerBranchEl.textContent = `សាខា${r.branch || 'ក្រចេះ'}`;

    const sidebarUserEl = document.getElementById('sidebar-user-name');
    if (sidebarUserEl) sidebarUserEl.textContent = r.reporterName || 'ប៊ុនតា ភឿន';

    const sidebarRoleEl = document.getElementById('sidebar-user-role');
    if (sidebarRoleEl) sidebarRoleEl.textContent = r.position || 'ប្រធានសាខា';

    const sidebarBranchSelect = document.getElementById('sidebar-branch-select');
    if (sidebarBranchSelect && r.branch && sidebarBranchSelect.value !== r.branch) {
      sidebarBranchSelect.value = r.branch;
    }

    // Update in all preview places (mini sidebar preview and full A4 document view)
    document.querySelectorAll('.doc-val-branch').forEach(el => el.textContent = r.branch || 'ក្រចេះ');
    document.querySelectorAll('.doc-val-date').forEach(el => el.textContent = r.dateDisplay || r.date || '14/08/26');
    document.querySelectorAll('.doc-val-name').forEach(el => el.textContent = r.reporterName || 'ប៊ុនតា ភឿន');
    document.querySelectorAll('.doc-val-position').forEach(el => el.textContent = r.position || 'ប្រធានសាខា');

    // Section 1
    document.querySelectorAll('.doc-val-opening-time').forEach(el => el.textContent = r.openingTime || '6:00Am');
    document.querySelectorAll('.doc-val-present').forEach(el => el.textContent = r.presentCount || '14');
    document.querySelectorAll('.doc-val-absent').forEach(el => el.textContent = r.absentCount || 'Day Off 1នាក់');
    document.querySelectorAll('.doc-val-cleanliness').forEach(el => el.textContent = r.cleanlinessStatus || 'ស្ថានភាពអនាម័យ និងភាពរៀបរយក្នុង-ក្រៅសាខា');

    // Section 2
    document.querySelectorAll('.doc-val-work-status').forEach(el => el.textContent = r.workStatus || 'បញ្ញើរអីវ៉ាន់ សម្រាប់ភ្ញៀវVIPនិងកំពុងស្វែងរកភ្ញៀវបន្ថែម');
    document.querySelectorAll('.doc-val-challenges').forEach(el => el.textContent = r.operationChallenges || 'អីវ៉ាន់ដឹកអត់ដល់ កង់បីអស់ថ្ម អីវ៉ាន់ខ្លះសល់ទុកដឹកស្អែកសម្រួលជាមួយភ្ញៀវដឹកជូនថ្ងៃស្អែក');

    // Section 3
    document.querySelectorAll('.doc-val-accomplished').forEach(el => el.textContent = r.accomplishedTasks || 'ដោះស្រាយអីវ៉ាន់ដែលដឹកអត់ដល់និងសម្រួលដឹកអីវ៉ាន់ដែលជាប់ខូច');
    document.querySelectorAll('.doc-val-unresolved').forEach(el => el.textContent = r.unresolvedIssues || 'អីវ៉ាន់ដឹកអត់ដល់ទុកដឹកស្អែក');
    document.querySelectorAll('.doc-val-security').forEach(el => el.textContent = r.packageSecurity || 'អីវ៉ាន់ដែលនៅសល់ទុកដាក់នៅកន្លែងមានផាសុខភាពនិងមិនសើម');
    document.querySelectorAll('.doc-val-closing-time').forEach(el => el.textContent = r.closingTime || '11:00Pm');

    // Render photo galleries in A4 preview
    this.renderDocPhotoGalleries();
  }

  setupPhotoUploader(inputId, previewContainerId, type) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(previewContainerId);
    if (!input || !container) return;

    input.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      this.showToast('កំពុងដំណើរការ Watermark លើរូបភាព...', 'primary');

      for (const file of files) {
        try {
          const watermarkedUrl = await WatermarkUtil.addWatermark(file, {
            branch: document.getElementById('form-branch').value || 'ក្រចេះ',
            date: document.getElementById('form-date').value,
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          });

          if (type === 'opening') {
            this.openingPhotos.push(watermarkedUrl);
          } else {
            this.closingPhotos.push(watermarkedUrl);
          }
        } catch (err) {
          console.error('Error watermarking image:', err);
        }
      }

      this.renderPhotoPreviews(previewContainerId, type);
      this.updateLivePreview();
      this.showToast(`បានបញ្ចូល ${files.length} រូបថតរួចរាល់!`, 'success');
      input.value = '';
    });
  }

  renderPhotoPreviews(containerId, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const photos = type === 'opening' ? this.openingPhotos : this.closingPhotos;
    container.innerHTML = '';

    photos.forEach((src, idx) => {
      const card = document.createElement('div');
      card.className = 'photo-card';
      card.innerHTML = `
        <img src="${src}" alt="Shift photo ${idx+1}">
        <div class="photo-watermark-overlay">✓ Watermarked</div>
        <button type="button" class="photo-remove-btn" data-index="${idx}" title="លុបរូប">✕</button>
      `;
      card.querySelector('.photo-remove-btn').addEventListener('click', () => {
        if (type === 'opening') {
          this.openingPhotos.splice(idx, 1);
        } else {
          this.closingPhotos.splice(idx, 1);
        }
        this.renderPhotoPreviews(containerId, type);
        this.updateLivePreview();
      });
      container.appendChild(card);
    });
  }

  renderDocPhotoGalleries() {
    const openGallery = document.getElementById('doc-opening-photos');
    const closeGallery = document.getElementById('doc-closing-photos');

    if (openGallery) {
      openGallery.innerHTML = this.openingPhotos.map(p => `
        <div class="doc-photo-item"><img src="${p}" alt="Opening Photo"></div>
      `).join('');
    }

    if (closeGallery) {
      closeGallery.innerHTML = this.closingPhotos.map(p => `
        <div class="doc-photo-item"><img src="${p}" alt="Closing Photo"></div>
      `).join('');
    }
  }

  saveCurrentReport() {
    this.syncFormToReport();
    if (!this.currentReport.branch || !this.currentReport.reporterName) {
      this.showToast('សូមបញ្ចូលឈ្មោះសាខា និងឈ្មោះអ្នករាយការណ៍!', 'warning');
      return;
    }

    Storage.saveReport(this.currentReport);
    this.showToast(`បានរក្សាទុករបាយការណ៍សាខា "${this.currentReport.branch}" រួចរាល់!`, 'success');
    this.renderReportsTable();
    this.updateStats();
  }

  resetForm() {
    if (confirm('តើអ្នកប្រាកដជាចង់សម្អាតទម្រង់នេះដើម្បីបំពេញថ្មីមែនទេ?')) {
      this.currentReport = {
        id: 'report_' + Date.now(),
        branch: 'ក្រចេះ',
        date: new Date().toISOString().split('T')[0],
        dateDisplay: new Date().toLocaleDateString('en-GB'),
        reporterName: '',
        position: 'ប្រធានសាខា',
        openingTime: '6:00Am',
        presentCount: '',
        absentCount: '',
        cleanlinessStatus: '',
        workStatus: '',
        operationChallenges: '',
        accomplishedTasks: '',
        unresolvedIssues: '',
        packageSecurity: '',
        closingTime: '11:00Pm',
        openingPhotos: [],
        closingPhotos: []
      };
      this.openingPhotos = [];
      this.closingPhotos = [];
      this.loadCurrentFormData(this.currentReport);
      this.renderPhotoPreviews('opening-photo-preview', 'opening');
      this.renderPhotoPreviews('closing-photo-preview', 'closing');
      this.updateLivePreview();
      this.showToast('បានសម្អាតទម្រង់រួចរាល់', 'primary');
    }
  }

  renderReportsTable() {
    const tbody = document.getElementById('reports-table-body');
    if (!tbody) return;

    const searchTerm = (document.getElementById('search-reports')?.value || '').toLowerCase();
    const branchFilter = document.getElementById('filter-branch')?.value || '';
    const dateFilter = document.getElementById('filter-date')?.value || '';

    let reports = Storage.getReports();

    // Filter
    reports = reports.filter(r => {
      const matchSearch = !searchTerm || 
        (r.branch && r.branch.toLowerCase().includes(searchTerm)) ||
        (r.reporterName && r.reporterName.toLowerCase().includes(searchTerm)) ||
        (r.workStatus && r.workStatus.toLowerCase().includes(searchTerm));
      
      const matchBranch = !branchFilter || r.branch === branchFilter;
      const matchDate = !dateFilter || r.date === dateFilter;

      return matchSearch && matchBranch && matchDate;
    });

    if (reports.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">
            ${this.t('emptyTableText')}
          </td>
        </tr>
      `;
      return;
    }

    const presentLabel = this.currentLang === 'en' ? 'Present: ' : 'វត្តមាន ';
    const reportedBadge = this.currentLang === 'en' ? '✓ Submitted' : '✓ បានរាយការណ៍';
    const viewA4Title = this.currentLang === 'en' ? 'View A4 Document' : 'មើលទម្រង់ A4';
    const editTitle = this.currentLang === 'en' ? 'Edit' : 'កែសម្រួល';
    const deleteTitle = this.currentLang === 'en' ? 'Delete' : 'លុប';

    tbody.innerHTML = reports.map(r => `
      <tr>
        <td><strong>${r.branch || '-'}</strong></td>
        <td>${r.dateDisplay || r.date || '-'}</td>
        <td>
          <div style="font-weight:600;">${r.reporterName || '-'}</div>
          <small style="color:var(--text-muted);">${r.position || '-'}</small>
        </td>
        <td>
          <span style="color:var(--accent-green); font-weight:600;">${presentLabel}${r.presentCount || 0}</span>
          ${r.absentCount ? `<br><small style="color:var(--accent-amber);">${r.absentCount}</small>` : ''}
        </td>
        <td>
          <div style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${r.workStatus || ''}">
            ${r.workStatus || '-'}
          </div>
        </td>
        <td>
          <span class="status-badge status-completed">${reportedBadge}</span>
        </td>
        <td>
          <div style="display:flex; gap:0.35rem;">
            <button class="btn btn-sm btn-secondary" onclick="window.bsApp.viewReportDoc('${r.id}')" title="${viewA4Title}">A4</button>
            <button class="btn btn-sm btn-secondary" onclick="window.bsApp.editReport('${r.id}')" title="${editTitle}">${this.currentLang === 'en' ? 'Edit' : 'កែសម្រួល'}</button>
            <button class="btn btn-sm btn-secondary" onclick="window.bsApp.shareReportTg('${r.id}')" title="Telegram">Telegram</button>
            <button class="btn btn-sm btn-ghost" onclick="window.bsApp.deleteReport('${r.id}')" title="${deleteTitle}" style="color:var(--accent-red)">${this.currentLang === 'en' ? 'Delete' : 'លុប'}</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  updateStats() {
    const reports = Storage.getReports();
    const totalReportsEl = document.getElementById('stat-total-reports');
    const sidebarCountEl = document.getElementById('sidebar-report-count');
    const branchesCountEl = document.getElementById('stat-branches-count');
    const staffPresentEl = document.getElementById('stat-staff-present');
    const challengesEl = document.getElementById('stat-challenges-count');

    if (totalReportsEl) totalReportsEl.textContent = reports.length;
    if (sidebarCountEl) sidebarCountEl.textContent = reports.length;

    const uniqueBranches = new Set(reports.map(r => r.branch).filter(Boolean));
    if (branchesCountEl) branchesCountEl.textContent = uniqueBranches.size;

    const totalStaff = reports.reduce((sum, r) => sum + (parseInt(r.presentCount) || 0), 0);
    if (staffPresentEl) staffPresentEl.textContent = totalStaff;

    const challengesCount = reports.filter(r => r.operationChallenges && r.operationChallenges.trim() !== 'គ្មាន').length;
    if (challengesEl) challengesEl.textContent = challengesCount;
  }

  viewReportDoc(id) {
    const report = Storage.getReportById(id);
    if (report) {
      this.currentReport = { ...report };
      this.openingPhotos = report.openingPhotos || [];
      this.closingPhotos = report.closingPhotos || [];
      this.loadCurrentFormData(this.currentReport);
      this.updateLivePreview();
      this.switchTab('document-tab');
      this.showToast(`កំពុងបង្ហាញទម្រង់ផ្លូវការសាខា "${report.branch}"`, 'primary');
    }
  }

  editReport(id) {
    const report = Storage.getReportById(id);
    if (report) {
      this.currentReport = { ...report };
      this.openingPhotos = report.openingPhotos || [];
      this.closingPhotos = report.closingPhotos || [];
      this.loadCurrentFormData(this.currentReport);
      this.renderPhotoPreviews('opening-photo-preview', 'opening');
      this.renderPhotoPreviews('closing-photo-preview', 'closing');
      this.updateLivePreview();
      this.switchTab('form-tab');
      this.showToast(`កំពុងកែសម្រួលរបាយការណ៍ "${report.branch}"`, 'primary');
    }
  }

  shareReportTg(id) {
    const report = Storage.getReportById(id);
    if (report) {
      const tgText = ExportUtil.formatForTelegram(report, this.currentLang);
      document.getElementById('telegram-content').textContent = tgText;
      document.getElementById('telegram-modal').classList.add('active');
    }
  }

  openTelegramModal() {
    this.syncFormToReport();
    const tgText = ExportUtil.formatForTelegram(this.currentReport, this.currentLang);
    document.getElementById('telegram-content').textContent = tgText;
    document.getElementById('telegram-modal').classList.add('active');
  }

  toggleStamp() {
    const stamps = document.querySelectorAll('.official-seal-stamp');
    let isVisible = true;
    stamps.forEach(s => {
      if (s.style.display === 'none') {
        s.style.display = 'flex';
        isVisible = true;
      } else {
        s.style.display = 'none';
        isVisible = false;
      }
    });
    this.showToast(isVisible ? 'បានបង្ហាញត្រាក្រុមហ៊ុន' : 'បានលាក់ត្រាក្រុមហ៊ុន', 'primary');
  }

  deleteReport(id) {
    if (confirm('តើអ្នកប្រាកដជាចង់លុបរបាយការណ៍នេះមែនទេ?')) {
      Storage.deleteReport(id);
      this.renderReportsTable();
      this.updateStats();
      this.showToast('បានលុបរបាយការណ៍រួចរាល់', 'primary');
    }
  }

  // =========================================================================
  // AUTHENTICATION & FIRST SCREEN GATEWAY METHODS
  // =========================================================================
  initAuth() {
    this.currentUser = Storage.getCurrentUser();
    this.updateScreenVisibility();
    this.renderAuthNav();
    if (this.currentUser) {
      this.fillFormFromCurrentUser();
    }
  }

  updateScreenVisibility(forceShowApp = false) {
    const authScreen = document.getElementById('auth-gateway-screen');
    const mainApp = document.getElementById('main-app-wrapper');

    if (this.currentUser || forceShowApp) {
      if (authScreen) authScreen.style.display = 'none';
      if (mainApp) {
        mainApp.style.display = 'block';
        this.syncFormToReport();
        this.updateLivePreview();
        this.renderReportsTable();
        this.updateStats();
      }
    } else {
      if (authScreen) authScreen.style.display = 'grid';
      if (mainApp) mainApp.style.display = 'none';
    }
  }

  renderAuthNav() {
    const container = document.getElementById('auth-nav-container');
    if (!container) return;

    if (this.currentUser) {
      const initials = (this.currentUser.fullName || this.currentUser.username || 'U')
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const role = this.currentUser.role || '';
      const uname = (this.currentUser.username || '').toLowerCase();
      const isSystemAdmin = role.includes('System Administrator') || role.includes('អ្នកគ្រប់គ្រងប្រព័ន្ធ') || uname === 'admin' || uname === 'sysadmin' || uname === 'rithjengdavid';

      let badgeClass = 'badge-blue';
      if (isSystemAdmin) badgeClass = 'badge-purple';
      else if (role.includes('Admin') || role.includes('នាយកដ្ឋាន')) badgeClass = 'badge-red';
      else if (role.includes('អនុប្រធាន')) badgeClass = 'badge-cyan';
      else if (role.includes('បុគ្គលិក')) badgeClass = 'badge-amber';
      else if (role.includes('សេវា')) badgeClass = 'badge-emerald';

      const adminBtnHtml = isSystemAdmin ? `
        <button type="button" class="btn-nav-users-mgr" id="btn-open-user-mgr" title="ពិនិត្យបញ្ជីគណនី Username & Password ទាំងអស់">
          🛡️ ពិនិត្យ User & Pass
        </button>
      ` : '';

      container.innerHTML = `
        ${adminBtnHtml}
        <div class="auth-user-pill" title="គណនី៖ ${this.currentUser.fullName} (${this.currentUser.role})">
          <div class="user-avatar">${initials}</div>
          <div class="user-info-text">
            <span class="user-name-display">${this.currentUser.fullName || this.currentUser.username}</span>
            <span class="user-role-badge ${badgeClass}">${this.currentUser.role} • ${this.currentUser.branch}</span>
          </div>
          <button type="button" class="btn-nav-logout" id="btn-logout" title="ចាកចេញ (Sign Out)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      `;

      document.getElementById('btn-open-user-mgr')?.addEventListener('click', () => {
        this.openUsersModal();
      });

      document.getElementById('btn-logout')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleLogout();
      });
    } else {
      container.innerHTML = `
        <button type="button" class="btn btn-primary btn-sm auth-btn-open" id="btn-open-auth-modal">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span data-i18n="btnOpenAuth">ចូលគណនី</span>
        </button>
      `;

      document.getElementById('btn-open-auth-modal')?.addEventListener('click', () => {
        this.openAuthModal('login');
      });
    }
  }

  // =========================================================================
  // USER CREDENTIALS & PASSWORDS INSPECTOR (ADMIN TOOL)
  // =========================================================================
  openUsersModal() {
    const modal = document.getElementById('users-management-modal');
    if (!modal) return;
    modal.classList.add('active');
    this.renderUsersTable();
  }

  closeUsersModal() {
    const modal = document.getElementById('users-management-modal');
    if (modal) modal.classList.remove('active');
  }

  toggleAllPasswords() {
    this.showAllPasswords = !this.showAllPasswords;
    const label = document.getElementById('label-toggle-all-pwd');
    if (label) {
      label.textContent = this.showAllPasswords ? '🔒 លាក់ Password ទាំងអស់' : '👁️ បង្ហាញ Password ទាំងអស់';
    }
    this.renderUsersTable(document.getElementById('search-users-input')?.value || '');
  }

  renderUsersTable(filterText = '') {
    const tbody = document.getElementById('users-table-body');
    const summary = document.getElementById('users-count-summary');
    if (!tbody) return;

    const users = Storage.getUsers();
    const query = filterText.trim().toLowerCase();

    const filtered = users.filter(u => {
      if (!query) return true;
      return (
        (u.fullName && u.fullName.toLowerCase().includes(query)) ||
        (u.username && u.username.toLowerCase().includes(query)) ||
        (u.role && u.role.toLowerCase().includes(query)) ||
        (u.branch && u.branch.toLowerCase().includes(query)) ||
        (u.phone && u.phone.includes(query))
      );
    });

    if (summary) {
      summary.textContent = `សរុប ${filtered.length} គណនី (នៃ ${users.length} គណនីទាំងអស់)`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: hsl(var(--muted-foreground));">
            🔍 មិនមានគណនីដែលត្រូវនឹង "${filterText}" ទេ
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(u => {
      const initials = (u.fullName || u.username || 'U')
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      let badgeClass = 'badge-blue';
      const r = u.role || '';
      if (r.includes('System') || r.includes('អ្នកគ្រប់គ្រង')) badgeClass = 'badge-purple';
      else if (r.includes('Admin') || r.includes('នាយកដ្ឋាន')) badgeClass = 'badge-red';
      else if (r.includes('អនុប្រធាន')) badgeClass = 'badge-cyan';
      else if (r.includes('បុគ្គលិក')) badgeClass = 'badge-amber';
      else if (r.includes('សេវា')) badgeClass = 'badge-emerald';

      const pwdDisplay = this.showAllPasswords ? u.password : '••••••••';
      const uLower = (u.username || '').toLowerCase();
      const isProtectedAdmin = uLower === 'admin' || uLower === 'sysadmin' || uLower === 'rithjengdavid';

      return `
        <tr data-user-id="${u.id}">
          <td>
            <div class="user-cell-wrap">
              <div class="user-cell-avatar">${initials}</div>
              <span class="user-cell-name">${u.fullName}</span>
            </div>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <code style="font-family: var(--font-mono); font-weight: 700; color: #2563eb;">${u.username}</code>
              <button type="button" class="btn-icon-cell btn-copy-username" data-username="${u.username}" title="Copy Username">📋</button>
            </div>
          </td>
          <td>
            <div class="pwd-cell-box">
              <span class="pwd-text-val" id="pwd-val-${u.id}" data-real-pwd="${u.password}">${pwdDisplay}</span>
              <button type="button" class="btn-icon-cell btn-toggle-row-pwd" data-target="pwd-val-${u.id}" title="Show / Hide">👁️</button>
              <button type="button" class="btn-icon-cell btn-copy-pwd" data-pwd="${u.password}" title="Copy Password">📋</button>
            </div>
          </td>
          <td>
            <span class="demo-role-badge ${badgeClass}">${u.role}</span>
          </td>
          <td>
            <span style="font-weight: 600;">${u.branch || '-'}</span>
          </td>
          <td>
            <span style="color: hsl(var(--muted-foreground)); font-family: var(--font-mono); font-size: 0.78rem;">${u.phone || '-'}</span>
          </td>
          <td style="text-align: right;">
            ${isProtectedAdmin ? '<small style="color: hsl(var(--muted-foreground));">Default Admin</small>' : `
              <button type="button" class="btn-cell-delete" data-user-id="${u.id}" data-username="${u.username}" title="លុបគណនី">
                🗑️ លុប
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');

    // Bind row action events
    tbody.querySelectorAll('.btn-copy-username').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const username = e.currentTarget.dataset.username;
        navigator.clipboard.writeText(username).then(() => {
          this.showToast(`បានចម្លង Username: ${username}`, 'success');
        });
      });
    });

    tbody.querySelectorAll('.btn-copy-pwd').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pwd = e.currentTarget.dataset.pwd;
        navigator.clipboard.writeText(pwd).then(() => {
          this.showToast(`បានចម្លង Password រួចរាល់!`, 'success');
        });
      });
    });

    tbody.querySelectorAll('.btn-toggle-row-pwd').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target;
        const span = document.getElementById(targetId);
        if (span) {
          const isMasked = span.textContent.includes('•');
          span.textContent = isMasked ? span.dataset.realPwd : '••••••••';
        }
      });
    });

    tbody.querySelectorAll('.btn-cell-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.userId;
        const name = e.currentTarget.dataset.username;
        if (confirm(`តើអ្នកប្រាកដជាចង់លុបគណនី "${name}" មែនទេ?`)) {
          Storage.deleteUser(id);
          this.renderUsersTable(document.getElementById('search-users-input')?.value || '');
          this.showToast(`បានលុបគណនី ${name} ជោគជ័យ`, 'primary');
        }
      });
    });
  }

  fillFormFromCurrentUser() {
    if (!this.currentUser) return;
    const nameInput = document.getElementById('form-name');
    const posInput = document.getElementById('form-position');
    const branchSelect = document.getElementById('form-branch');

    if (nameInput) {
      nameInput.value = this.currentUser.fullName || '';
    }
    if (posInput) {
      posInput.value = this.currentUser.role || 'ប្រធានសាខា';
    }
    if (branchSelect && this.currentUser.branch && this.currentUser.branch !== 'ការិយាល័យកណ្តាល (HQ)') {
      branchSelect.value = this.currentUser.branch;
    }
    this.syncFormToReport();
    this.updateLivePreview();
  }

  openAuthModal(defaultTab = 'login') {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.add('active');
      this.switchAuthTab(defaultTab);
    }
  }

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  switchAuthTab(tabName) {
    if (!tabName) tabName = 'login';

    // Switch tab buttons
    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
      const match = btn.dataset.authTab === tabName;
      btn.classList.toggle('active', match);
    });

    // Switch modal panels
    const modalLogin = document.getElementById('auth-panel-login');
    const modalRegister = document.getElementById('auth-panel-register');
    if (modalLogin) {
      modalLogin.classList.toggle('active', tabName === 'login');
      modalLogin.style.display = tabName === 'login' ? 'block' : 'none';
    }
    if (modalRegister) {
      modalRegister.classList.toggle('active', tabName === 'register');
      modalRegister.style.display = tabName === 'register' ? 'block' : 'none';
    }

    // Switch first screen panels
    const screenLogin = document.getElementById('auth-view-login');
    const screenRegister = document.getElementById('auth-view-register');
    if (screenLogin) {
      screenLogin.classList.toggle('active', tabName === 'login');
      screenLogin.style.display = tabName === 'login' ? 'block' : 'none';
    }
    if (screenRegister) {
      screenRegister.classList.toggle('active', tabName === 'register');
      screenRegister.style.display = tabName === 'register' ? 'block' : 'none';
    }

    document.querySelector('.auth-clean-card')?.classList.toggle('register-mode', tabName === 'register');
  }

  submitScreenLogin() {
    const username = document.getElementById('screen-login-username')?.value || '';
    const password = document.getElementById('screen-login-password')?.value || '';
    if (!username.trim()) {
      this.showToast('សូមបញ្ចូលឈ្មោះគណនី (Username)!', 'error');
      document.getElementById('screen-login-username')?.focus();
      return;
    }
    if (!password) {
      this.showToast('សូមបញ្ចូលលេខសម្ងាត់ (Password)!', 'error');
      document.getElementById('screen-login-password')?.focus();
      return;
    }
    this.handleLogin(username, password);
  }

  submitScreenRegister() {
    const fullName = document.getElementById('screen-reg-fullname')?.value || '';
    const username = document.getElementById('screen-reg-username')?.value || '';
    const role = document.getElementById('screen-reg-role')?.value || '';
    const branch = document.getElementById('screen-reg-branch')?.value || '';
    const phone = document.getElementById('screen-reg-phone')?.value || '';
    const password = document.getElementById('screen-reg-password')?.value || '';
    const confirmPassword = document.getElementById('screen-reg-confirm-password')?.value || '';

    if (!fullName.trim()) {
      this.showToast('សូមបញ្ចូលឈ្មោះពេញរបស់អ្នក!', 'error');
      document.getElementById('screen-reg-fullname')?.focus();
      return;
    }
    if (!username.trim()) {
      this.showToast('សូមបញ្ចូលឈ្មោះគណនី (Username)!', 'error');
      document.getElementById('screen-reg-username')?.focus();
      return;
    }
    if (!password) {
      this.showToast('សូមបញ្ចូលលេខសម្ងាត់!', 'error');
      document.getElementById('screen-reg-password')?.focus();
      return;
    }
    if (password !== confirmPassword) {
      this.showToast('លេខសម្ងាត់ទាំងពីរមិនដូចគ្នាទេ!', 'error');
      document.getElementById('screen-reg-confirm-password')?.focus();
      return;
    }

    this.handleRegister({ fullName, username, role, branch, phone, password, confirmPassword });
  }

  submitModalLogin() {
    const username = document.getElementById('login-username')?.value || '';
    const password = document.getElementById('login-password')?.value || '';
    this.handleLogin(username, password);
  }

  submitModalRegister() {
    const fullName = document.getElementById('reg-fullname')?.value || '';
    const username = document.getElementById('reg-username')?.value || '';
    const role = document.getElementById('reg-role')?.value || '';
    const branch = document.getElementById('reg-branch')?.value || '';
    const phone = document.getElementById('reg-phone')?.value || '';
    const password = document.getElementById('reg-password')?.value || '';
    const confirmPassword = document.getElementById('reg-confirm-password')?.value || '';
    this.handleRegister({ fullName, username, role, branch, phone, password, confirmPassword });
  }

  handleLogin(username, password) {
    const result = Storage.authenticateUser(username, password);
    if (!result.success) {
      this.showToast(result.error, 'error');
      return false;
    }

    this.currentUser = result.user;
    Storage.setCurrentUser(this.currentUser);
    this.updateScreenVisibility();
    this.renderAuthNav();
    this.fillFormFromCurrentUser();
    this.closeAuthModal();
    this.showToast(`${this.t('toastLoginSuccess')} ${this.currentUser.fullName} (${this.currentUser.role})!`, 'success');
    return true;
  }

  handleRegister(formData) {
    const { username, password, confirmPassword, fullName, role, branch, phone } = formData;
    
    if (!fullName || !username || !password || !role || !branch) {
      this.showToast('សូមបំពេញព័ត៌មានចាំបាច់ឱ្យបានគ្រប់ជ្រុងជ្រោយ!', 'error');
      return false;
    }

    if (password !== confirmPassword) {
      this.showToast('លេខសម្ងាត់ទាំងពីរមិនដូចគ្នាទេ!', 'error');
      return false;
    }

    if (password.length < 3) {
      this.showToast('លេខសម្ងាត់ត្រូវមានយ៉ាងតិច ៣ តួអក្សរ!', 'error');
      return false;
    }

    const result = Storage.registerUser({ username, password, fullName, role, branch, phone });
    if (!result.success) {
      this.showToast(result.error, 'error');
      return false;
    }

    this.currentUser = result.user;
    Storage.setCurrentUser(this.currentUser);
    this.updateScreenVisibility();
    this.renderAuthNav();
    this.fillFormFromCurrentUser();
    this.closeAuthModal();
    this.showToast(`${this.t('toastRegisterSuccess')} ${this.currentUser.fullName}!`, 'success');
    return true;
  }

  handleLogout() {
    Storage.logout();
    this.currentUser = null;
    this.updateScreenVisibility();
    this.renderAuthNav();
    this.showToast(this.t('toastLogoutSuccess'), 'primary');
  }

  bindAuthEvents() {
    // Open & Close Auth Modal
    document.getElementById('btn-open-auth-modal')?.addEventListener('click', () => {
      this.openAuthModal('login');
    });

    document.getElementById('btn-close-auth-modal')?.addEventListener('click', () => {
      this.closeAuthModal();
    });

    // Close Users Inspector Modal
    document.getElementById('btn-close-users-modal')?.addEventListener('click', () => {
      this.closeUsersModal();
    });

    // Toggle All Passwords in Inspector
    document.getElementById('btn-toggle-all-passwords')?.addEventListener('click', () => {
      this.toggleAllPasswords();
    });

    // Search Users in Inspector
    document.getElementById('search-users-input')?.addEventListener('input', (e) => {
      this.renderUsersTable(e.target.value);
    });

    // Toggle Inline Add User Form
    const addPanel = document.getElementById('admin-quick-add-panel');
    document.getElementById('btn-show-add-user-form')?.addEventListener('click', () => {
      if (addPanel) addPanel.style.display = addPanel.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('btn-cancel-add-user')?.addEventListener('click', () => {
      if (addPanel) addPanel.style.display = 'none';
    });

    // Submit Admin Add User Form
    document.getElementById('form-admin-add-user')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fullName = document.getElementById('admin-add-fullname')?.value || '';
      const username = document.getElementById('admin-add-username')?.value || '';
      const password = document.getElementById('admin-add-password')?.value || '';
      const role = document.getElementById('admin-add-role')?.value || '';
      const branch = document.getElementById('admin-add-branch')?.value || '';
      const phone = document.getElementById('admin-add-phone')?.value || '';

      const res = Storage.registerUser({ username, password, fullName, role, branch, phone });
      if (!res.success) {
        this.showToast(res.error, 'error');
        return;
      }

      this.showToast(`បានបង្កើតគណនីថ្មី ${fullName} (${username}) ជោគជ័យ!`, 'success');
      document.getElementById('form-admin-add-user')?.reset();
      if (addPanel) addPanel.style.display = 'none';
      this.renderUsersTable();
    });

    // Auth Switcher Tabs (Modal & First Screen)
    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.dataset.authTab;
        this.switchAuthTab(targetTab);
      });
    });

    // Continue as guest button
    document.getElementById('btn-continue-guest')?.addEventListener('click', () => {
      this.updateScreenVisibility(true);
      this.showToast('បានចូលជាភ្ញៀវសាកល្បង', 'primary');
    });

    // Toggle Password Visibility Eye buttons
    document.querySelectorAll('.btn-toggle-pwd').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target;
        const input = document.getElementById(targetId);
        if (input) {
          const isPwd = input.type === 'password';
          input.type = isPwd ? 'text' : 'password';
          e.currentTarget.textContent = isPwd ? '🔒' : '👁️';
        }
      });
    });

    // Quick Demo Account Click (1-Click Login)
    document.querySelectorAll('.auth-demo-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const user = e.currentTarget.dataset.user;
        const pwd = e.currentTarget.dataset.pwd;
        
        ['login-username', 'screen-login-username'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = user;
        });
        ['login-password', 'screen-login-password'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = pwd;
        });

        this.handleLogin(user, pwd);
      });
    });

    // Form Login Submit (Modal)
    document.getElementById('form-login')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username')?.value || '';
      const password = document.getElementById('login-password')?.value || '';
      this.handleLogin(username, password);
    });

    // Form Login Submit (First Screen)
    document.getElementById('screen-form-login')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('screen-login-username')?.value || '';
      const password = document.getElementById('screen-login-password')?.value || '';
      this.handleLogin(username, password);
    });

    // Form Register Submit (Modal)
    document.getElementById('form-register')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fullName = document.getElementById('reg-fullname')?.value || '';
      const username = document.getElementById('reg-username')?.value || '';
      const role = document.getElementById('reg-role')?.value || '';
      const branch = document.getElementById('reg-branch')?.value || '';
      const phone = document.getElementById('reg-phone')?.value || '';
      const password = document.getElementById('reg-password')?.value || '';
      const confirmPassword = document.getElementById('reg-confirm-password')?.value || '';

      this.handleRegister({ fullName, username, role, branch, phone, password, confirmPassword });
    });

    // Form Register Submit (First Screen)
    document.getElementById('screen-form-register')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fullName = document.getElementById('screen-reg-fullname')?.value || '';
      const username = document.getElementById('screen-reg-username')?.value || '';
      const role = document.getElementById('screen-reg-role')?.value || '';
      const branch = document.getElementById('screen-reg-branch')?.value || '';
      const phone = document.getElementById('screen-reg-phone')?.value || '';
      const password = document.getElementById('screen-reg-password')?.value || '';
      const confirmPassword = document.getElementById('screen-reg-confirm-password')?.value || '';

      this.handleRegister({ fullName, username, role, branch, phone, password, confirmPassword });
    });

    // Theme toggle buttons across navbar & first screen
    document.querySelectorAll('.btn-theme-toggle-all').forEach(btn => {
      btn.addEventListener('click', () => this.toggleTheme());
    });
  }

  showToast(message, type = 'primary') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div>${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

// Initialize on DOM load and expose to window for inline handlers
function initBSApp() {
  if (typeof window !== 'undefined' && !window.bsApp) {
    window.bsApp = new BSExpressApp();
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBSApp);
  } else {
    initBSApp();
  }
}

  if (typeof window !== 'undefined') {
    window.BSExpressApp = BSExpressApp;
    window.initBSApp = initBSApp;
  }
})();

