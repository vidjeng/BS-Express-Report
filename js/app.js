/**
 * BS Express Daily Report System - Main Application Orchestrator
 * Universal script support for Google Chrome local files and servers
 */

(() => {
  const Storage = (typeof window !== 'undefined' && window.Storage) ? window.Storage : null;
  const SAMPLE_REPORT = (typeof window !== 'undefined' && window.SAMPLE_REPORT) ? window.SAMPLE_REPORT : {};
  const BRANCH_LIST = (typeof window !== 'undefined' && window.BRANCH_LIST) ? window.BRANCH_LIST : [];
  const BRANCH_LIST_EN = (typeof window !== 'undefined' && window.BRANCH_LIST_EN) ? window.BRANCH_LIST_EN : [];
  const WatermarkUtil = (typeof window !== 'undefined' && window.WatermarkUtil) ? window.WatermarkUtil : {};
  const ExportUtil = (typeof window !== 'undefined' && window.ExportUtil) ? window.ExportUtil : {};
  const translations = (typeof window !== 'undefined' && window.translations) ? window.translations : {};

  class BSExpressApp {
  constructor() {
    this.currentLang = 'km';
    this.currentUser = null;
    this.activeSystem = (Storage && typeof Storage.getActiveSystem === 'function') ? Storage.getActiveSystem() : 'portal';
    // Start with an empty report. Sample values are loaded only when the user
    // explicitly clicks “Load Sample Data”.
    this.currentReport = {};
    this.openingPhotos = [];
    this.closingPhotos = [];
    this.additionalPhotos = [];
    this.activeTab = 'form-tab';
    this.currentStep = 1;
    this.completedSteps = new Set();
    this.historySortBy = 'datetime-desc';

    this.init();
  }

  init() {
    this.initLang();
    this.initTheme();
    this.initAuth();
    this.updateIssueFeatureVisibility();
    this.populateBranchDropdowns();
    this.populateRoleDropdowns();
    this.initTimePicker();
    this.bindEvents();
    this.bindAuthEvents();
    this.loadCurrentFormData(this.currentReport);
    if (this.currentLang === 'en') {
      this.translateDefaultFormFields('en');
    }
    this.updateLivePreview();
    this.renderReportsTable();
    this.updateStats();
    this.renderIssuesDashboard();
    this.updateIssuesStatsAndBadge();
    this.restoreBundledReports();
    window.addEventListener('storage', (event) => {
      if (event.key === 'bs_express_daily_reports') {
        this.renderReportsTable();
        this.updateStats();
        this.renderIssuesDashboard();
        this.updateIssuesStatsAndBadge();
      }
    });
    this.startClock();
    this.applyTranslations();
    this.updateStepCompletion();

    // Restore draft if exists for current branch
    const userBranch = this.currentUser ? this.getCanonicalBranch(this.currentUser.branch) : '';
    const existingDraft = Storage.getDraft(userBranch);
    if (existingDraft && Object.keys(existingDraft).length > 0 && this.canAccessReport(existingDraft)) {
      try {
        this.populateForm(existingDraft);
        this.updateLivePreview();
      } catch (e) {
        console.warn('Could not restore draft:', e);
      }
    }
    this.disableBrowserAutocomplete();
    this.initDatabaseSync();
    this.initSystemRouter();
  }

  async syncLatestData(silent = true) {
    try {
      const health = await Storage.checkDbHealth();
      this.updateDbIndicator(health.connected);

      if (health.connected) {
        await Storage.syncUsersFromDatabase();
        const reports = await Storage.syncReportsFromDatabase();
        if (reports) {
          this.renderReportsTable();
          this.updateStats();
          this.renderIssuesDashboard();
          this.updateIssuesStatsAndBadge();
          this.populateBranchDropdowns();
          this.populateRoleDropdowns();
          if (this.currentReport && this.isViewingSavedReport) {
            const updated = Storage.getReportById(this.currentReport.id);
            if (updated) {
              this.currentReport = { ...updated };
              this.loadCurrentFormData(this.currentReport);
              this.updateLivePreview();
            }
          }
        }
      }
    } catch (err) {}
  }

  async initDatabaseSync() {
    this.updateDbIndicator(Storage.isDbOnline);

    window.addEventListener('bs-db-status', (e) => {
      this.updateDbIndicator(e.detail?.online);
    });

    const indicator = document.getElementById('db-status-indicator');
    if (indicator) {
      indicator.style.cursor = 'pointer';
      indicator.addEventListener('click', async () => {
        const currentUrl = Storage.getApiBaseUrl();
        const health = await Storage.checkDbHealth();
        const isEn = this.currentLang === 'en';
             const promptMsg = isEn
          ? `[Cloud Database & Server Settings]\nStatus: ${health.connected ? `ONLINE (${health.database || 'Connected'})` : 'OFFLINE (LocalStorage)'}\nCurrent Server URL: ${currentUrl || '(Default: Unified HTTPS Same Origin)'}\n\n(Leave blank to use default unified HTTPS hosting)`
          : `[ការកំណត់ Database & Server]\nស្ថានភាព: ${health.connected ? `ភ្ជាប់ជោគជ័យ (${health.database || 'ONLINE'})` : 'មិនទាន់ភ្ជាប់ (ប្រើ LocalStorage)'}\nServer URL បច្ចុប្បន្ន: ${currentUrl || '(លំនាំដើម: Unified HTTPS Hosting តែមួយ)'}\n\n(ទុកទទេដើម្បីប្រើលំនាំដើម Unified HTTPS)`;
        
        const newUrl = prompt(promptMsg, currentUrl);
        if (newUrl !== null) {
          Storage.setApiBaseUrl(newUrl.trim());
          const newHealth = await Storage.checkDbHealth();
          if (newHealth.connected) {
            await this.syncLatestData(false);
            this.showToast(isEn ? `Connected to Database: ${newHealth.database}!` : `បានតភ្ជាប់ទៅកាន់ Database: ${newHealth.database}!`, 'success');
          } else {
            this.showToast(isEn ? 'Could not connect to specified Server URL.' : 'មិនអាចតភ្ជាប់ទៅកាន់ Server URL នេះបានទេ!', 'warning');
          }
        }
      });
    }

    // 1. Run initial synchronization
    await this.syncLatestData(true);

    // 2. Cross-browser synchronization: Re-sync automatically whenever user switches back to this window or tab
    window.addEventListener('focus', () => {
      this.syncLatestData(true);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.syncLatestData(true);
      }
    });

    // 3. Periodic silent sync every 30 seconds to keep all browsers in 100% sync
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.syncLatestData(true);
      }
    }, 30000);
  }

  updateDbIndicator(online) {
    const badge = document.getElementById('db-status-indicator');
    const label = document.getElementById('db-status-label');
    if (!badge) return;

    // Only Admin or Top Management can see Database Status
    if (!this.isCurrentUserAdminOrTopMgmt()) {
      badge.classList.remove('admin-visible');
      badge.style.display = 'none';
      return;
    }

    badge.classList.add('admin-visible');
    badge.style.display = 'inline-flex';
    if (!label) return;

    if (online) {
      badge.classList.remove('is-offline');
      badge.classList.add('is-online');
      label.textContent = this.currentLang === 'en' ? 'Cloud DB Online' : 'Database ដំណើរការ';
      badge.title = this.currentLang === 'en' ? 'Database Connected (Live Sync)' : 'បានតភ្ជាប់ទៅកាន់ Database (Live Sync)';
    } else {
      badge.classList.remove('is-online');
      badge.classList.add('is-offline');
      label.textContent = this.currentLang === 'en' ? 'Offline Cache' : 'ទិន្នន័យក្នុងម៉ាស៊ីន';
      badge.title = this.currentLang === 'en' ? 'Offline / LocalStorage Mode' : 'ដំណើរការលើ LocalStorage';
    }
  }

  async restoreBundledReports() {
    const restoreKey = 'bs_express_bundled_reports_restored_v3';
    if (localStorage.getItem(restoreKey) === 'true') return;

    try {
      const response = await fetch('data/reports.json', { cache: 'no-store' });
      if (!response.ok) return;
      const bundledReports = await response.json();
      if (!Array.isArray(bundledReports) || bundledReports.length === 0) return;

      const deletedReportIds = Storage.getDeletedReportIds();
      const deletedIssueIds = Storage.getDeletedIssueIds();
      const currentReports = Storage.getReports();
      const preservedReports = currentReports.filter(report => {
        const id = String(report?.id || '');
        return !id.startsWith('report_init_') && !id.startsWith('report_sample_') && !deletedReportIds.has(id);
      });
      const reportsById = new Map();
      [...preservedReports, ...bundledReports].forEach(report => {
        if (report?.id && !deletedReportIds.has(String(report.id))) {
          if (Array.isArray(report.issues)) {
            report.issues = report.issues.filter((iss, idx) => {
              const iId = String(iss.id || '').trim();
              const synId = `iss_${report.id}_${idx}`;
              const iText = String(iss.issue || '').trim();
              return !deletedIssueIds.has(iId) && !deletedIssueIds.has(synId) && !deletedIssueIds.has(iText);
            });
          }
          if (deletedIssueIds.has(`iss_unresolved_${report.id}`) || (report.unresolvedIssues && deletedIssueIds.has(String(report.unresolvedIssues).trim()))) {
            report.unresolvedIssues = '';
          }
          reportsById.set(report.id, report);
        }
      });
      const result = Storage.saveReports([...reportsById.values()]);
      if (result) {
        localStorage.setItem(restoreKey, 'true');
        this.renderReportsTable();
        this.updateStats();
        this.renderIssuesDashboard();
        this.updateIssuesStatsAndBadge();
      }
    } catch (error) {
      console.warn('Bundled report restore unavailable:', error);
    }
  }

  disableBrowserAutocomplete() {
    document.querySelectorAll('input:not([type="password"]), textarea').forEach(el => {
      el.setAttribute('autocomplete', 'off');
      el.setAttribute('autocorrect', 'off');
      el.setAttribute('autocapitalize', 'off');
      el.setAttribute('spellcheck', 'false');
    });
  }

  updateIssueFeatureVisibility() {
    const hideIssueFeature = !this.isCurrentUserAdminOrTopMgmt();
    document.body.classList.toggle('issues-hidden-for-user', hideIssueFeature);
    document.querySelectorAll('[data-issue-feature="true"]').forEach(element => {
      element.hidden = hideIssueFeature;
    });
  }

  getCurrentFormattedTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'Pm' : 'Am';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    const strMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${strMinutes}${ampm}`;
  }

  initLang() {
    this.currentLang = localStorage.getItem('bs_express_lang') || 'km';
    document.documentElement.setAttribute('lang', this.currentLang);
    if (this.currentLang === 'en') {
      document.title = 'BS Express - Daily Branch Work Report';
    } else {
      document.title = 'BS Express - របាយការណ៍ការងារប្រចាំថ្ងៃ';
    }
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
    this.populateBranchDropdowns();
    this.populateRoleDropdowns();
    this.applyTranslations();
    this.translateDefaultFormFields(lang);
    this.syncFormToReport();

    if (document.getElementById('work-status-list')) {
      const workList = [...document.querySelectorAll('#work-status-list .work-status-input')].map(i => i.value);
      this.renderWorkStatusRows(workList);
    }

    if (document.getElementById('challenges-list')) {
      const chalList = [...document.querySelectorAll('#challenges-list .challenges-input')].map(i => i.value);
      this.renderChallengesRows(chalList);
    }

    if (document.getElementById('accomplished-list')) {
      const tasks = [...document.querySelectorAll('#accomplished-list .accomplished-input')].map(i => i.value);
      this.renderAccomplishedRows(tasks);
    }

    if (document.getElementById('security-list')) {
      const securityItems = [...document.querySelectorAll('#security-list .security-input')].map(i => i.value);
      this.renderSecurityRows(securityItems);
    }

    if (document.getElementById('issue-list')) {
      const issues = [...document.querySelectorAll('.form-issue-row')].map(row => ({
        issue: row.querySelector('.form-issue')?.value || '',
        status: row.querySelector('.form-issue-status')?.value || '',
        note: row.querySelector('.form-issue-note')?.value || ''
      }));
      this.renderIssueRows(issues);
    }

    this.fillFormFromCurrentUser();
    this.renderTimePickerColumns();
    this.updateStepCompletion();
    this.updateLivePreview();
    this.renderReportsTable();
    this.renderIssuesDashboard();
    this.updateIssuesStatsAndBadge();
    this.renderAuthNav();
    this.updateDbIndicator(Storage.isDbOnline);
    this.showToast(this.t('toastLangSwitched'), 'success');
  }

  populateRoleDropdowns() {
    const publicRoleOptions = [
      { value: 'ប្រធានសាខា', km: 'ប្រធានសាខា (Branch Manager)', en: 'Branch Manager' },
      { value: 'អនុប្រធានសាខា', km: 'អនុប្រធានសាខា (Deputy Branch Manager)', en: 'Deputy Branch Manager' },
      { value: 'បុគ្គលិកប្រតិបត្តិការ', km: 'បុគ្គលិកប្រតិបត្តិការ (Operations Staff)', en: 'Operations Staff' },
      { value: 'ផ្នែកសេវាអតិថិជន', km: 'ផ្នែកសេវាអតិថិជន (Customer Service)', en: 'Customer Service' },
      { value: 'នាយកដ្ឋានប្រតិបត្តិការ (Admin)', km: 'នាយកដ្ឋានប្រតិបត្តិការ (Admin / HQ)', en: 'Operations Directorate (Admin / HQ)' }
    ];

    const adminRoleOptions = [
      ...publicRoleOptions,
      { value: 'គណៈគ្រប់គ្រងជាន់ខ្ពស់ (Top Management)', km: 'គណៈគ្រប់គ្រងជាន់ខ្ពស់ (Top Management)', en: 'Top Management' }
    ];

    const publicSelects = [
      document.getElementById('screen-reg-role'),
      document.getElementById('reg-role')
    ];

    publicSelects.forEach(select => {
      if (!select) return;
      const currentVal = select.value || 'បុគ្គលិកប្រតិបត្តិការ';
      select.innerHTML = '';
      publicRoleOptions.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.value;
        opt.textContent = this.currentLang === 'en' ? r.en : r.km;
        if (r.value === currentVal) opt.selected = true;
        select.appendChild(opt);
      });
    });

    const adminSelect = document.getElementById('admin-add-role');
    if (adminSelect) {
      const currentVal = adminSelect.value || 'បុគ្គលិកប្រតិបត្តិការ';
      adminSelect.innerHTML = '';
      adminRoleOptions.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.value;
        opt.textContent = this.currentLang === 'en' ? r.en : r.km;
        if (r.value === currentVal) opt.selected = true;
        adminSelect.appendChild(opt);
      });
    }
  }

  translateDefaultFormFields(targetLang) {
    const defaults = {
      'form-cleanliness': {
        km: 'ស្ថានភាពអនាម័យ និងភាពរៀបរយក្នុង-ក្រៅសាខា',
        en: 'Cleanliness and orderliness inside and outside the branch'
      },
      'form-work-status': {
        km: 'បញ្ញើរអីវ៉ាន់ សម្រាប់ភ្ញៀវVIPនិងកំពុងស្វែងរកភ្ញៀវបន្ថែម',
        en: 'Parcel delivery for VIP customers and expanding customer inquiries'
      },
      'form-challenges': {
        km: 'អីវ៉ាន់ដឹកអត់ដល់ កង់បីអស់ថ្ម អីវ៉ាន់ខ្លះសល់ទុកដឹកស្អែកសម្រួលជាមួយភ្ញៀវដឹកជូនថ្ងៃស្អែក',
        en: 'Delivery delays due to vehicle battery, remaining packages coordinated for tomorrow'
      },
      'form-accomplished': {
        km: 'ដោះស្រាយអីវ៉ាន់ដែលដឹកអត់ដល់និងសម្រួលដឹកអីវ៉ាន់ដែលជាប់ខូច',
        en: 'Resolved delayed delivery parcels and handled damaged packages'
      },
      'form-unresolved': {
        km: 'អីវ៉ាន់ដឹកអត់ដល់ទុកដឹកស្អែក',
        en: 'Pending packages postponed to tomorrow morning'
      },
      'form-security': {
        km: 'អីវ៉ាន់ដែលនៅសល់ទុកដាក់នៅកន្លែងមានផាសុខភាពនិងមិនសើម',
        en: 'All leftover parcels stored safely in dry, organized location'
      },
      'form-position': {
        km: 'ប្រធានសាខា',
        en: 'Branch Manager'
      }
    };

    Object.keys(defaults).forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const val = el.value.trim();
      const def = defaults[id];
      if (val === def.km || val === def.en) {
        el.value = def[targetLang];
      }
    });

    if (this.currentReport) {
      Object.keys(defaults).forEach(id => {
        const def = defaults[id];
        const fieldKey = {
          'form-cleanliness': 'cleanlinessStatus',
          'form-work-status': 'workStatus',
          'form-challenges': 'operationChallenges',
          'form-accomplished': 'accomplishedTasks',
          'form-unresolved': 'unresolvedIssues',
          'form-security': 'packageSecurity',
          'form-position': 'position'
        }[id];
        if (fieldKey && (this.currentReport[fieldKey] === def.km || this.currentReport[fieldKey] === def.en)) {
          this.currentReport[fieldKey] = def[targetLang];
        }
      });
    }
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

    // Keep the theme switcher labels in the selected language as well.
    const themeLabels = this.currentLang === 'km'
      ? { light: 'ភ្លឺ', dark: 'ងងឹត' }
      : { light: 'Light', dark: 'Dark' };
    document.querySelectorAll('.theme-light-text').forEach(el => { el.textContent = themeLabels.light; });
    document.querySelectorAll('.theme-dark-text').forEach(el => { el.textContent = themeLabels.dark; });
    document.querySelectorAll('.btn-theme-toggle-all').forEach(btn => {
      btn.title = dict.themeToggleTitle || (this.currentLang === 'km' ? 'ប្តូរពន្លឺ' : 'Toggle Theme');
    });
  }

  initTheme() {
    const storedTheme = localStorage.getItem('bs_express_theme');
    const savedTheme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark';
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
      const now = new Date();
      const clockEl = document.getElementById('live-time-display');
      if (clockEl) {
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        const timeSpan = clockEl.querySelector('.clock-time');
        if (timeSpan) {
          timeSpan.textContent = timeStr;
        } else {
          clockEl.textContent = timeStr;
        }
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  populateBranchDropdowns() {
    const branchSelect = document.getElementById('form-branch');
    const sidebarBranchSelect = document.getElementById('sidebar-branch-select');
    const filterBranch = document.getElementById('filter-branch');
    const filterIssueBranch = document.getElementById('filter-issue-branch');
    const regBranchSelect = document.getElementById('reg-branch');

    const prevFormBranch = branchSelect?.value || this.currentReport?.branch || '';
    const prevFilterBranch = filterBranch?.value || '';
    const prevFilterIssueBranch = filterIssueBranch?.value || '';
    const prevRegBranch = regBranchSelect?.value || '';

    const isEn = this.currentLang === 'en';
    const allBranches = isEn ? BRANCH_LIST_EN : BRANCH_LIST;
    const userBranch = String(this.currentUser?.branch || '').trim();
    const isRestrictedUser = Boolean(userBranch && !this.isCurrentUserAdminOrTopMgmt());
    const canonicalUserBranch = this.getCanonicalBranch(userBranch);
    const userBranchIndex = BRANCH_LIST.indexOf(canonicalUserBranch);

    const formBranchOptions = isRestrictedUser && userBranchIndex >= 0
      ? [{ value: isEn ? (BRANCH_LIST_EN[userBranchIndex] || canonicalUserBranch) : canonicalUserBranch, label: isEn ? (BRANCH_LIST_EN[userBranchIndex] || canonicalUserBranch) : canonicalUserBranch }]
      : allBranches.map(branch => ({ value: branch, label: branch }));

    const filterBranchOptions = isRestrictedUser
      ? formBranchOptions
      : allBranches.map(branch => ({ value: branch, label: branch }));

    const populateSelect = (el, defaultBranch) => {
      if (!el) return;
      const prevVal = el.value || defaultBranch || '';
      el.innerHTML = '';
      allBranches.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        el.appendChild(opt);
      });
      this.setSelectBranch(el, prevVal || (isEn ? 'Kratie' : 'ក្រចេះ'));
    };

    populateSelect(regBranchSelect, prevRegBranch);
    populateSelect(document.getElementById('screen-reg-branch'), document.getElementById('screen-reg-branch')?.value);
    populateSelect(document.getElementById('admin-add-branch'), document.getElementById('admin-add-branch')?.value);
    populateSelect(document.getElementById('morning-branch'), document.getElementById('morning-branch')?.value);

    if (isRestrictedUser) {
      if (filterBranch) {
        filterBranch.innerHTML = '';
      }
      if (filterIssueBranch) {
        filterIssueBranch.innerHTML = '';
      }
    } else {
      if (filterBranch) {
        filterBranch.innerHTML = `<option value="" data-i18n="filterAllBranches">${this.t('filterAllBranches')}</option>`;
      }
      if (filterIssueBranch) {
        filterIssueBranch.innerHTML = `<option value="" data-i18n="filterAllBranches">${this.t('filterAllBranches')}</option>`;
      }
    }

    if (branchSelect) {
      branchSelect.innerHTML = '';
      if (sidebarBranchSelect) sidebarBranchSelect.innerHTML = '';

      formBranchOptions.forEach(({ value, label }) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        branchSelect.appendChild(opt);

        if (sidebarBranchSelect) {
          const optSidebar = document.createElement('option');
          optSidebar.value = value;
          optSidebar.textContent = label;
          sidebarBranchSelect.appendChild(optSidebar);
        }
      });

      branchSelect.classList.remove('d-none');
      branchSelect.required = true;

      if (isRestrictedUser && formBranchOptions[0]) {
        branchSelect.value = formBranchOptions[0].value;
        branchSelect.disabled = true;
        branchSelect.classList.add('is-locked');
      } else {
        this.setSelectBranch(branchSelect, prevFormBranch || (isEn ? 'Kratie' : 'ក្រចេះ'));
        branchSelect.disabled = false;
        branchSelect.classList.remove('is-locked');
      }

      if (sidebarBranchSelect) {
        this.setSelectBranch(sidebarBranchSelect, branchSelect.value);
      }
    }

    filterBranchOptions.forEach(({ value, label }) => {
      if (filterBranch) {
        const optFilter = document.createElement('option');
        optFilter.value = value;
        optFilter.textContent = label;
        filterBranch.appendChild(optFilter);
      }

      if (filterIssueBranch) {
        const optIssueFilter = document.createElement('option');
        optIssueFilter.value = value;
        optIssueFilter.textContent = label;
        filterIssueBranch.appendChild(optIssueFilter);
      }
    });

    if (isRestrictedUser) {
      if (filterBranch && formBranchOptions[0]) {
        filterBranch.value = formBranchOptions[0].value;
        filterBranch.disabled = true;
        filterBranch.classList.add('is-locked');
      }
      if (filterIssueBranch && formBranchOptions[0]) {
        filterIssueBranch.value = formBranchOptions[0].value;
        filterIssueBranch.disabled = true;
        filterIssueBranch.classList.add('is-locked');
      }
    } else {
      if (filterBranch) {
        filterBranch.disabled = false;
        filterBranch.classList.remove('is-locked');
        if (prevFilterBranch) this.setSelectBranch(filterBranch, prevFilterBranch);
      }
      if (filterIssueBranch) {
        filterIssueBranch.disabled = false;
        filterIssueBranch.classList.remove('is-locked');
        if (prevFilterIssueBranch) this.setSelectBranch(filterIssueBranch, prevFilterIssueBranch);
      }
    }

    if (sidebarBranchSelect && !sidebarBranchSelect.dataset.listenerBound) {
      sidebarBranchSelect.dataset.listenerBound = 'true';
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
        this.updateStepCompletion();
      });

      form.addEventListener('change', () => {
        this.syncFormToReport();
        this.updateLivePreview();
        this.updateStepCompletion();
      });
    }
    // Dynamic Multi-Item Repeater Add Buttons
    document.getElementById('btn-add-work-status')?.addEventListener('click', () => {
      const inputs = [...document.querySelectorAll('#work-status-list .work-status-input')].map(i => i.value);
      this.renderWorkStatusRows([...inputs, '']);
      const newInputs = document.querySelectorAll('#work-status-list .work-status-input');
      const lastInput = newInputs[newInputs.length - 1];
      if (lastInput) lastInput.focus();
      this.syncFormToReport();
      this.updateLivePreview();
      this.updateStepCompletion();
    });

    document.getElementById('btn-add-challenges')?.addEventListener('click', () => {
      const inputs = [...document.querySelectorAll('#challenges-list .challenges-input')].map(i => i.value);
      this.renderChallengesRows([...inputs, '']);
      const newInputs = document.querySelectorAll('#challenges-list .challenges-input');
      const lastInput = newInputs[newInputs.length - 1];
      if (lastInput) lastInput.focus();
      this.syncFormToReport();
      this.updateLivePreview();
      this.updateStepCompletion();
    });

    document.getElementById('btn-add-accomplished')?.addEventListener('click', () => {
      const inputs = [...document.querySelectorAll('#accomplished-list .accomplished-input')].map(i => i.value);
      this.renderAccomplishedRows([...inputs, '']);
      const newInputs = document.querySelectorAll('#accomplished-list .accomplished-input');
      const lastInput = newInputs[newInputs.length - 1];
      if (lastInput) lastInput.focus();
      this.syncFormToReport();
      this.updateLivePreview();
      this.updateStepCompletion();
    });

    document.getElementById('btn-add-security')?.addEventListener('click', () => {
      const inputs = [...document.querySelectorAll('#security-list .security-input')].map(i => i.value);
      this.renderSecurityRows([...inputs, '']);
      const newInputs = document.querySelectorAll('#security-list .security-input');
      const lastInput = newInputs[newInputs.length - 1];
      if (lastInput) lastInput.focus();
      this.syncFormToReport();
      this.updateLivePreview();
      this.updateStepCompletion();
    });

    document.getElementById('btn-add-issue')?.addEventListener('click', () => {
      const values = [...document.querySelectorAll('.form-issue-row')].map(row => ({
        issue: row.querySelector('.form-issue')?.value || '',
        status: row.querySelector('.form-issue-status')?.value || '',
        note: row.querySelector('.form-issue-note')?.value || ''
      }));
      this.renderIssueRows([...values, { issue: '', status: '' }]);
      const newRows = document.querySelectorAll('.form-issue-row');
      const lastRow = newRows[newRows.length - 1];
      const issueInput = lastRow?.querySelector('.form-issue');
      if (issueInput) issueInput.focus();
      this.syncFormToReport();
      this.updateLivePreview();
    });

    document.getElementById('btn-pull-prev-issues')?.addEventListener('click', () => {
      this.pullPreviousIncompleteIssues();
    });

    // Quick tag chips click
    document.querySelectorAll('.quick-tag').forEach(tag => {
      tag.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target;
        const text = e.currentTarget.textContent.trim();

        if (targetId === 'form-work-status') {
          const inputs = [...document.querySelectorAll('#work-status-list .work-status-input')];
          const emptyInput = inputs.find(i => !i.value.trim());
          if (emptyInput) {
            emptyInput.value = text;
          } else {
            this.renderWorkStatusRows([...inputs.map(i => i.value), text]);
          }
          this.syncFormToReport();
          this.updateLivePreview();
          this.updateStepCompletion();
          this.showToast(this.t('toastQuickAdd'), 'success');
          return;
        }

        if (targetId === 'form-challenges') {
          const inputs = [...document.querySelectorAll('#challenges-list .challenges-input')];
          const emptyInput = inputs.find(i => !i.value.trim());
          if (emptyInput) {
            emptyInput.value = text;
          } else {
            this.renderChallengesRows([...inputs.map(i => i.value), text]);
          }
          this.syncFormToReport();
          this.updateLivePreview();
          this.updateStepCompletion();
          this.showToast(this.t('toastQuickAdd'), 'success');
          return;
        }

        if (targetId === 'form-accomplished') {
          const inputs = [...document.querySelectorAll('#accomplished-list .accomplished-input')];
          const emptyInput = inputs.find(i => !i.value.trim());
          if (emptyInput) {
            emptyInput.value = text;
          } else {
            this.renderAccomplishedRows([...inputs.map(i => i.value), text]);
          }
          this.syncFormToReport();
          this.updateLivePreview();
          this.updateStepCompletion();
          this.showToast(this.t('toastQuickAdd'), 'success');
          return;
        }

        if (targetId === 'form-security') {
          const inputs = [...document.querySelectorAll('#security-list .security-input')];
          const emptyInput = inputs.find(i => !i.value.trim());
          if (emptyInput) {
            emptyInput.value = text;
          } else {
            this.renderSecurityRows([...inputs.map(i => i.value), text]);
          }
          this.syncFormToReport();
          this.updateLivePreview();
          this.updateStepCompletion();
          this.showToast(this.t('toastQuickAdd'), 'success');
          return;
        }

        if (targetId === 'form-position' && this.currentUser) {
          this.showToast(this.t('toastFieldLocked'), 'warning');
          return;
        }

        const targetInput = document.getElementById(targetId);
        if (targetInput) {
          if (targetInput.readOnly) {
            this.showToast(this.t('toastFieldLocked'), 'warning');
            return;
          }
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

    // Theme toggle button(s) — covers both auth screen & navbar
    document.querySelectorAll('.btn-theme-toggle-all').forEach(btn => {
      btn.addEventListener('click', () => {
        this.toggleTheme();
      });
    });

    // Real-Time Time Tracking Buttons (Opening & Closing Time)
    document.getElementById('btn-track-opening-time')?.addEventListener('click', () => {
      const timeStr = this.getCurrentFormattedTime();
      const input = document.getElementById('form-opening-time');
      if (input) {
        input.value = timeStr;
        input.classList.remove('field-invalid', 'shake-invalid');
        this.syncFormToReport();
        this.updateLivePreview();
        this.updateStepCompletion();
        this.showToast(this.currentLang === 'en' ? `🕒 Opening time tracked: ${timeStr}` : `🕒 ម៉ោងបើកសាខាត្រូវបានកំណត់៖ ${timeStr}`, 'primary');
      }
    });

    document.getElementById('btn-track-closing-time')?.addEventListener('click', () => {
      const timeStr = this.getCurrentFormattedTime();
      const input = document.getElementById('form-closing-time');
      if (input) {
        input.value = timeStr;
        input.classList.remove('field-invalid', 'shake-invalid');
        this.syncFormToReport();
        this.updateLivePreview();
        this.updateStepCompletion();
        this.showToast(this.currentLang === 'en' ? `🕒 Closing time tracked: ${timeStr}` : `🕒 ម៉ោងបិទសាខាត្រូវបានកំណត់៖ ${timeStr}`, 'primary');
      }
    });

    // Quick Time Tag Chips (Now, 6:00Am, 6:30Am, 11:00Pm, etc.)
    document.querySelectorAll('.quick-tag-time').forEach(tag => {
      tag.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target;
        const timeVal = e.currentTarget.dataset.time;
        const input = document.getElementById(targetId);
        if (input) {
          const finalTime = timeVal === 'now' ? this.getCurrentFormattedTime() : timeVal;
          input.value = finalTime;
          input.classList.remove('field-invalid', 'shake-invalid');
          this.syncFormToReport();
          this.updateLivePreview();
          this.updateStepCompletion();
          this.showToast(this.currentLang === 'en' ? `🕒 Time set to: ${finalTime}` : `🕒 ម៉ោងត្រូវបានកំណត់៖ ${finalTime}`, 'primary');
        }
      });
    });

    // Action Buttons
    document.getElementById('btn-sync-user-step1')?.addEventListener('click', () => {
      this.fillFormFromCurrentUser();
      this.showToast(this.t('toastAccountSynced') || 'បានធ្វើសមកាលកម្មទិន្នន័យពីគណនីជោគជ័យ!', 'success');
    });

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
      const reports = this.getAccessibleReports();
      ExportUtil.exportToCsv(reports);
      this.showToast(this.t('toastExportedCsv'), 'success');
    });

    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      const reports = this.getAccessibleReports();
      ExportUtil.backupJson(reports);
      this.showToast(this.t('toastBackupJson'), 'success');
    });

    document.getElementById('btn-print-history')?.addEventListener('click', () => {
      this.printHistoryTable();
    });

    // 1-Click JSON Backup Import & Restore
    const btnImportJson = document.getElementById('btn-import-json');
    const inputImportJson = document.getElementById('input-import-json');

    if (btnImportJson && inputImportJson) {
      btnImportJson.addEventListener('click', () => {
        inputImportJson.value = '';
        inputImportJson.click();
      });

      inputImportJson.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const rawContent = event.target.result;
            const parsed = JSON.parse(rawContent);
            
            let reportsList = [];
            if (Array.isArray(parsed)) {
              reportsList = parsed;
            } else if (parsed && typeof parsed === 'object') {
              // In case it was wrapped in { reports: [...] }
              if (Array.isArray(parsed.reports)) reportsList = parsed.reports;
              else if (Array.isArray(parsed.data)) reportsList = parsed.data;
              else reportsList = Object.values(parsed);
            }

            if (reportsList.length === 0) {
              this.showToast(this.currentLang === 'en' ? 'No valid report records found in file.' : 'រកមិនឃើញទិន្នន័យរបាយការណ៍ត្រឹមត្រូវក្នុងឯកសារនេះទេ!', 'error');
              return;
            }

            const res = Storage.mergeImportedReports(reportsList);
            if (res && res.success) {
              this.renderReportsTable();
              this.updateStats();
              this.renderIssuesDashboard();
              this.updateIssuesStatsAndBadge();
              const successMsg = this.currentLang === 'en' 
                ? `Successfully imported ${res.added} reports from backup!`
                : `បានបញ្ចូល ${res.added} របាយការណ៍ពី Backup JSON រួចរាល់ដោយជោគជ័យ!`;
              this.showToast(successMsg, 'success');
            } else {
              this.showToast(this.currentLang === 'en' ? 'Failed to merge reports.' : 'មិនអាចបញ្ចូលរបាយការណ៍បានទេ!', 'error');
            }
          } catch (err) {
            console.error('Error importing backup JSON:', err);
            this.showToast(this.currentLang === 'en' ? 'Invalid JSON backup format.' : 'ទម្រង់ឯកសារ JSON មិនត្រឹមត្រូវ!', 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    // Auto-Save Draft on Form Input
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
      const triggerAutoSave = () => {
        const draft = this.getFormData();
        Storage.saveDraft(draft);
        const indicator = document.getElementById('draft-autosave-text');
        if (indicator) {
          indicator.textContent = this.currentLang === 'en' ? 'Saved just now 🟢' : 'បានរក្សាទុកព្រាង 🟢';
        }
      };

      reportForm.addEventListener('input', (e) => {
        if (e.target && e.target.classList.contains('field-invalid')) {
          e.target.classList.remove('field-invalid', 'shake-invalid');
        }
        this.updateLivePreview();
        this.updateStepCompletion();
        clearTimeout(this._draftTimeout);
        this._draftTimeout = setTimeout(triggerAutoSave, 600);
      });

      reportForm.addEventListener('change', (e) => {
        if (e.target && e.target.classList.contains('field-invalid')) {
          e.target.classList.remove('field-invalid', 'shake-invalid');
        }
        this.updateLivePreview();
        this.updateStepCompletion();
        triggerAutoSave();
      });
    }


    // Photo Uploads with Timestamp Watermark
    this.setupPhotoUploader('opening-photo-input', 'opening-photo-preview', 'opening');
    this.setupPhotoUploader('closing-photo-input', 'closing-photo-preview', 'closing');
    this.setupPhotoUploader('additional-photo-input', 'additional-photo-preview', 'additional');
    this.setupPhotoUploader('morning-photo-input', 'morning-photo-preview', 'morning');

    // Morning Writer Form Buttons & Live Sync
    const morningForm = document.getElementById('morning-report-form');
    if (morningForm) {
      morningForm.addEventListener('input', () => this.updateMorningLivePreview());
      morningForm.addEventListener('change', () => this.updateMorningLivePreview());
    }
    document.getElementById('btn-morning-load-sample')?.addEventListener('click', () => this.loadMorningSampleData());
    document.getElementById('btn-morning-telegram')?.addEventListener('click', () => this.shareMorningFormTelegram());
    document.getElementById('btn-morning-print')?.addEventListener('click', () => this.printMorningDoc());
    document.getElementById('btn-morning-save')?.addEventListener('click', () => this.saveMorningReportForm());

    // Table Search, Filter & Sort
    document.getElementById('search-reports')?.addEventListener('input', () => this.renderReportsTable());
    document.getElementById('filter-branch')?.addEventListener('change', () => this.renderReportsTable());
    document.getElementById('sort-reports')?.addEventListener('change', (e) => {
      this.historySortBy = e.target.value;
      this.renderReportsTable();
    });
    document.getElementById('th-sort-date')?.addEventListener('click', () => this.toggleHistorySort('datetime'));
    document.getElementById('th-sort-branch')?.addEventListener('click', () => this.toggleHistorySort('branch'));
    document.getElementById('filter-approval-status')?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'approved' || val === 'pending') {
        this.historyQuickFilter = val;
      } else {
        this.historyQuickFilter = 'all';
      }
      document.querySelectorAll('.history-filter-chip').forEach(c => {
        if (c.dataset.historyFilter === this.historyQuickFilter) {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });
      this.renderReportsTable();
    });
    document.getElementById('filter-date')?.addEventListener('change', () => this.renderReportsTable());

    document.querySelectorAll('.history-filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.history-filter-chip').forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const filterType = e.currentTarget.dataset.historyFilter || 'all';
        this.historyQuickFilter = filterType;
        
        const approvalSelect = document.getElementById('filter-approval-status');
        if (approvalSelect) {
          if (filterType === 'approved' || filterType === 'pending') {
            approvalSelect.value = filterType;
          } else {
            approvalSelect.value = '';
          }
        }

        this.renderReportsTable();
      });
    });

    document.getElementById('btn-toggle-graph')?.addEventListener('click', () => this.toggleBranchGraph());


    // Morning Shift Matrix Events
    const morningDateInput = document.getElementById('morning-date-filter');
    if (morningDateInput) {
      if (!morningDateInput.value) {
        morningDateInput.value = new Date().toISOString().split('T')[0];
      }
      morningDateInput.addEventListener('change', () => this.renderMorningMatrix());
    }
    document.getElementById('search-morning-branch')?.addEventListener('input', () => this.renderMorningMatrix());
    document.getElementById('filter-morning-status')?.addEventListener('change', () => this.renderMorningMatrix());

    // Issues Dashboard Events
    document.getElementById('btn-refresh-issues')?.addEventListener('click', () => {
      this.renderIssuesDashboard();
      this.showToast(this.currentLang === 'en' ? 'Issues dashboard refreshed!' : 'បានផ្ទុកទិន្នន័យបញ្ហាឡើងវិញរួចរាល់!', 'primary');
    });

    document.getElementById('btn-export-issues-csv')?.addEventListener('click', () => {
      const issues = this.getAllBranchIssues();
      ExportUtil.exportIssuesToCsv(issues);
      this.showToast(this.currentLang === 'en' ? 'Issues exported to CSV!' : 'បានទាញយក CSV បញ្ហារួចរាល់!', 'success');
    });

    document.getElementById('btn-telegram-issues-summary')?.addEventListener('click', () => {
      this.shareAllIncompleteIssuesTg();
    });

    document.getElementById('search-issues')?.addEventListener('input', () => {
      this.renderIssuesDashboard();
    });

    document.getElementById('filter-issue-branch')?.addEventListener('change', () => {
      this.renderIssuesDashboard();
    });

    document.getElementById('filter-issue-status')?.addEventListener('change', () => {
      document.querySelectorAll('.issue-filter-chip').forEach(c => c.classList.remove('active'));
      this.renderIssuesDashboard();
    });

    document.getElementById('filter-issue-date')?.addEventListener('change', () => {
      this.renderIssuesDashboard();
    });

    // Quick filter chips click
    document.querySelectorAll('.issue-filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.issue-filter-chip').forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const filterVal = e.currentTarget.dataset.filter;
        const statusSelect = document.getElementById('filter-issue-status');
        if (statusSelect) {
          if (filterVal === 'incomplete') statusSelect.value = 'incomplete';
          else if (filterVal === 'resolved') statusSelect.value = 'complete';
          else statusSelect.value = 'all';
        }
        this.renderIssuesDashboard();
      });
    });

    // Telegram Modal actions
    document.getElementById('btn-modal-copy-tg')?.addEventListener('click', () => {
      const text = document.getElementById('telegram-content')?.textContent || '';
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

    // Stepperize Step Item Click - free navigation
    document.querySelectorAll('.stepperize-step-item, .step-node').forEach(node => {
      node.addEventListener('click', (e) => {
        const stepNum = parseInt(e.currentTarget.dataset.step);
        if (stepNum) {
          this.goToStep(stepNum);
        }
      });
    });

    // Close Modals
    document.querySelectorAll('.modal-close-btn, .modal-close-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      });
    });
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  /* =========================================================================
     24-HOUR & 60-MINUTE TIME PICKER WORKFLOW (MODERN DUAL-MATRIX)
     ========================================================================= */
  initTimePicker() {
    this.selectedTpHour = 6;
    this.selectedTpMinute = 0;
    this.timePickerTargetInputId = 'form-opening-time';

    this.renderTimePickerColumns();

    // Trigger on clicking input or button for opening time
    document.getElementById('form-opening-time')?.addEventListener('click', () => {
      this.openTimePicker('form-opening-time');
    });
    document.getElementById('btn-open-tp-opening')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openTimePicker('form-opening-time');
    });
    document.querySelector('#form-opening-time')?.parentElement?.addEventListener('click', (e) => {
      if (e.target.closest('.btn-input-action')) return;
      this.openTimePicker('form-opening-time');
    });

    // Trigger on clicking input or button for closing time
    document.getElementById('form-closing-time')?.addEventListener('click', () => {
      this.openTimePicker('form-closing-time');
    });
    document.getElementById('btn-open-tp-closing')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openTimePicker('form-closing-time');
    });
    document.querySelector('#form-closing-time')?.parentElement?.addEventListener('click', (e) => {
      if (e.target.closest('.btn-input-action')) return;
      this.openTimePicker('form-closing-time');
    });

    // Preset chips
    document.querySelectorAll('.tp-preset-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const h = parseInt(e.currentTarget.dataset.tpHour, 10);
        const m = parseInt(e.currentTarget.dataset.tpMin, 10);
        if (!isNaN(h) && !isNaN(m)) {
          this.setTimePickerHour(h);
          this.setTimePickerMinute(m);
        }
      });
    });

    // Stepper buttons
    document.getElementById('btn-tp-min-minus')?.addEventListener('click', () => {
      const nextMin = (this.selectedTpMinute - 1 + 60) % 60;
      this.setTimePickerMinute(nextMin);
    });

    document.getElementById('btn-tp-min-plus')?.addEventListener('click', () => {
      const nextMin = (this.selectedTpMinute + 1) % 60;
      this.setTimePickerMinute(nextMin);
    });

    // Minute Range Slider
    document.getElementById('tp-minute-slider')?.addEventListener('input', (e) => {
      const m = parseInt(e.target.value, 10);
      if (!isNaN(m)) {
        this.setTimePickerMinute(m);
      }
    });

    // AM/PM toggle button
    document.getElementById('tp-ampm-btn')?.addEventListener('click', () => {
      let h = this.selectedTpHour;
      if (h < 12) {
        h += 12; // Switch to PM
      } else {
        h -= 12; // Switch to AM
      }
      this.setTimePickerHour(h);
    });

    // Now button
    document.getElementById('btn-tp-now')?.addEventListener('click', () => {
      const now = new Date();
      this.setTimePickerHour(now.getHours());
      this.setTimePickerMinute(now.getMinutes());
    });

    // Confirm button
    document.getElementById('btn-tp-confirm')?.addEventListener('click', () => {
      this.confirmTimePickerSelection();
    });
  }

  renderTimePickerColumns() {
    const hoursContainer = document.getElementById('tp-hours-grid');
    const minutesContainer = document.getElementById('tp-minutes-grid');
    if (!hoursContainer || !minutesContainer) return;

    // 1. 24 Hours (00 - 23 in 6x4 compact matrix)
    let hoursHtml = '';
    for (let h = 0; h < 24; h++) {
      const hStr = String(h).padStart(2, '0');
      const isPm = h >= 12;

      hoursHtml += `
        <button type="button" class="tp-hour-tile ${isPm ? 'is-pm' : ''}" data-hour="${h}" onclick="window.bsApp &amp;&amp; window.bsApp.setTimePickerHour(${h})" ondblclick="window.bsApp &amp;&amp; window.bsApp.confirmTimePickerSelection()" title="ម៉ោង ${hStr}:00 (Double click to complete)">
          <span>${hStr}</span>
        </button>
      `;
    }
    hoursContainer.innerHTML = hoursHtml;

    // 2. 12 Quick 5-min intervals (:00, :05, ... :55)
    let minutesHtml = '';
    const intervals = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    intervals.forEach(m => {
      const mStr = String(m).padStart(2, '0');
      minutesHtml += `
        <button type="button" class="tp-minute-tile" data-minute="${m}" onclick="window.bsApp &amp;&amp; window.bsApp.setTimePickerMinute(${m})" ondblclick="window.bsApp &amp;&amp; window.bsApp.confirmTimePickerSelection()" title=":${mStr} នាទី (Double click to complete)">
          <span>:${mStr}</span>
        </button>
      `;
    });
    minutesContainer.innerHTML = minutesHtml;
  }

  renderTimePickerPresets(isClosing = false) {
    const container = document.getElementById('tp-quick-presets-container');
    if (!container) return;

    const presets = isClosing ? [
      { h: 17, m: 0, label: '05:00 PM' },
      { h: 18, m: 0, label: '06:00 PM' },
      { h: 19, m: 0, label: '07:00 PM' },
      { h: 20, m: 0, label: '08:00 PM' },
      { h: 21, m: 0, label: '09:00 PM' },
      { h: 22, m: 0, label: '10:00 PM' },
      { h: 23, m: 0, label: '11:00 PM' }
    ] : [
      { h: 6, m: 0, label: '06:00 AM' },
      { h: 6, m: 30, label: '06:30 AM' },
      { h: 7, m: 0, label: '07:00 AM' },
      { h: 7, m: 30, label: '07:30 AM' },
      { h: 8, m: 0, label: '08:00 AM' },
      { h: 8, m: 30, label: '08:30 AM' }
    ];

    container.innerHTML = presets.map(p => `
      <button type="button" class="tp-preset-chip" data-tp-hour="${p.h}" data-tp-min="${p.m}" onclick="window.bsApp &amp;&amp; window.bsApp.selectAndConfirmTime(${p.h}, ${p.m})">
        ${p.label}
      </button>
    `).join('');
  }

  setDirectTime(targetId, formattedTime) {
    const input = document.getElementById(targetId);
    if (!input) return;
    input.value = formattedTime;
    input.classList.remove('field-invalid', 'shake-invalid');

    try {
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (e) {}

    if (!this.currentReport) this.currentReport = {};
    if (targetId === 'form-opening-time') {
      this.currentReport.openingTime = formattedTime;
    } else if (targetId === 'form-closing-time') {
      this.currentReport.closingTime = formattedTime;
    }

    if (typeof this.syncFormToReport === 'function') {
      try { this.syncFormToReport(); } catch (e) {}
    }
    if (typeof this.updateLivePreview === 'function') {
      try { this.updateLivePreview(); } catch (e) {}
    }
    if (typeof this.updateStepCompletion === 'function') {
      try { this.updateStepCompletion(); } catch (e) {}
    }
    if (Storage && typeof Storage.saveDraft === 'function' && typeof this.getFormData === 'function') {
      try { Storage.saveDraft(this.getFormData()); } catch (e) {}
    }

    const label = targetId === 'form-opening-time'
      ? (this.currentLang === 'en' ? 'Opening Time' : 'ម៉ោងបើកសាខា')
      : (this.currentLang === 'en' ? 'Closing Time' : 'ម៉ោងបិទសាខា');

    if (typeof this.showToast === 'function') {
      this.showToast(this.currentLang === 'en' ? `✓ ${label} set to ${formattedTime}` : `✓ ${label}ត្រូវបានកំណត់៖ ${formattedTime}`, 'success');
    }
  }

  openTimePicker(targetInputId) {
    this.timePickerTargetInputId = targetInputId || 'form-opening-time';
    const isClosing = this.timePickerTargetInputId === 'form-closing-time';
    const input = document.getElementById(this.timePickerTargetInputId);
    
    // Render context-specific presets (Morning for opening, Evening/Night for closing)
    this.renderTimePickerPresets(isClosing);

    // Set modal titles depending on opening or closing
    const titleEl = document.getElementById('time-picker-title');
    const isEn = this.currentLang === 'en';
    if (titleEl) {
      if (!isClosing) {
        titleEl.textContent = isEn ? 'Select Opening Time (24h & 60m)' : 'ជ្រើសរើសម៉ោងបើកសាខា (24h & 60m)';
      } else {
        titleEl.textContent = isEn ? 'Select Closing Time (24h & 60m)' : 'ជ្រើសរើសម៉ោងបិទសាខា (24h & 60m)';
      }
    }

    let initialHour = isClosing ? 23 : 6;
    let initialMinute = 0;

    if (input && input.value.trim()) {
      const val = input.value.trim();
      const match = val.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ampm = match[3] ? match[3].toLowerCase() : null;
        if (ampm === 'pm' && h < 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;
        if (!isNaN(h) && h >= 0 && h < 24) initialHour = h;
        if (!isNaN(m) && m >= 0 && m < 60) initialMinute = m;
      }
    }

    this.setTimePickerHour(initialHour, false);
    this.setTimePickerMinute(initialMinute, false);
    this.updateTimePickerDisplay();

    this.openModal('time-picker-modal');
  }

  setTimePickerHour(hour, updateDisplay = true) {
    this.selectedTpHour = Math.max(0, Math.min(23, hour));
    document.querySelectorAll('.tp-hour-tile').forEach(btn => {
      const h = parseInt(btn.dataset.hour, 10);
      btn.classList.toggle('active', h === this.selectedTpHour);
    });
    this.syncPresetActiveState();
    if (updateDisplay) this.updateTimePickerDisplay();
  }

  setTimePickerMinute(minute, updateDisplay = true) {
    this.selectedTpMinute = Math.max(0, Math.min(59, minute));
    document.querySelectorAll('.tp-minute-tile').forEach(btn => {
      const m = parseInt(btn.dataset.minute, 10);
      btn.classList.toggle('active', m === this.selectedTpMinute);
    });
    const slider = document.getElementById('tp-minute-slider');
    if (slider) slider.value = this.selectedTpMinute;
    this.syncPresetActiveState();
    if (updateDisplay) this.updateTimePickerDisplay();
  }

  selectAndConfirmTime(hour, minute) {
    this.setTimePickerHour(hour, false);
    this.setTimePickerMinute(minute, false);
    this.confirmTimePickerSelection();
  }

  setTimePickerToNow() {
    const now = new Date();
    this.setTimePickerHour(now.getHours(), false);
    this.setTimePickerMinute(now.getMinutes(), true);
  }

  syncPresetActiveState() {
    document.querySelectorAll('.tp-preset-chip').forEach(chip => {
      const h = parseInt(chip.dataset.tpHour, 10);
      const m = parseInt(chip.dataset.tpMin, 10);
      chip.classList.toggle('active', h === this.selectedTpHour && m === this.selectedTpMinute);
    });
  }

  updateTimePickerDisplay() {
    const h = this.selectedTpHour !== undefined ? this.selectedTpHour : 6;
    const m = this.selectedTpMinute !== undefined ? this.selectedTpMinute : 0;
    const hStr = String(h).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h >= 12 ? 'PM' : 'AM';

    const dispHour = document.getElementById('tp-disp-hour');
    const dispMin = document.getElementById('tp-disp-minute');
    const ampmBtn = document.getElementById('tp-ampm-btn');
    const disp24h = document.getElementById('tp-disp-24h');
    const stepDispMin = document.getElementById('tp-step-disp-min');
    const sliderVal = document.getElementById('tp-slider-val');
    const confirmBtnText = document.getElementById('btn-tp-confirm-text');

    if (dispHour) dispHour.textContent = String(h12).padStart(2, '0');
    if (dispMin) dispMin.textContent = mStr;
    if (ampmBtn) ampmBtn.textContent = ampm;
    if (disp24h) disp24h.textContent = `24H: ${hStr}:${mStr}`;
    if (stepDispMin) stepDispMin.textContent = `:${mStr}`;
    if (sliderVal) sliderVal.textContent = `:${mStr}`;
    if (confirmBtnText) {
      confirmBtnText.textContent = this.currentLang === 'en'
        ? `Confirm Time (${String(h12).padStart(2, '0')}:${mStr} ${ampm})`
        : `យល់ព្រមជ្រើសរើស (${String(h12).padStart(2, '0')}:${mStr} ${ampm})`;
    }
  }

  confirmTimePickerSelection() {
    if (this._isConfirmingTime) return;
    this._isConfirmingTime = true;
    setTimeout(() => { this._isConfirmingTime = false; }, 300);

    const h = this.selectedTpHour !== undefined ? this.selectedTpHour : 6;
    const m = this.selectedTpMinute !== undefined ? this.selectedTpMinute : 0;
    const mStr = String(m).padStart(2, '0');
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h >= 12 ? 'Pm' : 'Am';
    const formattedTime = `${h12}:${mStr}${ampm}`;

    const targetId = this.timePickerTargetInputId || 'form-opening-time';
    const input = document.getElementById(targetId);
    let label = '';
    if (input) {
      input.value = formattedTime;
      input.classList.remove('field-invalid', 'shake-invalid');

      // Dispatch change and input events to trigger all listeners
      try {
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e) {}
      
      if (!this.currentReport) this.currentReport = {};
      if (targetId === 'form-opening-time') {
        this.currentReport.openingTime = formattedTime;
      } else if (targetId === 'form-closing-time') {
        this.currentReport.closingTime = formattedTime;
      }

      if (typeof this.syncFormToReport === 'function') {
        try { this.syncFormToReport(); } catch (e) { console.warn(e); }
      }
      if (typeof this.updateLivePreview === 'function') {
        try { this.updateLivePreview(); } catch (e) { console.warn(e); }
      }
      if (typeof this.updateStepCompletion === 'function') {
        try { this.updateStepCompletion(); } catch (e) { console.warn(e); }
      }
      if (Storage && typeof Storage.saveDraft === 'function' && typeof this.getFormData === 'function') {
        try { Storage.saveDraft(this.getFormData()); } catch (e) { console.warn(e); }
      }

      label = targetId === 'form-opening-time'
        ? (this.currentLang === 'en' ? 'Opening Time' : 'ម៉ោងបើកសាខា')
        : (this.currentLang === 'en' ? 'Closing Time' : 'ម៉ោងបិទសាខា');

      if (typeof this.showToast === 'function') {
        this.showToast(this.currentLang === 'en' ? `✓ ${label} set to ${formattedTime}` : `✓ ${label}ត្រូវបានកំណត់៖ ${formattedTime}`, 'success');
      }

      try {
        input.focus();
      } catch (e) {}
    }

    // Directly close time-picker-modal and seamlessly return to the form!
    this.closeModal('time-picker-modal');
  }

  showTimeCompleteModal(label, formattedTime, h, m) {
    const isEn = this.currentLang === 'en';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hStr = String(h).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');

    const labelEl = document.getElementById('time-complete-label');
    const valEl = document.getElementById('time-complete-value');
    const h24El = document.getElementById('time-complete-24h');

    if (labelEl) labelEl.textContent = label || (isEn ? 'Selected Time' : 'ម៉ោងដែលបានជ្រើសរើស');
    if (valEl) valEl.textContent = `${String(h12).padStart(2, '0')}:${mStr} ${ampm}`;
    if (h24El) h24El.textContent = `24H: ${hStr}:${mStr}`;

    this.openModal('time-complete-modal');
    setTimeout(() => {
      document.getElementById('btn-time-complete-ok')?.focus();
    }, 50);
  }

  closeTimeCompleteModal() {
    this.closeModal('time-complete-modal');
  }

  goToStep(stepNum) {
    if (stepNum < 1 || stepNum > 5) return false;

    // Sync current form data before checking or navigating
    this.syncFormToReport();

    // If moving forward to a subsequent step:
    if (stepNum > this.currentStep) {
      // Validate every preceding step sequentially from 1 up to stepNum - 1
      for (let s = 1; s < stepNum; s++) {
        if (!this.validateStep(s, true)) {
          // If the failing step is different from the currently displayed step, switch to it
          if (s !== this.currentStep) {
            this.currentStep = s;
            this.renderStepView(s);
            this.validateStep(s, true);
          }
          return false; // PREVENT ADVANCING!
        } else {
          this.completedSteps.add(s);
        }
      }
    }

    // If moving backward or moving forward with all requirements met:
    if (this.validateStep(this.currentStep, false)) {
      this.completedSteps.add(this.currentStep);
    } else {
      this.completedSteps.delete(this.currentStep);
    }

    this.currentStep = stepNum;
    this.renderStepView(stepNum);
    return true;
  }

  renderStepView(stepNum) {
    // Update Stepperize Progress Header & Bar
    const percent = stepNum * 20;
    const currentLabel = document.getElementById('stepperize-current-label');
    const percentLabel = document.getElementById('stepperize-percent-label');
    const progressBar = document.getElementById('stepperize-progress-bar');

    const currentTextTemplate = this.t('stepStatusCurrent') || 'Step 1 of 5';
    const percentTextTemplate = this.t('stepStatusPercent') || '20% Completed';

    if (currentLabel) {
      currentLabel.textContent = currentTextTemplate.replace(/\d+/, String(stepNum));
    }
    if (percentLabel) {
      percentLabel.textContent = percentTextTemplate.replace(/\d+%/, `${percent}%`);
    }
    if (progressBar) progressBar.style.width = `${percent}%`;

    // Update Step Items in Stepperize Bar
    document.querySelectorAll('.stepperize-step-item, .step-node').forEach(node => {
      const s = parseInt(node.dataset.step, 10);
      node.classList.toggle('active', s === stepNum);
      const isComplete = this.completedSteps.has(s);
      node.classList.toggle('completed', isComplete);
      node.classList.remove('locked');
      node.removeAttribute('disabled');
      node.removeAttribute('aria-disabled');
    });

    // Update Connector Lines
    document.querySelectorAll('.stepperize-connector').forEach(conn => {
      const c = parseInt(conn.dataset.connector, 10);
      conn.classList.toggle('completed', c < stepNum || this.completedSteps.has(c));
    });

    // Show Active Step Pane - direct by ID matching
    document.querySelectorAll('.step-pane').forEach((pane) => {
      const isTarget = pane.id === `step-pane-${stepNum}`;
      pane.classList.toggle('active', isTarget);
    });

    // Auto-track current real-time on Step 2 (Opening Time) & Step 4 (Closing Time)
    if (stepNum === 2) {
      const opEl = document.getElementById('form-opening-time');
      if (opEl) {
        if (!opEl.value.trim()) {
          const timeNow = this.getCurrentFormattedTime();
          opEl.value = timeNow;
          if (this.currentReport) this.currentReport.openingTime = timeNow;
        }
        opEl.readOnly = true;
      }
    } else if (stepNum === 4) {
      const clEl = document.getElementById('form-closing-time');
      if (clEl) {
        if (!clEl.value.trim()) {
          const timeNow = this.getCurrentFormattedTime();
          clEl.value = timeNow;
          if (this.currentReport) this.currentReport.closingTime = timeNow;
        }
        clEl.readOnly = true;
      }
    }

    // Auto-scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Sync live preview and update completion badges
    this.syncFormToReport();
    this.updateLivePreview();
    this.updateStepCompletion();
  }

  validateStep(stepNumber, showToastMessage = false) {
    let isValid = true;
    let missingElements = [];
    let errorMsg = '';

    // Clear previous invalid markings in this step pane
    const pane = document.getElementById(`step-pane-${stepNumber}`);
    if (pane) {
      pane.querySelectorAll('.field-invalid, .shake-invalid').forEach(el => {
        el.classList.remove('field-invalid', 'shake-invalid');
      });
    }

    if (stepNumber === 1) {
      const branchEl = document.getElementById('form-branch');
      const dateEl = document.getElementById('form-date');
      const nameEl = document.getElementById('form-name');

      const branchVal = branchEl?.value || this.currentUser?.branch || '';
      const dateVal = dateEl?.value || '';
      const nameVal = nameEl?.value || '';

      if (!branchVal.trim()) {
        isValid = false;
        if (branchEl) missingElements.push(branchEl);
      }
      if (!dateVal.trim()) {
        isValid = false;
        if (dateEl) missingElements.push(dateEl);
      }
      if (!nameVal.trim()) {
        isValid = false;
        if (nameEl) missingElements.push(nameEl);
      }

      errorMsg = this.currentLang === 'en'
        ? 'Please complete all required fields (Branch, Date, Reporter Name) in Step 1!'
        : 'សូមជ្រើសរើសសាខា កាលបរិច្ឆេទ និងបញ្ចូលឈ្មោះអ្នករាយការណ៍ក្នុងជំហានទី ១ (ព័ត៌មានទូទៅ)!';
    } else if (stepNumber === 2) {
      const timeEl = document.getElementById('form-opening-time');
      const presentEl = document.getElementById('form-present-count');
      const cleanEl = document.getElementById('form-cleanliness');

      const timeVal = (timeEl?.value || '').trim();
      const presentVal = presentEl?.value;
      const cleanVal = (cleanEl?.value || '').trim();

      if (!timeVal) {
        isValid = false;
        if (timeEl) missingElements.push(timeEl);
      }
      if (presentVal === '' || presentVal === null || isNaN(Number(presentVal)) || Number(presentVal) < 0) {
        isValid = false;
        if (presentEl) missingElements.push(presentEl);
      }
      if (!cleanVal) {
        isValid = false;
        if (cleanEl) missingElements.push(cleanEl);
      }

      errorMsg = this.currentLang === 'en'
        ? 'Please fill in Opening Time, Staff Attendance, and Cleanliness in Step 2!'
        : 'សូមបំពេញម៉ោងបើកសាខា វត្តមានបុគ្គលិក និងស្ថានភាពអនាម័យក្នុងជំហានទី ២ (ពេលបើកសាខា)!';
    } else if (stepNumber === 3) {
      const workInputs = [...document.querySelectorAll('#work-status-list .work-status-input')].map(i => i.value.trim()).filter(Boolean);
      const workFallback = document.getElementById('form-work-status')?.value?.trim() || '';
      const chalInputs = [...document.querySelectorAll('#challenges-list .challenges-input')].map(i => i.value.trim()).filter(Boolean);
      const chalFallback = document.getElementById('form-challenges')?.value?.trim() || '';

      if (workInputs.length === 0 && !workFallback) {
        isValid = false;
        const workInputsAll = document.querySelectorAll('#work-status-list .work-status-input');
        if (workInputsAll.length > 0) {
          missingElements.push(...workInputsAll);
        } else {
          const addBtn = document.getElementById('btn-add-work-status');
          if (addBtn) missingElements.push(addBtn);
        }
      }
      if (chalInputs.length === 0 && !chalFallback) {
        isValid = false;
        const chalInputsAll = document.querySelectorAll('#challenges-list .challenges-input');
        if (chalInputsAll.length > 0) {
          missingElements.push(...chalInputsAll);
        } else {
          const addBtn = document.getElementById('btn-add-challenges');
          if (addBtn) missingElements.push(addBtn);
        }
      }

      errorMsg = this.currentLang === 'en'
        ? 'Please specify Work Status and Operational Challenges in Step 3!'
        : 'សូមបញ្ចូលស្ថានភាពការងារ និងបញ្ហាប្រឈមប្រតិបត្តិការក្នុងជំហានទី ៣ (ប្រតិបត្តិការ)!';
    } else if (stepNumber === 4) {
      const accInputs = [...document.querySelectorAll('#accomplished-list .accomplished-input')].map(i => i.value.trim()).filter(Boolean);
      const accFallback = document.getElementById('form-accomplished')?.value?.trim() || '';
      const secInputs = [...document.querySelectorAll('#security-list .security-input')].map(i => i.value.trim()).filter(Boolean);
      const secFallback = document.getElementById('form-security')?.value?.trim() || '';
      const closeTimeVal = (document.getElementById('form-closing-time')?.value || '').trim();

      if (accInputs.length === 0 && !accFallback) {
        isValid = false;
        const accInputsAll = document.querySelectorAll('#accomplished-list .accomplished-input');
        if (accInputsAll.length > 0) {
          missingElements.push(...accInputsAll);
        } else {
          const addBtn = document.getElementById('btn-add-accomplished');
          if (addBtn) missingElements.push(addBtn);
        }
      }
      if (secInputs.length === 0 && !secFallback) {
        isValid = false;
        const secInputsAll = document.querySelectorAll('#security-list .security-input');
        if (secInputsAll.length > 0) {
          missingElements.push(...secInputsAll);
        } else {
          const addBtn = document.getElementById('btn-add-security');
          if (addBtn) missingElements.push(addBtn);
        }
      }
      if (!closeTimeVal) {
        isValid = false;
        const closeEl = document.getElementById('form-closing-time');
        if (closeEl) missingElements.push(closeEl);
      }

      errorMsg = this.currentLang === 'en'
        ? 'Please specify Accomplished Tasks, Package Security, and Closing Time in Step 4!'
        : 'សូមបញ្ចូលការងារដែលបានសម្រេច សុវត្ថិភាពបញ្ញើ និងម៉ោងបិទសាខាក្នុងជំហានទី ៤ (ពេលបិទសាខា)!';
    }

    if (!isValid) {
      if (showToastMessage) {
        this.showToast(errorMsg, 'warning');
        missingElements.forEach(el => {
          el.classList.add('field-invalid', 'shake-invalid');
          setTimeout(() => el.classList.remove('shake-invalid'), 600);
        });
        if (missingElements[0] && typeof missingElements[0].focus === 'function') {
          missingElements[0].focus();
        }
      }
      return false;
    }

    return true;
  }

  updateStepCompletion() {
    this.completedSteps.clear();
    for (let s = 1; s <= 4; s++) {
      if (this.validateStep(s, false)) {
        this.completedSteps.add(s);
      }
    }

    document.querySelectorAll('.stepperize-step-item').forEach(node => {
      const step = parseInt(node.dataset.step, 10);
      const complete = this.completedSteps.has(step)
        || (step === 5 && [1, 2, 3, 4].every(previous => this.completedSteps.has(previous)));
      
      const isLocked = step > 1 && !Array.from({ length: step - 1 }, (_, i) => i + 1).every(prev => this.completedSteps.has(prev));
      
      node.classList.toggle('completed', complete);
      node.classList.toggle('active', step === this.currentStep);
      node.classList.toggle('locked', isLocked && step !== this.currentStep);
    });

    document.querySelectorAll('.stepperize-connector').forEach(conn => {
      const c = parseInt(conn.dataset.connector, 10);
      conn.classList.toggle('completed', this.completedSteps.has(c) || c < this.currentStep);
    });
  }

  switchTab(tabId) {
    if (!tabId) return;
    if (tabId === 'form-tab' && this.isViewingSavedReport) {
      this.showToast(this.currentLang === 'en' ? 'Saved reports are view-only. Start a new report to edit.' : 'របាយការណ៍ដែលបានរក្សាទុក អាចមើលបានតែប៉ុណ្ណោះ។ សូមចាប់ផ្តើម Report ថ្មីដើម្បីកែប្រែ។', 'warning');
      return;
    }
    this.activeTab = tabId;
    document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('.tab-panel, .tab-content').forEach(c => c.classList.toggle('active', c.id === tabId));

    if (tabId === 'document-tab' || tabId === 'form-tab') {
      this.updateLivePreview();
    }
    if (tabId === 'morning-tab') {
      this.initMorningForm();
    }
    if (tabId === 'history-tab') {
      this.renderReportsTable();
      this.updateStats();
    }
    if (tabId === 'issues-tab') {
      this.renderIssuesDashboard();
      this.updateIssuesStatsAndBadge();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Auto-carry incomplete issues from Step 2 (Opening) to Step 3 (Daily Operation)
  transferIncompleteIssuesToStep3() {
    const incompleteIssues = this.currentReport.issues?.filter(issue => issue.status === 'incomplete') || [];
    
    if (incompleteIssues.length > 0) {
      // Merge incomplete issues with existing issues in step 3
      const existingIssues = [...document.querySelectorAll('.form-issue-row')].map(row => ({
        issue: row.querySelector('.form-issue')?.value || '',
        status: row.querySelector('.form-issue-status')?.value || '',
        note: row.querySelector('.form-issue-note')?.value || ''
      })).filter(item => item.issue || item.status);
      
      // Combine: first show existing issues, then add incomplete ones from Step 2
      const mergedIssues = [...existingIssues];
      
      incompleteIssues.forEach(incomplete => {
        // Only add if not already present
        if (!mergedIssues.some(e => e.issue === incomplete.issue)) {
          mergedIssues.push({
            issue: incomplete.issue,
            status: 'incomplete', // Mark as incomplete in step 3
            note: incomplete.note || ''
          });
        }
      });
      
      this.renderIssueRows(mergedIssues);
      this.syncFormToReport();
      
      // Show notification
      this.showToast(`បានផ្ទេរ ${incompleteIssues.length} បញ្ហាដែលមិនរួចរាល់ពីជំហាន ២ ទៅជំហាន ៣ ដោយស្វ័យប្រវត្តិ`, 'info');
    }
  }

  loadSampleData() {
    this.completedSteps.clear();
    this.currentReport = JSON.parse(JSON.stringify(SAMPLE_REPORT));
    this.currentReport.id = 'report_' + Date.now();
    this.loadCurrentFormData(this.currentReport);
    this.updateLivePreview();
    this.showToast(this.t('toastSampleLoaded'), 'success');
  }

  populateForm(report) {
    this.loadCurrentFormData(report);
  }

  loadCurrentFormData(report) {
    if (!report) report = {};
    const branchSelect = document.getElementById('form-branch');
    if (branchSelect) {
      const bVal = report.branch || this.currentUser?.branch || (this.currentLang === 'en' ? 'Kratie' : 'ក្រចេះ');
      this.setSelectBranch(branchSelect, bVal);
      const sidebarBranchSelect = document.getElementById('sidebar-branch-select');
      if (sidebarBranchSelect) {
        this.setSelectBranch(sidebarBranchSelect, branchSelect.value);
      }
    }

    const dateInput = document.getElementById('form-date');
    if (dateInput) {
      dateInput.value = report.date || new Date().toISOString().split('T')[0];
    }

    const nameInput = document.getElementById('form-name');
    if (nameInput) {
      nameInput.value = this.currentUser
        ? (this.currentUser.fullName || this.currentUser.username)
        : (report.reporterName || '');
    }

    const posInput = document.getElementById('form-position');
    if (posInput) {
      posInput.value = this.currentUser
        ? (this.getDisplayRole(this.currentUser.role, this.currentLang) || '')
        : (report.position || '');
    }

    // Section 1 (Opening Shift)
    const opTime = document.getElementById('form-opening-time');
    if (opTime) {
      if (!report.openingTime) {
        report.openingTime = this.getCurrentFormattedTime();
      }
      opTime.value = report.openingTime;
      opTime.readOnly = true;
    }
    
    const opRep = document.getElementById('form-opening-reporter');
    if (opRep) opRep.value = report.openingReporterName || report.reporterName || this.currentUser?.fullName || '';

    const presCount = document.getElementById('form-present-count');
    if (presCount) {
      const rawPres = report.presentCount !== undefined && report.presentCount !== null ? String(report.presentCount).replace(/\D/g, '') : '';
      presCount.value = rawPres;
    }

    const absCount = document.getElementById('form-absent-count');
    if (absCount) {
      absCount.value = report.absentCount !== undefined && report.absentCount !== null ? String(report.absentCount) : '';
    }

    const cleanInput = document.getElementById('form-cleanliness');
    if (cleanInput) cleanInput.value = report.cleanlinessStatus || '';

    // Section 2 (Multi-Item Repeaters)
    const workInput = document.getElementById('form-work-status');
    if (workInput) workInput.value = report.workStatus || '';
    const workItems = report.workStatusList && report.workStatusList.length
      ? report.workStatusList
      : (report.workStatusItems && report.workStatusItems.length ? report.workStatusItems : (report.workStatus ? [report.workStatus] : ['']));
    this.renderWorkStatusRows(workItems);

    const chalInput = document.getElementById('form-challenges');
    if (chalInput) chalInput.value = report.operationChallenges || '';
    const chalItems = report.challengesList && report.challengesList.length
      ? report.challengesList
      : (report.operationChallenges ? [report.operationChallenges] : ['']);
    this.renderChallengesRows(chalItems);

    const savedIssues = Array.isArray(report.issues) && report.issues.length
      ? report.issues
      : (report.issue || report.issueStatus ? [{ issue: report.issue || '', status: report.issueStatus || '' }] : [{ issue: '', status: '' }]);
    this.renderIssueRows(savedIssues);

    // Section 3 (Multi-Item Repeaters)
    const accInput = document.getElementById('form-accomplished');
    if (accInput) accInput.value = report.accomplishedTasks || '';
    const accItems = report.accomplishedList && report.accomplishedList.length
      ? report.accomplishedList
      : (report.accomplishedTasks ? [report.accomplishedTasks] : ['']);
    this.renderAccomplishedRows(accItems);

    const secInput = document.getElementById('form-security');
    if (secInput) secInput.value = report.packageSecurity || '';
    const secItems = report.securityList && report.securityList.length
      ? report.securityList
      : (report.packageSecurity ? [report.packageSecurity] : ['']);
    this.renderSecurityRows(secItems);

    const clTime = document.getElementById('form-closing-time');
    if (clTime) {
      clTime.value = report.closingTime || this.getCurrentFormattedTime();
      clTime.readOnly = true;
    }

    const clRep = document.getElementById('form-closing-reporter');
    if (clRep) clRep.value = report.closingReporterName || report.reporterName || this.currentUser?.fullName || '';
  }

  syncFormToReport() {
    const rawDate = document.getElementById('form-date')?.value || new Date().toISOString().split('T')[0];
    const dateParts = rawDate.split('-');
    const dateDisplay = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0].slice(2)}` : rawDate;
    const selectedBranch = document.getElementById('form-branch')?.value || '';
    const accountBranch = this.getCanonicalBranch(this.currentUser?.branch);
    const reportBranch = this.currentUser && !this.isCurrentUserAdminOrTopMgmt() && accountBranch
      ? accountBranch
      : selectedBranch;

    const nameInput = document.getElementById('form-name')?.value || '';
    const opRepInput = document.getElementById('form-opening-reporter')?.value || '';
    const clRepInput = document.getElementById('form-closing-reporter')?.value || '';
    const posInput = document.getElementById('form-position')?.value || '';

    // If user is logged in, reporterName and position are strictly tied to account
    const mainReporter = this.currentUser
      ? (this.currentUser.fullName || this.currentUser.username)
      : (nameInput || opRepInput || clRepInput || '');

    const mainPosition = this.currentUser
      ? (this.getDisplayRole(this.currentUser.role, this.currentLang) || (this.currentLang === 'en' ? 'Branch Manager' : 'ប្រធានសាខា'))
      : (posInput || (this.currentLang === 'en' ? 'Branch Manager' : 'ប្រធានសាខា'));

    this.currentReport = {
      ...this.currentReport,
      branch: reportBranch,
      date: rawDate,
      dateDisplay: dateDisplay,
      reporterName: mainReporter,
      createdBy: this.currentReport?.createdBy || this.currentUser?.fullName || mainReporter,
      createdByUsername: this.currentReport?.createdByUsername || this.currentUser?.username || '',
      createdByRole: this.currentReport?.createdByRole || this.currentUser?.role || '',
      position: mainPosition,
      openingTime: document.getElementById('form-opening-time')?.value || '',
      openingReporterName: opRepInput || mainReporter,
      presentCount: document.getElementById('form-present-count')?.value || '',
      absentCount: document.getElementById('form-absent-count')?.value || '',
      cleanlinessStatus: document.getElementById('form-cleanliness')?.value || '',
      workStatus: document.getElementById('form-work-status')?.value || '',
      operationChallenges: document.getElementById('form-challenges')?.value || '',
      workStatusList: [...document.querySelectorAll('#work-status-list .work-status-input')].map(i => i.value.trim()).filter(Boolean),
      challengesList: [...document.querySelectorAll('#challenges-list .challenges-input')].map(i => i.value.trim()).filter(Boolean),
      issues: [...document.querySelectorAll('.form-issue-row')].map(row => {
        const issue = row.querySelector('.form-issue')?.value?.trim() || '';
        const status = row.querySelector('.form-issue-status')?.value || '';
        const note = status === 'incomplete'
          ? (this.currentLang === 'en' ? 'Do it Tomorrow' : 'ត្រូវធ្វើនៅថ្ងៃស្អែក')
          : (row.querySelector('.form-issue-note')?.value?.trim() || '');
        return { issue, status, note };
      }).filter(item => item.issue || item.status),
      accomplishedList: [...document.querySelectorAll('#accomplished-list .accomplished-input')].map(i => i.value.trim()).filter(Boolean),
      securityList: [...document.querySelectorAll('#security-list .security-input')].map(i => i.value.trim()).filter(Boolean)
    };

    // Calculate workStatus string
    const workList = this.currentReport.workStatusList || [];
    const workJoined = workList.join('\n');
    const workHidden = document.getElementById('form-work-status');
    if (workHidden) workHidden.value = workJoined || (workList[0] || '');
    this.currentReport.workStatus = workJoined || document.getElementById('form-work-status')?.value || '';
    this.currentReport.workStatusItems = workList;

    // Calculate operationChallenges string
    const chalList = this.currentReport.challengesList || [];
    const chalJoined = chalList.join('\n');
    const chalHidden = document.getElementById('form-challenges');
    if (chalHidden) chalHidden.value = chalJoined || (chalList[0] || '');
    this.currentReport.operationChallenges = chalJoined || document.getElementById('form-challenges')?.value || '';

    // Calculate accomplishedTasks string
    const accList = this.currentReport.accomplishedList || [];
    const accJoined = accList.join('\n');
    const accHidden = document.getElementById('form-accomplished');
    if (accHidden) accHidden.value = accJoined || (accList[0] || '');
    this.currentReport.accomplishedTasks = accJoined || document.getElementById('form-accomplished')?.value || '';

    // Calculate packageSecurity string
    const secList = this.currentReport.securityList || [];
    const secJoined = secList.join('\n');
    const secHidden = document.getElementById('form-security');
    if (secHidden) secHidden.value = secJoined || (secList[0] || '');
    this.currentReport.packageSecurity = secJoined || document.getElementById('form-security')?.value || '';

    // Calculate unresolvedIssues string from incomplete issues
    const unresList = (this.currentReport.issues || [])
      .filter(item => item && item.status === 'incomplete' && item.issue)
      .map(item => item.note ? `${item.issue} (Note: ${item.note})` : item.issue);
    const unresJoined = unresList.join('\n');
    const unresHidden = document.getElementById('form-unresolved');
    if (unresHidden) unresHidden.value = unresJoined;
    this.currentReport.unresolvedIssues = unresJoined;

    this.currentReport.closingTime = document.getElementById('form-closing-time')?.value || '';
    this.currentReport.closingReporterName = clRepInput || mainReporter;
    this.currentReport.openingPhotos = this.openingPhotos || [];
    this.currentReport.closingPhotos = this.closingPhotos || [];
    this.currentReport.additionalPhotos = this.additionalPhotos || [];
  }

  getFormData() {
    this.syncFormToReport();
    return this.currentReport;
  }

  renderWorkStatusRows(items = []) {
    const container = document.getElementById('work-status-list');
    if (!container) return;
    let list = [];
    if (Array.isArray(items) && items.length > 0) {
      list = items.map(s => String(s ?? ''));
    } else if (typeof items === 'string' && items.trim()) {
      list = items.split('\n').map(s => s.trim().replace(/^[•\-\*\d+\.]\s*/, '')).filter(Boolean);
    }
    if (list.length === 0) list = [''];

    const placeholder = this.currentLang === 'en' ? 'Write work & parcel status...' : 'សរសេរស្ថានភាពការងារ...';
    container.innerHTML = list.map((val, idx) => `
      <div class="multi-item-row work-status-row">
        <span class="multi-item-num">${idx + 1}</span>
        <textarea class="multi-item-input work-status-input" rows="2" placeholder="${placeholder}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">${this.escapeHtmlAttr(val)}</textarea>
        <button type="button" class="btn-remove-row btn-remove-work-status" title="Remove" ${list.length <= 1 && !val ? 'style="display:none;"' : ''}>×</button>
      </div>
    `).join('');

    container.querySelectorAll('.work-status-row').forEach(row => {
      const input = row.querySelector('.work-status-input');
      this.autoResizeTextarea(input);
      input?.addEventListener('input', () => {
        this.autoResizeTextarea(input);
        this.syncFormToReport();
        this.updateLivePreview();
        this.updateStepCompletion();
      });
      row.querySelector('.btn-remove-work-status')?.addEventListener('click', () => {
        const rows = container.querySelectorAll('.work-status-row');
        if (rows.length > 1) {
          row.remove();
        } else {
          if (input) input.value = '';
        }
        this.reindexMultiItemRows('work-status-list', '.work-status-row', '.multi-item-num');
        this.syncFormToReport();
        this.updateLivePreview();
        this.updateStepCompletion();
      });
    });
  }

  renderChallengesRows(items = []) {
    const container = document.getElementById('challenges-list');
    if (!container) return;
    let list = [];
    if (Array.isArray(items) && items.length > 0) {
      list = items.map(s => String(s ?? ''));
    } else if (typeof items === 'string' && items.trim()) {
      list = items.split('\n').map(s => s.trim().replace(/^[•\-\*\d+\.]\s*/, '')).filter(Boolean);
    }
    if (list.length === 0) list = [''];

    const placeholder = this.currentLang === 'en' ? 'Write operational challenge...' : 'សរសេរបញ្ហាប្រឈមប្រតិបត្តិការ...';
    container.innerHTML = list.map((val, idx) => `
      <div class="multi-item-row challenges-row">
        <span class="multi-item-num">${idx + 1}</span>
        <textarea class="multi-item-input challenges-input" rows="2" placeholder="${placeholder}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">${this.escapeHtmlAttr(val)}</textarea>
        <button type="button" class="btn-remove-row btn-remove-challenges" title="Remove" ${list.length <= 1 && !val ? 'style="display:none;"' : ''}>×</button>
      </div>
    `).join('');

    container.querySelectorAll('.challenges-row').forEach(row => {
      const input = row.querySelector('.challenges-input');
      this.autoResizeTextarea(input);
      input?.addEventListener('input', () => {
        this.autoResizeTextarea(input);
        this.syncFormToReport();
        this.updateLivePreview();
        this.updateStepCompletion();
      });
      row.querySelector('.btn-remove-challenges')?.addEventListener('click', () => {
        const rows = container.querySelectorAll('.challenges-row');
        if (rows.length > 1) {
          row.remove();
        } else {
          if (input) input.value = '';
        }
        this.reindexMultiItemRows('challenges-list', '.challenges-row', '.multi-item-num');
        this.syncFormToReport();
        this.updateLivePreview();
        this.updateStepCompletion();
      });
    });
  }

  renderAccomplishedRows(items = []) {
    const container = document.getElementById('accomplished-list');
    if (!container) return;
    let list = [];
    if (Array.isArray(items) && items.length > 0) {
      list = items.map(s => String(s ?? ''));
    } else if (typeof items === 'string' && items.trim()) {
      list = items.split('\n').map(s => s.trim().replace(/^[•\-\*\d+\.]\s*/, '')).filter(Boolean);
    }
    if (list.length === 0) list = [''];

    const placeholder = this.currentLang === 'en' ? 'Write accomplished task...' : 'សរសេរការងារដែលបានសម្រេច...';
    container.innerHTML = list.map((val, idx) => `
      <div class="multi-item-row accomplished-row">
        <span class="multi-item-num">${idx + 1}</span>
        <textarea class="multi-item-input accomplished-input" rows="2" placeholder="${placeholder}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">${this.escapeHtmlAttr(val)}</textarea>
        <button type="button" class="btn-remove-row btn-remove-accomplished" title="Remove" ${list.length <= 1 && !val ? 'style="display:none;"' : ''}>×</button>
      </div>
    `).join('');

    container.querySelectorAll('.accomplished-row').forEach(row => {
      const input = row.querySelector('.accomplished-input');
      this.autoResizeTextarea(input);
      input?.addEventListener('input', () => {
        this.autoResizeTextarea(input);
        this.syncFormToReport();
        this.updateLivePreview();
        this.updateStepCompletion();
      });
      row.querySelector('.btn-remove-accomplished')?.addEventListener('click', () => {
        const rows = container.querySelectorAll('.accomplished-row');
        if (rows.length > 1) {
          row.remove();
        } else {
          if (input) input.value = '';
        }
        this.reindexMultiItemRows('accomplished-list', '.accomplished-row', '.multi-item-num');
        this.syncFormToReport();
        this.updateLivePreview();
        this.updateStepCompletion();
      });
    });
  }

  renderSecurityRows(items = []) {
    const container = document.getElementById('security-list');
    if (!container) return;
    let list = [];
    if (Array.isArray(items) && items.length > 0) {
      list = items.map(s => String(s ?? ''));
    } else if (typeof items === 'string' && items.trim()) {
      list = items.split('\n').map(s => s.trim().replace(/^[•\-\*\d+\.]\s*/, '')).filter(Boolean);
    }
    if (list.length === 0) list = [''];

    const placeholder = this.currentLang === 'en' ? 'Write package security note...' : 'សរសេរចំណុចសុវត្ថិភាពបញ្ញើ...';
    container.innerHTML = list.map((val, idx) => `
      <div class="multi-item-row security-row">
        <span class="multi-item-num">${idx + 1}</span>
        <textarea class="multi-item-input security-input" rows="2" placeholder="${placeholder}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">${this.escapeHtmlAttr(val)}</textarea>
        <button type="button" class="btn-remove-row btn-remove-security" title="Remove" ${list.length <= 1 && !val ? 'style="display:none;"' : ''}>×</button>
      </div>
    `).join('');

    container.querySelectorAll('.security-row').forEach(row => {
      const input = row.querySelector('.security-input');
      this.autoResizeTextarea(input);
      input?.addEventListener('input', () => {
        this.autoResizeTextarea(input);
        this.syncFormToReport();
        this.updateLivePreview();
        this.updateStepCompletion();
      });
      row.querySelector('.btn-remove-security')?.addEventListener('click', () => {
        const rows = container.querySelectorAll('.security-row');
        if (rows.length > 1) {
          row.remove();
        } else {
          if (input) input.value = '';
        }
        this.reindexMultiItemRows('security-list', '.security-row', '.multi-item-num');
        this.syncFormToReport();
        this.updateLivePreview();
        this.updateStepCompletion();
      });
    });
  }

  reindexMultiItemRows(containerId, rowSelector, numSelector) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const rows = container.querySelectorAll(rowSelector);
    rows.forEach((r, i) => {
      const num = r.querySelector(numSelector);
      if (num) num.textContent = i + 1;
      const removeBtn = r.querySelector('.btn-remove-row');
      if (removeBtn) {
        removeBtn.style.display = rows.length > 1 ? 'inline-flex' : 'none';
      }
    });
  }

  autoResizeTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 52) + 'px';
  }

  escapeHtmlAttr(str) {
    return String(str || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  renderIssueRows(issues = []) {
    const container = document.getElementById('issue-list');
    if (!container) return;
    let values = [];
    if (Array.isArray(issues) && issues.length) {
      values = issues;
    } else if (typeof issues === 'string' && issues.trim()) {
      values = issues.split('\n').map(l => l.trim().replace(/^[•\-\*\d+\.]\s*/, '')).filter(Boolean).map(item => ({ issue: item, status: 'incomplete', note: 'ត្រូវធ្វើនៅថ្ងៃស្អែក' }));
    }
    if (!values.length) {
      values = [{ issue: '', status: '' }];
    }
    const lockedNoteValue = this.currentLang === 'en' ? 'Do it Tomorrow' : 'ត្រូវធ្វើនៅថ្ងៃស្អែក';
    const notePlaceholder = this.currentLang === 'en' ? 'Action: Do it Tomorrow' : 'សកម្មភាព៖ ត្រូវធ្វើនៅថ្ងៃស្អែក';
    const issuePlaceholder = this.currentLang === 'en' ? 'Write the problem / issue...' : 'សរសេរបញ្ហា (Write the problem)';
    const statusLabel = this.currentLang === 'en' ? 'Status' : 'ស្ថានភាព';
    const completeLabel = this.currentLang === 'en' ? '✓ Resolved' : '✓ រួចរាល់';
    const incompleteLabel = this.currentLang === 'en' ? 'Incomplete' : 'មិនទាន់រួចរាល់';

    container.innerHTML = values.map((item, index) => {
      const isIncomplete = item.status === 'incomplete';
      const noteVal = isIncomplete ? lockedNoteValue : '';
      return `
        <div class="form-issue-row ${isIncomplete ? 'has-note' : ''}">
          <span class="issue-number">${index + 1}</span>
          <textarea class="form-input form-issue" rows="2" aria-label="Issue ${index + 1}" placeholder="${issuePlaceholder}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">${this.escapeHtmlAttr(item.issue || '')}</textarea>
          <select class="form-input form-issue-status" aria-label="Issue status">
            <option value="">${statusLabel}</option>
            <option value="complete" ${item.status === 'complete' ? 'selected' : ''}>${completeLabel}</option>
            <option value="incomplete" ${isIncomplete ? 'selected' : ''}>${incompleteLabel}</option>
          </select>
          <input class="form-input form-issue-note is-locked-note" value="${this.escapeHtmlAttr(noteVal || lockedNoteValue)}" placeholder="${notePlaceholder}" readonly="readonly" tabindex="-1" title="${this.currentLang === 'en' ? 'Action Plan: Do it Tomorrow (Auto-locked, cannot edit)' : 'ផែនការសកម្មភាព៖ ត្រូវធ្វើនៅថ្ងៃស្អែក (ស្វ័យប្រវត្តិកំណត់ មិនអាចកែប្រែបានទេ)'}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" style="${isIncomplete ? '' : 'display:none;'}">
          <button type="button" class="btn-remove-row btn-remove-issue" title="Remove" ${values.length <= 1 && !item.issue ? 'style="display:none;"' : ''}>×</button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.form-issue-row').forEach((row) => {
      const note = row.querySelector('.form-issue-note');
      const status = row.querySelector('.form-issue-status');
      const issueInput = row.querySelector('.form-issue');
      this.autoResizeTextarea(issueInput);

      const updateNoteVisibility = () => {
        const incomplete = status.value === 'incomplete';
        row.classList.toggle('has-note', incomplete);
        if (note) {
          note.style.display = incomplete ? 'block' : 'none';
          const defaultNote = this.currentLang === 'en' ? 'Do it Tomorrow' : 'ត្រូវធ្វើនៅថ្ងៃស្អែក';
          note.value = defaultNote;
          note.readOnly = true;
          note.setAttribute('readonly', 'readonly');
        }
      };

      status?.addEventListener('change', () => {
        updateNoteVisibility();
        this.syncFormToReport();
        this.updateLivePreview();
      });

      issueInput?.addEventListener('input', () => {
        this.autoResizeTextarea(issueInput);
        this.syncFormToReport();
        this.updateLivePreview();
      });

      row.querySelector('.btn-remove-issue')?.addEventListener('click', () => {
        const rows = container.querySelectorAll('.form-issue-row');
        if (rows.length > 1) {
          row.remove();
        } else {
          if (issueInput) issueInput.value = '';
          if (status) status.value = '';
          if (note) { note.value = ''; note.style.display = 'none'; }
          row.classList.remove('has-note');
        }
        this.reindexMultiItemRows('issue-list', '.form-issue-row', '.issue-number');
        this.syncFormToReport();
        this.updateLivePreview();
      });
    });
  }

  updateLivePreview() {
    const r = this.currentReport;
    const isEn = this.currentLang === 'en';
    const displayBranch = this.getDisplayBranch(r.branch, this.currentLang);
    const displayRole = this.getDisplayRole(r.position, this.currentLang);

    // Header & Sidebar sync
    const headerBranchEl = document.getElementById('header-branch-name');
    if (headerBranchEl) {
      headerBranchEl.textContent = displayBranch ? (isEn ? `Branch ${displayBranch}` : `សាខា${displayBranch}`) : '';
    }

    const sidebarUserEl = document.getElementById('sidebar-user-name');
    if (sidebarUserEl) sidebarUserEl.textContent = r.reporterName || '';

    const sidebarRoleEl = document.getElementById('sidebar-user-role');
    if (sidebarRoleEl) sidebarRoleEl.textContent = displayRole || '';

    const sidebarBranchSelect = document.getElementById('sidebar-branch-select');
    if (sidebarBranchSelect && r.branch) {
      this.setSelectBranch(sidebarBranchSelect, r.branch);
    }

    // Update in all preview places (mini sidebar preview and full A4 document view)
    document.querySelectorAll('.doc-val-branch').forEach(el => el.textContent = displayBranch || '');
    document.querySelectorAll('.seal-branch-prefix').forEach(el => el.textContent = isEn ? 'Branch' : 'សាខា');
    document.querySelectorAll('.doc-val-date').forEach(el => el.textContent = r.dateDisplay || r.date || '');
    document.querySelectorAll('.doc-val-name').forEach(el => el.textContent = r.reporterName || '');
    document.querySelectorAll('.doc-val-opening-reporter').forEach(el => el.textContent = r.openingReporterName || r.reporterName || '');
    document.querySelectorAll('.doc-val-closing-reporter').forEach(el => el.textContent = r.closingReporterName || r.reporterName || '');
    document.querySelectorAll('.doc-val-position').forEach(el => el.textContent = displayRole || '');

    // Section 1
    document.querySelectorAll('.doc-val-opening-time').forEach(el => el.textContent = r.openingTime || '');
    
    // Auto-suffix "នាក់" / staff for attendance
    const presRaw = r.presentCount !== undefined && r.presentCount !== null && String(r.presentCount).trim() !== ''
      ? String(r.presentCount).replace(/\D/g, '')
      : '';
    const presDisplay = presDisplayFormatted => presRaw !== '' ? (isEn ? `${presRaw} staff` : `${presRaw} នាក់`) : '-';
    document.querySelectorAll('.doc-val-present').forEach(el => el.textContent = presDisplay());

    const absDisplay = this.formatAbsentDisplay(r.absentCount, isEn);
    document.querySelectorAll('.doc-val-absent').forEach(el => el.textContent = absDisplay);

    document.querySelectorAll('.doc-val-cleanliness').forEach(el => el.textContent = r.cleanlinessStatus || '');

    const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

    // Helper to format multi-item lines in A4 document
    const formatDocList = (val, bulletClass = '') => {
      if (!val || !String(val).trim()) return isEn ? 'None' : 'គ្មាន';
      const lines = String(val).split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) return escapeHtml(lines[0] || (isEn ? 'None' : 'គ្មាន'));
      return `<div class="doc-list-block">` + lines.map(line => `
        <div class="doc-list-line">
          <span class="doc-list-bullet ${bulletClass}">•</span>
          <span>${escapeHtml(line.replace(/^[•\-\*\d+\.]\s*/, ''))}</span>
        </div>
      `).join('') + `</div>`;
    };

    // Section 2
    document.querySelectorAll('.doc-val-work-status').forEach(el => {
      el.innerHTML = formatDocList(r.workStatus, '');
    });
    document.querySelectorAll('.doc-val-challenges').forEach(el => {
      el.innerHTML = formatDocList(r.operationChallenges, 'issue-bullet');
    });

    const issueMarkup = (r.issues || []).filter(item => item.issue || item.status).map(item => {
      const status = item.status === 'complete' 
        ? (isEn ? '✓ Resolved' : '✓ រួចរាល់')
        : item.status === 'incomplete' 
          ? (isEn ? 'Incomplete' : 'មិនទាន់រួចរាល់') 
          : (isEn ? 'Unset' : 'មិនបានកំណត់ស្ថានភាព');
      const note = item.note ? ` - ${escapeHtml(item.note)}` : '';
      return `<div>• ${escapeHtml(item.issue || (isEn ? 'Unspecified' : 'មិនបានបញ្ជាក់'))} (${status}${note})</div>`;
    }).join('') || (isEn ? 'None' : 'គ្មាន');
    document.querySelectorAll('.doc-val-issues').forEach(el => el.innerHTML = issueMarkup);

    // Section 3
    document.querySelectorAll('.doc-val-accomplished').forEach(el => {
      el.innerHTML = formatDocList(r.accomplishedTasks, '');
    });

    // Unresolved issues formatted with clean formal tags if present
    const unresolvedMarkup = (r.issues || []).filter(item => item.status === 'incomplete' && item.issue).map(item => {
      const note = item.note ? ` <span class="doc-subnote">(${escapeHtml(item.note)})</span>` : '';
      return `
        <div class="doc-list-line">
          <span class="doc-list-bullet issue-bullet">•</span>
          <span>${escapeHtml(item.issue)}${note} <span class="doc-issue-status-tag status-tag-incomplete">(${isEn ? 'Incomplete' : 'មិនទាន់រួចរាល់'})</span></span>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.doc-val-unresolved').forEach(el => {
      if (unresolvedMarkup) {
        el.innerHTML = `<div class="doc-list-block">${unresolvedMarkup}</div>`;
      } else if (Array.isArray(r.issues) && r.issues.length > 0) {
        el.innerHTML = `<span style="color: #16a34a; font-weight: 500;">${isEn ? '✓ All issues resolved' : '✓ បានដោះស្រាយរួចរាល់ទាំងអស់'}</span>`;
      } else {
        el.innerHTML = formatDocList(r.unresolvedIssues, 'issue-bullet');
      }
    });

    document.querySelectorAll('.doc-val-security').forEach(el => {
      el.innerHTML = formatDocList(r.packageSecurity, 'security-bullet');
    });

    document.querySelectorAll('.doc-val-closing-time').forEach(el => el.textContent = r.closingTime || '');

    // Render official Top Management Approval Seal
    const isApproved = r.approvalStatus === 'approved';
    const approvalSealHtml = isApproved ? `
      <div class="doc-approval-seal">
        <div class="doc-approval-seal-inner">
          <div class="seal-header-badge">✓ ${isEn ? 'APPROVED' : 'បានអនុម័ត'}</div>
          <div class="seal-approver-name">${escapeHtml(r.approvedBy || (isEn ? 'Top Management' : 'គណៈគ្រប់គ្រងជាន់ខ្ពស់'))}</div>
          <div class="seal-timestamp">${r.approvedAt ? new Date(r.approvedAt).toLocaleDateString(isEn ? 'en-US' : 'km-KH') : ''}</div>
        </div>
      </div>
    ` : '';

    document.querySelectorAll('.doc-approval-seal-container').forEach(el => {
      el.innerHTML = approvalSealHtml;
    });

    const approveDocBtn = document.getElementById('btn-approve-current-doc');
    const approveDocBtnText = document.getElementById('approve-doc-btn-text');
    if (approveDocBtn) {
      if (this.isCurrentUserAdminOrTopMgmt() && r.id) {
        approveDocBtn.style.display = 'inline-flex';
        if (isApproved) {
          approveDocBtn.className = 'btn btn-success btn-sm';
          if (approveDocBtnText) approveDocBtnText.textContent = isEn ? '✓ Approved (Click to Revoke)' : '✓ បានអនុម័ត (ចុចដើម្បីដក)';
        } else {
          approveDocBtn.className = 'btn btn-outline btn-sm';
          if (approveDocBtnText) approveDocBtnText.textContent = isEn ? '✓ Approve Report' : '✓ អនុម័តរបាយការណ៍';
        }
      } else {
        approveDocBtn.style.display = 'none';
      }
    }

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

      const isEn = this.currentLang === 'en';
      const totalToProcess = files.length;
      this.showToast(isEn ? `Processing watermark on ${totalToProcess} photo(s)...` : `កំពុងដំណើរការ Watermark លើ ${totalToProcess} រូបភាព...`, 'primary');

      const existingPhotos = type === 'opening' ? this.openingPhotos : type === 'morning' ? (this.morningPhotos || []) : type === 'additional' ? this.additionalPhotos : this.closingPhotos;
      const combinedCount = existingPhotos.length + totalToProcess;
      const adaptiveQuality = combinedCount > 15 ? 0.68 : 0.72;
      const adaptiveMaxDim = combinedCount > 15 ? 840 : 960;

      let addedCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          if (files.length > 3 && (i % 2 === 0 || i === files.length - 1)) {
            this.showToast(isEn ? `Watermarking photo ${i + 1}/${files.length}...` : `កំពុងដំណើរការ Watermark រូបភាពទី ${i + 1}/${files.length}...`, 'info');
          }
          // Yield to browser event loop to prevent UI freezing
          await new Promise(resolve => setTimeout(resolve, 0));

          const watermarkedUrl = await WatermarkUtil.addWatermark(file, {
            branch: (type === 'morning' ? document.getElementById('morning-branch')?.value : document.getElementById('form-branch')?.value) || 'ក្រចេះ',
            date: (type === 'morning' ? document.getElementById('morning-date')?.value : document.getElementById('form-date')?.value) || new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            quality: adaptiveQuality,
            maxDim: adaptiveMaxDim
          });

          if (type === 'opening') {
            this.openingPhotos.push(watermarkedUrl);
          } else if (type === 'morning') {
            if (!this.morningPhotos) this.morningPhotos = [];
            this.morningPhotos.push(watermarkedUrl);
          } else if (type === 'additional') {
            this.additionalPhotos.push(watermarkedUrl);
          } else {
            this.closingPhotos.push(watermarkedUrl);
          }
          addedCount++;
        } catch (err) {
          console.error('Error watermarking image:', err);
        }
      }

      this.renderPhotoPreviews(previewContainerId, type);
      this.syncFormToReport();
      this.updateLivePreview();
      if (type === 'morning') this.updateMorningLivePreview();
      this.updateStepCompletion();

      const totalPhotosNow = (type === 'opening' ? this.openingPhotos : type === 'morning' ? (this.morningPhotos || []) : type === 'additional' ? this.additionalPhotos : this.closingPhotos).length;
      this.showToast(
        isEn 
          ? `✓ Added ${addedCount} photo(s)! Total: ${totalPhotosNow} photos (Unlimited)` 
          : `✓ បានបញ្ចូល ${addedCount} រូបថត! សរុប៖ ${totalPhotosNow} រូប (គ្មានដែនកំណត់)`,
        'success'
      );
      input.value = '';
    });
  }

  renderPhotoPreviews(containerId, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const photos = type === 'opening' ? this.openingPhotos : type === 'morning' ? (this.morningPhotos || []) : type === 'additional' ? this.additionalPhotos : this.closingPhotos;
    container.innerHTML = '';

    if (photos.length > 0) {
      const isEn = this.currentLang === 'en';
      const toolbar = document.createElement('div');
      toolbar.className = 'photo-preview-toolbar';
      toolbar.innerHTML = `
        <span class="photo-preview-counter">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          ${isEn ? `Photos: <strong>${photos.length}</strong> (Unlimited)` : `រូបថត៖ <strong>${photos.length}</strong> សន្លឹក (គ្មានដែនកំណត់)`}
        </span>
        <button type="button" class="photo-preview-clear-btn" title="${isEn ? 'Clear all photos' : 'លុបរូបទាំងអស់'}">
          ✕ ${isEn ? 'Clear All' : 'លុបទាំងអស់'}
        </button>
      `;

      toolbar.querySelector('.photo-preview-clear-btn').addEventListener('click', () => {
        const confirmMsg = isEn 
          ? `Are you sure you want to clear all ${photos.length} photos?` 
          : `តើអ្នកពិតជាចង់លុបរូបថតទាំង ${photos.length} សន្លឹកនេះមែនទេ?`;
        if (!confirm(confirmMsg)) return;

        if (type === 'opening') this.openingPhotos = [];
        else if (type === 'morning') this.morningPhotos = [];
        else if (type === 'additional') this.additionalPhotos = [];
        else this.closingPhotos = [];

        this.renderPhotoPreviews(containerId, type);
        this.syncFormToReport();
        this.updateLivePreview();
        if (type === 'morning') this.updateMorningLivePreview();
        this.updateStepCompletion();
      });

      container.appendChild(toolbar);
    }

    photos.forEach((src, idx) => {
      const card = document.createElement('div');
      card.className = 'photo-card';
      card.innerHTML = `
        <img src="${src}" alt="Shift photo ${idx+1}">
        <div class="photo-watermark-overlay">✓ #${idx + 1}</div>
        <button type="button" class="photo-remove-btn" data-index="${idx}" title="លុបរូប">✕</button>
      `;
      card.querySelector('img').addEventListener('click', () => this.openPhotoViewer(photos, idx));
      card.querySelector('.photo-remove-btn').addEventListener('click', () => {
        if (type === 'opening') {
          this.openingPhotos.splice(idx, 1);
        } else if (type === 'morning') {
          if (this.morningPhotos) this.morningPhotos.splice(idx, 1);
        } else if (type === 'additional') {
          this.additionalPhotos.splice(idx, 1);
        } else {
          this.closingPhotos.splice(idx, 1);
        }
        this.renderPhotoPreviews(containerId, type);
        this.syncFormToReport();
        this.updateLivePreview();
        if (type === 'morning') this.updateMorningLivePreview();
        this.updateStepCompletion();
      });
      container.appendChild(card);
    });
  }

  renderDocPhotoGalleries() {
    const openGalleries = document.querySelectorAll('.doc-opening-photos-container, #doc-opening-photos');
    const closeGalleries = document.querySelectorAll('.doc-closing-photos-container, #doc-closing-photos');
    const updateGallery = document.getElementById('doc-update-photos');
    const printOpenGallery = document.getElementById('print-opening-photos');
    const printCloseGallery = document.getElementById('print-closing-photos');
    const printUpdateGallery = document.getElementById('print-update-photos');
    const photoMarkup = (photos, label) => (photos || []).map((p, idx) => `<div class="doc-photo-item" title="${label} #${idx + 1}"><img src="${p}" alt="${label} ${idx + 1}"></div>`).join('');

    const openingHtml = photoMarkup(this.openingPhotos, 'Opening Photo');
    openGalleries.forEach(el => {
      el.innerHTML = openingHtml;
    });

    const closingHtml = photoMarkup(this.closingPhotos, 'Closing Photo');
    closeGalleries.forEach(el => {
      el.innerHTML = closingHtml;
    });

    if (updateGallery) {
      updateGallery.innerHTML = photoMarkup(this.additionalPhotos, 'Update Photo');
    }
    if (printOpenGallery) printOpenGallery.innerHTML = openingHtml;
    if (printCloseGallery) printCloseGallery.innerHTML = closingHtml;
    if (printUpdateGallery) printUpdateGallery.innerHTML = photoMarkup(this.additionalPhotos, 'Update Photo');

    document.querySelectorAll('.doc-opening-photos-container img, #doc-opening-photos img').forEach((img, idx) => {
      img.style.cursor = 'zoom-in';
      img.onclick = () => this.openPhotoViewer(this.openingPhotos, idx, { title: this.currentLang === 'en' ? 'Opening Shift Photo' : 'រូបថតពេលបើកសាខា' });
    });
    document.querySelectorAll('.doc-closing-photos-container img, #doc-closing-photos img').forEach((img, idx) => {
      img.style.cursor = 'zoom-in';
      img.onclick = () => this.openPhotoViewer(this.closingPhotos, idx, { title: this.currentLang === 'en' ? 'Closing Shift Photo' : 'រូបថតពេលបិទសាខា' });
    });
  }

  openPhotoViewer(srcOrPhotos, initialIndex = 0, contextInfo = {}) {
    const existing = document.getElementById('photo-viewer-overlay');
    if (existing) existing.remove();

    let photos = [];
    if (Array.isArray(srcOrPhotos)) {
      photos = srcOrPhotos.filter(Boolean);
    } else if (typeof srcOrPhotos === 'string' && srcOrPhotos) {
      photos = [srcOrPhotos];
    }

    if (photos.length === 0) return;

    let currentIndex = Math.max(0, Math.min(initialIndex, photos.length - 1));
    const titleText = contextInfo.title || (this.currentLang === 'en' ? 'Report Photo' : 'រូបថតរបាយការណ៍');
    const branchText = contextInfo.branch ? this.getDisplayBranch(contextInfo.branch, this.currentLang) : '';
    const dateText = contextInfo.date || '';

    const overlay = document.createElement('div');
    overlay.id = 'photo-viewer-overlay';
    overlay.className = 'photo-viewer-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const updateViewerContent = () => {
      const currentSrc = photos[currentIndex];
      const counterText = `${currentIndex + 1} / ${photos.length}`;
      const headerSub = [branchText, dateText].filter(Boolean).join(' • ');

      overlay.innerHTML = `
        <div class="photo-viewer-container">
          <div class="photo-viewer-header">
            <div class="photo-viewer-meta">
              <div class="photo-viewer-title">${titleText}</div>
              ${headerSub ? `<div class="photo-viewer-sub">${headerSub}</div>` : ''}
            </div>
            <div class="photo-viewer-controls">
              <span class="photo-viewer-counter">${counterText}</span>
              <button type="button" class="photo-viewer-close-btn" aria-label="Close" title="Close (Esc)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <div class="photo-viewer-stage">
            ${photos.length > 1 ? `
              <button type="button" class="photo-viewer-nav photo-viewer-prev" aria-label="Previous Photo" title="Previous (←)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
            ` : ''}

            <div class="photo-viewer-img-wrap">
              <img class="photo-viewer-active-img" src="${currentSrc}" alt="Full-size report photo">
            </div>

            ${photos.length > 1 ? `
              <button type="button" class="photo-viewer-nav photo-viewer-next" aria-label="Next Photo" title="Next (→)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            ` : ''}
          </div>

          ${photos.length > 1 ? `
            <div class="photo-viewer-thumbnails-bar">
              ${photos.map((p, idx) => `
                <button type="button" class="photo-viewer-thumb-btn ${idx === currentIndex ? 'active' : ''}" data-index="${idx}" aria-label="Photo ${idx + 1}">
                  <img src="${p}" alt="Thumbnail ${idx + 1}">
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;

      // Attach events
      overlay.querySelector('.photo-viewer-close-btn')?.addEventListener('click', () => closeViewer());
      overlay.querySelector('.photo-viewer-prev')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentIndex > 0) {
          currentIndex--;
        } else {
          currentIndex = photos.length - 1;
        }
        updateViewerContent();
      });
      overlay.querySelector('.photo-viewer-next')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentIndex < photos.length - 1) {
          currentIndex++;
        } else {
          currentIndex = 0;
        }
        updateViewerContent();
      });

      overlay.querySelectorAll('.photo-viewer-thumb-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          if (!isNaN(idx) && idx !== currentIndex) {
            currentIndex = idx;
            updateViewerContent();
          }
        });
      });
    };

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        closeViewer();
      } else if (e.key === 'ArrowLeft' && photos.length > 1) {
        currentIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
        updateViewerContent();
      } else if (e.key === 'ArrowRight' && photos.length > 1) {
        currentIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
        updateViewerContent();
      }
    };

    const closeViewer = () => {
      document.removeEventListener('keydown', handleKeydown);
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.classList.contains('photo-viewer-container') || e.target.classList.contains('photo-viewer-stage')) {
        closeViewer();
      }
    });

    document.addEventListener('keydown', handleKeydown);
    document.body.appendChild(overlay);
    updateViewerContent();
    requestAnimationFrame(() => overlay.classList.add('active'));
  }

  openReportPhotoGallery(reportId, initialIndex = 0) {
    const report = (this.reports || Storage.getReports()).find(r => r.id === reportId);
    if (!report) return;
    const allPhotos = [
      ...(report.openingPhotos || []),
      ...(report.morningPhotos || []),
      ...(report.additionalPhotos || []),
      ...(report.closingPhotos || [])
    ];
    if (allPhotos.length === 0) {
      this.showToast(this.currentLang === 'en' ? 'No photos attached to this report' : 'របាយការណ៍នេះមិនមានរូបថតភ្ជាប់ជាមួយទេ', 'warning');
      return;
    }
    this.openPhotoViewer(allPhotos, initialIndex, {
      title: this.currentLang === 'en' ? `Photos • ${this.getDisplayBranch(report.branch, this.currentLang)}` : `កម្រងរូបថត • ${this.getDisplayBranch(report.branch, this.currentLang)}`,
      branch: report.branch,
      date: report.dateDisplay || report.date
    });
  }

  saveCurrentReport() {
    if (this.isSavingReport) return;
    this.isSavingReport = true;

    const saveBtn = document.getElementById('btn-save-report');
    if (saveBtn) saveBtn.disabled = true;

    try {
      if (this.isViewingSavedReport) {
        this.showToast(this.currentLang === 'en' ? 'Saved reports are view-only. Start a new report to edit.' : 'របាយការណ៍ដែលបានរក្សាទុក អាចមើលបានតែប៉ុណ្ណោះ។ សូមចាប់ផ្តើម Report ថ្មីដើម្បីកែប្រែ។', 'warning');
        this.isSavingReport = false;
        if (saveBtn) saveBtn.disabled = false;
        return;
      }
      this.syncFormToReport();

      // Verify all steps 1 to 4 are completed
      for (let s = 1; s <= 4; s++) {
        if (!this.validateStep(s, true)) {
          this.currentStep = s;
          this.renderStepView(s);
          this.validateStep(s, true);
          this.isSavingReport = false;
          if (saveBtn) saveBtn.disabled = false;
          return;
        }
      }

      if (this.currentUser && !this.isCurrentUserAdminOrTopMgmt() && !this.canAccessReport(this.currentReport)) {
        this.showToast(this.currentLang === 'en' ? 'You can only save reports for your assigned branch!' : 'អ្នកអាចរក្សាទុករបាយការណ៍បានតែសាខារបស់អ្នកប៉ុណ្ណោះ!', 'warning');
        this.isSavingReport = false;
        if (saveBtn) saveBtn.disabled = false;
        return;
      }

      this.currentReport.id = this.currentReport.id || ('report_' + Date.now());
      this.currentReport.reportNumber = this.currentReport.reportNumber || 1;
      const currentNum = this.currentReport.reportNumber;
      Storage.saveReport(this.currentReport);

      const bDisplay = this.getDisplayBranch(this.currentReport.branch, this.currentLang);
      
      // Extract incomplete issues to automatically carry over
      const incompleteIssues = (this.currentReport.issues || [])
        .filter(issue => issue && issue.issue && issue.issue.trim() && issue.status !== 'complete')
        .map(issue => ({
          issue: issue.issue.trim(),
          status: 'incomplete',
          note: issue.note || (this.currentLang === 'en' ? 'Carried from previous report' : 'ត្រូវធ្វើនៅថ្ងៃស្អែក')
        }));

      const issueNotice = incompleteIssues.length > 0
        ? (this.currentLang === 'en' ? ` • Auto-forwarded ${incompleteIssues.length} unresolved task(s) to next report ⚡` : ` • បានផ្ទេរ ${incompleteIssues.length} បញ្ហាមិនទាន់រួចរាល់ទៅរបាយការណ៍បន្ទាប់ដោយស្វ័យប្រវត្តិ ⚡`)
        : '';

      this.showToast(this.currentLang === 'en' ? `Report for branch "${bDisplay}" saved!${issueNotice}` : `បានរក្សាទុករបាយការណ៍សាខា "${bDisplay}" រួចរាល់!${issueNotice}`, 'success');
      this.historyQuickFilter = 'all';
      document.querySelectorAll('.history-filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.historyFilter === 'all');
      });
      const approvalFilterControl = document.getElementById('filter-approval-status');
      if (approvalFilterControl) approvalFilterControl.value = '';
      this.renderReportsTable();
      this.updateStats();
      this.renderIssuesDashboard();
      this.updateIssuesStatsAndBadge();

      // Automatically create next report with carried forward incomplete issues
      setTimeout(() => {
        this.autoCreateNewReport(incompleteIssues, currentNum + 1);
        this.isSavingReport = false;
        if (saveBtn) saveBtn.disabled = false;
      }, 1000);
    } catch (e) {
      console.error('Error in saveCurrentReport:', e);
      this.isSavingReport = false;
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  getPendingIncompleteIssues(targetBranch) {
    const canonical = this.getCanonicalBranch(targetBranch || this.currentUser?.branch || this.currentReport?.branch);
    if (!canonical) return [];
    const reports = (Storage.getReports() || []).filter(r => this.getCanonicalBranch(r.branch) === canonical);
    if (!reports.length) return [];
    
    // Sort reports by date/created timestamp descending to get the latest report
    const sortedReports = [...reports].sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b.date || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const latestReport = sortedReports[0];
    if (!latestReport || !Array.isArray(latestReport.issues)) return [];
    const deletedIssueIds = Storage.getDeletedIssueIds();

    return latestReport.issues
      .filter(iss => {
        if (!iss || !iss.issue || !iss.issue.trim() || iss.status === 'complete') return false;
        const iId = String(iss.id || '').trim();
        const iText = String(iss.issue).trim();
        if (deletedIssueIds.has(iId) || deletedIssueIds.has(iText)) return false;
        return true;
      })
      .map(iss => ({
        issue: iss.issue.trim(),
        status: 'incomplete',
        note: iss.note || (this.currentLang === 'en' ? 'Carried from previous report' : 'ត្រូវធ្វើនៅថ្ងៃស្អែក')
      }));
  }

  pullPreviousIncompleteIssues() {
    const userBranch = this.getCanonicalBranch(this.currentUser?.branch || this.currentReport?.branch);
    const pendingIssues = this.getPendingIncompleteIssues(userBranch);
    if (!pendingIssues.length) {
      this.showToast(this.currentLang === 'en' ? 'No unresolved issues found in previous report.' : 'មិនមានបញ្ហាមិនទាន់រួចរាល់ពីរបាយការណ៍មុនទេ!', 'primary');
      return;
    }

    this.syncFormToReport();
    const existingIssues = this.currentReport.issues || [];
    
    // Merge without duplicates
    const merged = [...existingIssues.filter(e => e && e.issue)];
    let addedCount = 0;
    pendingIssues.forEach(p => {
      const exists = merged.some(e => e.issue && e.issue.trim().toLowerCase() === p.issue.trim().toLowerCase());
      if (!exists) {
        merged.unshift(p);
        addedCount++;
      }
    });

    this.currentReport.issues = merged;
    this.renderIssueRows([...merged, { issue: '', status: '' }]);
    this.syncFormToReport();
    this.updateLivePreview();
    this.showToast(this.currentLang === 'en' ? `Auto-pulled ${addedCount} unresolved issue(s) from previous report!` : `បានផ្ទេរបញ្ហាមិនទាន់រួចរាល់ចំនួន ${addedCount} ពីរបាយការណ៍មុនដោយស្វ័យប្រវត្តិ!`, 'success');
  }

  autoCreateNewReport(carriedIssuesOverride = null, nextReportNumber = 2) {
    // Create fresh report form automatically with carried issues
    const currentBranch = this.currentReport.branch || (this.currentUser ? this.getCanonicalBranch(this.currentUser.branch) : '');
    const currentReporter = this.currentReport.reporterName || this.currentUser?.fullName || '';
    const currentPosition = this.currentReport.position || (this.currentUser ? this.getDisplayRole(this.currentUser.role, this.currentLang) : '');
    
    const carriedIssues = carriedIssuesOverride !== null
      ? carriedIssuesOverride
      : (this.currentReport.issues || [])
          .filter(issue => issue && issue.issue && issue.issue.trim() && issue.status !== 'complete')
          .map(issue => ({
            issue: issue.issue.trim(),
            status: 'incomplete',
            note: issue.note || (this.currentLang === 'en' ? 'Carried from previous report' : 'ត្រូវធ្វើនៅថ្ងៃស្អែក')
          }));

    const reportDate = new Date().toISOString().split('T')[0];

    this.currentReport = {
      id: 'report_' + Date.now(),
      branch: currentBranch,
      reportNumber: nextReportNumber,
      date: reportDate,
      dateDisplay: new Date().toLocaleDateString('en-GB'),
      reporterName: currentReporter,
      position: currentPosition,
      openingTime: this.getCurrentFormattedTime(),
      presentCount: '',
      absentCount: '',
      cleanlinessStatus: '',
      workStatus: '',
      operationChallenges: '',
      accomplishedTasks: '',
      unresolvedIssues: '',
      packageSecurity: '',
      closingTime: '',
      openingPhotos: [],
      closingPhotos: [],
      additionalPhotos: [],
      issues: carriedIssues
    };

    // Persist draft for the new report with carried issues
    Storage.saveDraft(this.currentReport, currentBranch);

    this.completedSteps.clear();
    this.openingPhotos = [];
    this.closingPhotos = [];
    this.additionalPhotos = [];
    this.currentStep = 1;

    this.loadCurrentFormData(this.currentReport);
    this.renderPhotoPreviews('opening-photo-preview', 'opening');
    this.renderPhotoPreviews('closing-photo-preview', 'closing');
    this.renderPhotoPreviews('additional-photo-preview', 'additional');
    this.renderIssueRows(carriedIssues.length ? [...carriedIssues, { issue: '', status: '' }] : [{ issue: '', status: '' }]);
    this.updateLivePreview();
    this.updateStepCompletion();
    this.renderReportsTable();
    this.updateStats();
    this.renderIssuesDashboard();
    this.updateIssuesStatsAndBadge();

    // Go back to Step 1
    this.goToStep(1);

    const issueMessage = carriedIssues.length
      ? (this.currentLang === 'en' ? ` • Auto-forwarded ${carriedIssues.length} unresolved task(s) ⚡` : ` និងបានផ្ទេរ ${carriedIssues.length} បញ្ហាមិនទាន់រួចរាល់ស្វ័យប្រវត្តិ ⚡`)
      : '';
    this.showToast(`✅ Report ${nextReportNumber} ${this.currentLang === 'en' ? 'ready!' : 'បានបង្កើតរួចរាល់!'} (${this.getDisplayBranch(currentBranch, this.currentLang)})${issueMessage}`, 'primary');
  }

  resetForm(silent = false) {
    if (silent || confirm('តើអ្នកប្រាកដជាចង់សម្អាតទម្រង់នេះដើម្បីបំពេញថ្មីមែនទេ?')) {
      this.isEditingSavedReport = false;
      this.isViewingSavedReport = false;
      this.setReportFormReadOnly(false);
      const userBranch = this.currentUser ? this.getCanonicalBranch(this.currentUser.branch) : '';
      const autoPendingIssues = this.getPendingIncompleteIssues(userBranch);
      this.currentReport = {
        id: 'report_' + Date.now(),
        branch: userBranch,
        reportNumber: 1,
        date: new Date().toISOString().split('T')[0],
        dateDisplay: new Date().toLocaleDateString('en-GB'),
        reporterName: this.currentUser?.fullName || this.currentUser?.username || '',
        position: this.currentUser ? (this.getDisplayRole(this.currentUser.role, this.currentLang) || 'បុគ្គលិកប្រតិបត្តិការ') : '',
        openingTime: this.getCurrentFormattedTime(),
        presentCount: '',
        absentCount: '',
        cleanlinessStatus: '',
        workStatus: '',
        operationChallenges: '',
        accomplishedTasks: '',
        unresolvedIssues: '',
        packageSecurity: '',
        closingTime: '',
        openingPhotos: [],
        closingPhotos: [],
        additionalPhotos: [],
        accomplishedList: [],
        securityList: [],
        issues: autoPendingIssues
      };
      if (silent) {
        Storage.saveDraft(null, userBranch);
      }
      this.completedSteps.clear();
      this.openingPhotos = [];
      this.closingPhotos = [];
      this.additionalPhotos = [];
      this.loadCurrentFormData(this.currentReport);
      this.renderWorkStatusRows(['']);
      this.renderChallengesRows(['']);
      this.renderAccomplishedRows(['']);
      this.renderSecurityRows(['']);
      this.renderIssueRows(autoPendingIssues.length ? [...autoPendingIssues, { issue: '', status: '' }] : [{ issue: '', status: '' }]);
      if (this.currentUser) {
        this.fillFormFromCurrentUser();
      }
      this.renderPhotoPreviews('opening-photo-preview', 'opening');
      this.renderPhotoPreviews('closing-photo-preview', 'closing');
      this.renderPhotoPreviews('additional-photo-preview', 'additional');
      this.updateLivePreview();
      this.updateStepCompletion();
      this.goToStep(1);
      if (!silent) {
        const issueMsg = autoPendingIssues.length
          ? (this.currentLang === 'en' ? ` (${autoPendingIssues.length} unresolved task(s) auto-forwarded ⚡)` : ` (បានផ្ទេរបញ្ហាមិនទាន់រួចរាល់ ${autoPendingIssues.length} ស្វ័យប្រវត្តិ ⚡)`)
          : '';
        this.showToast((this.currentLang === 'en' ? 'Form reset successfully' : 'បានសម្អាតទម្រង់រួចរាល់') + issueMsg, 'primary');
      }
    }
  }

  getReportDateTimeTimestamp(r) {
    if (!r) return 0;

    let idTs = 0;
    if (r.id && /^report_(\d{10,14})$/.test(String(r.id))) {
      idTs = parseInt(String(r.id).replace('report_', ''), 10);
    }

    let createdTs = 0;
    if (r.createdAt) {
      const normalized = String(r.createdAt).replace(' ', 'T');
      const iso = normalized.includes('Z') || normalized.includes('+') ? normalized : (normalized + 'Z');
      const t = new Date(iso).getTime();
      if (!isNaN(t) && t > 0) createdTs = t;
    }

    let dateStr = r.date ? String(r.date).trim() : '';
    if (!dateStr && r.createdAt) {
      dateStr = String(r.createdAt).split('T')[0].split(' ')[0];
    }

    let year = 0, month = 0, day = 0;
    if (dateStr) {
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
        const parts = dateStr.split('-').map(n => parseInt(n, 10));
        year = parts[0]; month = parts[1]; day = parts[2];
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('/').map(n => parseInt(n, 10));
        day = parts[0]; month = parts[1]; year = parts[2];
      }
    }

    let timeStr = (r.closingTime || r.openingTime ? String(r.closingTime || r.openingTime).trim() : '');
    let hours = 0, minutes = 0, hasTime = false;
    if (timeStr) {
      const m = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
      if (m) {
        hours = parseInt(m[1], 10);
        minutes = parseInt(m[2], 10);
        const meridiem = (m[3] || '').toLowerCase();
        if (meridiem === 'pm' && hours < 12) hours += 12;
        if (meridiem === 'am' && hours === 12) hours = 0;
        hasTime = true;
      }
    }

    if (!hasTime && createdTs) {
      const cd = new Date(createdTs);
      hours = cd.getUTCHours();
      minutes = cd.getUTCMinutes();
      hasTime = true;
    }

    if (year && month && day) {
      const baseTs = new Date(year, month - 1, day, hours, minutes, 0).getTime();
      const tieBreaker = (idTs || createdTs) ? ((idTs || createdTs) % 60000) : 0;
      return baseTs + tieBreaker;
    }

    return createdTs || idTs || 0;
  }

  toggleHistorySort(field) {
    if (field === 'datetime') {
      if (this.historySortBy === 'datetime-desc') {
        this.historySortBy = 'datetime-asc';
      } else {
        this.historySortBy = 'datetime-desc';
      }
    } else if (field === 'branch') {
      if (this.historySortBy === 'branch-asc') {
        this.historySortBy = 'branch-desc';
      } else {
        this.historySortBy = 'branch-asc';
      }
    }
    const sortSelect = document.getElementById('sort-reports');
    if (sortSelect) sortSelect.value = this.historySortBy;
    this.renderReportsTable();
  }

  updateSortHeaderIndicators() {
    const sortBy = this.historySortBy || 'datetime-desc';
    const dateTh = document.getElementById('th-sort-date');
    const dateIcon = document.getElementById('sort-icon-date');
    const branchTh = document.getElementById('th-sort-branch');
    const branchIcon = document.getElementById('sort-icon-branch');
    const sortSelect = document.getElementById('sort-reports');

    if (sortSelect && sortSelect.value !== sortBy) {
      sortSelect.value = sortBy;
    }

    if (dateTh) {
      if (sortBy === 'datetime-desc') {
        dateTh.classList.add('active-sort');
        if (dateIcon) dateIcon.textContent = ' ▼';
      } else if (sortBy === 'datetime-asc') {
        dateTh.classList.add('active-sort');
        if (dateIcon) dateIcon.textContent = ' ▲';
      } else {
        dateTh.classList.remove('active-sort');
        if (dateIcon) dateIcon.textContent = '';
      }
    }

    if (branchTh) {
      if (sortBy === 'branch-asc') {
        branchTh.classList.add('active-sort');
        if (branchIcon) branchIcon.textContent = ' ▲';
      } else if (sortBy === 'branch-desc') {
        branchTh.classList.add('active-sort');
        if (branchIcon) branchIcon.textContent = ' ▼';
      } else {
        branchTh.classList.remove('active-sort');
        if (branchIcon) branchIcon.textContent = '';
      }
    }
  }

  hasReportIncompleteIssues(r) {
    if (!r) return false;
    const deletedIssueIds = Storage.getDeletedIssueIds ? Storage.getDeletedIssueIds() : new Set();

    // 1. If report has structured issues array
    if (Array.isArray(r.issues) && r.issues.length > 0) {
      return r.issues.some((i, idx) => {
        if (!i || !i.issue) return false;
        const txt = String(i.issue).trim();
        if (!txt) return false;
        if (i.status === 'complete' || i.status === 'completed') return false;
        const iId = String(i.id || '').trim();
        const detId = `iss_${r.id}_${idx}`;
        return !deletedIssueIds.has(iId) && !deletedIssueIds.has(detId) && !deletedIssueIds.has(txt);
      });
    }

    // 2. If report has legacy issueList array
    if (Array.isArray(r.issueList) && r.issueList.length > 0) {
      return r.issueList.some(i => {
        const txt = typeof i === 'string' ? i.trim() : (i && i.issue ? String(i.issue).trim() : '');
        if (!txt) return false;
        if (i && (i.status === 'complete' || i.status === 'completed')) return false;
        return !deletedIssueIds.has(txt);
      });
    }

    // 3. Fallback: only if no structured issues array exists or it is empty
    const fallbackText = (r.unresolvedIssues || '').trim();
    if (!fallbackText) return false;
    if (deletedIssueIds.has(`iss_unresolved_${r.id}`) || deletedIssueIds.has(fallbackText)) {
      return false;
    }
    const resolvedKeywords = [
      'គ្មាន', 'none', 'បានដោះស្រាយរួចរាល់ទាំងអស់', 'គ្មានបញ្ហា',
      'ដោះស្រាយរួច', 'រួចរាល់', 'បានដោះស្រាយ', 'complete', 'completed', 'n/a', '-'
    ];
    return !resolvedKeywords.includes(fallbackText.toLowerCase());
  }

  startNewReport() {
    this.resetForm(true);
    this.switchTab('form-tab');
  }

  renderReportsTable() {
    const tbody = document.getElementById('reports-table-body');
    if (!tbody) return;

    this.renderBranchIssuesGraph();

    const searchTerm = (document.getElementById('search-reports')?.value || '').toLowerCase().trim();
    const branchFilter = document.getElementById('filter-branch')?.value || '';
    const approvalFilter = document.getElementById('filter-approval-status')?.value || '';
    const dateFilter = document.getElementById('filter-date')?.value || '';

    let reports = this.getAccessibleReports();

    // 1. Quick Filters
    if (this.historyQuickFilter === 'today') {
      const todayISO = new Date().toISOString().split('T')[0];
      reports = reports.filter(r => r.date === todayISO || (r.createdAt && r.createdAt.startsWith(todayISO)));
    } else if (this.historyQuickFilter === 'unresolved' || this.historyQuickFilter === 'challenges') {
      reports = reports.filter(r => this.hasReportIncompleteIssues(r));
    } else if (this.historyQuickFilter === 'approved') {
      reports = reports.filter(r => r.approvalStatus === 'approved');
    } else if (this.historyQuickFilter === 'pending') {
      reports = reports.filter(r => r.approvalStatus !== 'approved');
    }

    // 2. Search & Select Filters
    reports = reports.filter(r => {
      const canonicalReportBranch = this.getCanonicalBranch(r.branch);
      const enBranch = this.getDisplayBranch(r.branch, 'en').toLowerCase();
      const kmBranch = this.getDisplayBranch(r.branch, 'km').toLowerCase();
      const matchSearch = !searchTerm || 
        (r.branch && r.branch.toLowerCase().includes(searchTerm)) ||
        enBranch.includes(searchTerm) ||
        kmBranch.includes(searchTerm) ||
        (r.reporterName && r.reporterName.toLowerCase().includes(searchTerm)) ||
        (r.position && r.position.toLowerCase().includes(searchTerm)) ||
        (r.workStatus && r.workStatus.toLowerCase().includes(searchTerm)) ||
        (r.operationChallenges && r.operationChallenges.toLowerCase().includes(searchTerm));
      
      const matchBranch = !branchFilter || 
        r.branch === branchFilter || 
        canonicalReportBranch === this.getCanonicalBranch(branchFilter);

      const matchApproval = !approvalFilter ||
        (approvalFilter === 'approved' ? r.approvalStatus === 'approved' : r.approvalStatus !== 'approved');

      const matchDate = !dateFilter || r.date === dateFilter;

      return matchSearch && matchBranch && matchApproval && matchDate;
    });

    // 3. Sort Reports by Date and Time (or chosen criteria)
    const sortBy = this.historySortBy || 'datetime-desc';
    reports.sort((a, b) => {
      if (sortBy === 'datetime-asc') {
        return this.getReportDateTimeTimestamp(a) - this.getReportDateTimeTimestamp(b);
      } else if (sortBy === 'branch-asc') {
        return (a.branch || '').localeCompare(b.branch || '', 'km');
      } else if (sortBy === 'branch-desc') {
        return (b.branch || '').localeCompare(a.branch || '', 'km');
      }
      // Default: 'datetime-desc' (Newest Date & Time First)
      return this.getReportDateTimeTimestamp(b) - this.getReportDateTimeTimestamp(a);
    });

    this.updateSortHeaderIndicators();

    if (reports.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="table-empty-state">
            <div class="empty-state-box">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-state-icon">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="m10 15 4-6"></path>
                <path d="m14 15-4-6"></path>
              </svg>
              <div class="empty-state-title">${this.t('emptyTableText')}</div>
              <div class="empty-state-desc">${this.currentLang === 'en' ? 'Try adjusting your search or filter criteria.' : 'សូមសាកល្បងផ្លាស់ប្តូរពាក្យស្វែងរក ឬតម្រង។'}</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const presentLabel = this.currentLang === 'en' ? 'Present: ' : 'វត្តមាន ';
    const absentLabel = this.currentLang === 'en' ? 'Absent: ' : 'អវត្តមាន ';
    const reportedBadge = this.currentLang === 'en' ? 'Submitted' : 'បានរាយការណ៍';
    const viewA4Title = this.currentLang === 'en' ? 'View Official A4 Form' : 'មើលទម្រង់ផ្លូវការ A4';
    const printReportTitle = this.currentLang === 'en' ? 'Print / Export to PDF' : 'បោះពុម្ព / រក្សាទុកជា PDF';
    const editTitle = this.currentLang === 'en' ? 'Edit Report' : 'កែសម្រួលរបាយការណ៍';
    const tgTitle = this.currentLang === 'en' ? 'Share to Telegram' : 'ចែករំលែកទៅកាន់ Telegram';
    const deleteTitle = this.currentLang === 'en' ? 'Delete Report' : 'លុបរបាយការណ៍';

    const deletedIssueIds = Storage.getDeletedIssueIds();
    tbody.innerHTML = reports.map(r => {
      const hasUnresolved = this.hasReportIncompleteIssues(r);
      let unresolvedIssueText = '';
      if (hasUnresolved) {
        if (Array.isArray(r.issues) && r.issues.length > 0) {
          unresolvedIssueText = r.issues
            .filter((i, idx) => {
              if (!i || !i.issue) return false;
              const txt = String(i.issue).trim();
              if (!txt || i.status === 'complete' || i.status === 'completed') return false;
              const iId = String(i.id || '').trim();
              const detId = `iss_${r.id}_${idx}`;
              return !deletedIssueIds.has(iId) && !deletedIssueIds.has(detId) && !deletedIssueIds.has(txt);
            })
            .map(i => i.issue.trim())
            .join('\n');
        } else if (Array.isArray(r.issueList) && r.issueList.length > 0) {
          unresolvedIssueText = r.issueList
            .filter(i => {
              const txt = typeof i === 'string' ? i.trim() : (i && i.issue ? String(i.issue).trim() : '');
              return txt && i.status !== 'complete' && i.status !== 'completed' && !deletedIssueIds.has(txt);
            })
            .map(i => typeof i === 'string' ? i.trim() : i.issue.trim())
            .join('\n');
        } else {
          unresolvedIssueText = (r.unresolvedIssues || '').trim();
        }
      }
      const reporterInitials = (r.reporterName || 'BS')
        .split(' ')
        .map(w => w[0])
        .slice(-2)
        .join('')
        .toUpperCase();

      return `
        <tr class="history-table-row">
          <!-- Branch Column -->
          <td class="history-issues-column">
            <div class="table-branch-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="table-icon-blue">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span class="table-branch-name">${this.getDisplayBranch(r.branch, this.currentLang) || '-'}</span>
            </div>
          </td>

          <!-- Date & Time Column -->
          <td>
            <div class="table-datetime-cell">
              <div class="table-date-main">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>${r.dateDisplay || r.date || '-'}</span>
              </div>
              ${(() => {
                const times = [];
                if (r.openingTime && r.openingTime.trim()) times.push(r.openingTime.trim());
                if (r.closingTime && r.closingTime.trim() && r.closingTime.trim() !== r.openingTime?.trim()) times.push(r.closingTime.trim());
                
                let timeBadge = '';
                if (times.length > 0) {
                  timeBadge = times.join(' - ');
                } else if (r.createdAt) {
                  const d = new Date(String(r.createdAt).replace(' ', 'T'));
                  if (!isNaN(d.getTime())) {
                    timeBadge = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  }
                }
                
                if (!timeBadge) return '';
                return `
                  <div class="table-time-pill" title="${this.currentLang === 'en' ? 'Shift / Report Time' : 'ម៉ោងបំពេញការងារ / របាយការណ៍'}">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>${this.escapeHtmlAttr(timeBadge)}</span>
                  </div>
                `;
              })()}
            </div>
          </td>

          <!-- Reporter Column -->
          <td>
            <div class="table-reporter-wrap">
              <div class="table-reporter-avatar">${reporterInitials}</div>
              <div class="table-reporter-info">
                <div class="table-reporter-name">${r.reporterName || '-'}</div>
                <div class="table-reporter-role">${this.getDisplayRole(r.position, this.currentLang)}</div>
                ${r.createdBy && r.createdBy !== r.reporterName ? `
                  <div class="table-reporter-creator" style="font-size: 0.72rem; color: hsl(var(--muted-foreground)); margin-top: 2px;">
                    <span style="opacity: 0.85;">${this.currentLang === 'en' ? 'Created by:' : 'បង្កើតដោយ:'}</span> <strong>${r.createdBy}</strong>
                  </div>
                ` : ''}
              </div>
            </div>
          </td>

          <!-- Attendance Column -->
          <td>
            <div class="table-attendance-pills">
              ${(() => {
                const presNum = r.presentCount !== undefined && r.presentCount !== null && String(r.presentCount).trim() !== ''
                  ? String(r.presentCount).replace(/\D/g, '')
                  : '0';
                const absVal = r.absentCount !== undefined && r.absentCount !== null ? String(r.absentCount).trim() : '';
                const hasAbsent = absVal !== '' && absVal !== '0' && absVal !== '0 នាក់' && absVal !== 'គ្មាន' && absVal.toLowerCase() !== 'none' && absVal !== '-';
                const unitText = this.currentLang === 'en' ? 'staff' : 'នាក់';
                const absentLabelText = this.currentLang === 'en' ? 'Absent: ' : 'អវត្តមាន៖ ';
                const absDisplay = this.formatAbsentDisplay(absVal, this.currentLang === 'en');

                return `
                  <div class="attendance-pill-present" title="${presentLabel}${presNum} ${unitText}">
                    <span class="attendance-indicator-dot present-dot"></span>
                    <span class="attendance-num">${presNum}</span>
                    <span class="attendance-label">${this.currentLang === 'en' ? 'Present' : 'វត្តមាន'}</span>
                  </div>
                  ${hasAbsent ? `
                    <div class="attendance-pill-absent" title="${absentLabelText}${this.escapeHtmlAttr(absDisplay)}">
                      <span class="attendance-indicator-dot absent-dot"></span>
                      <span class="attendance-num">${this.escapeHtmlAttr(absDisplay)}</span>
                    </div>
                  ` : ''}
                `;
              })()}
            </div>
          </td>

          <!-- Work Status Column -->
          <td>
            <div class="table-work-status-box">
              <div class="table-work-status-text" title="${this.escapeHtmlAttr(r.workStatus || '')}">${this.escapeHtmlAttr(r.workStatus || '-')}</div>
              ${hasUnresolved ? `
                <div class="table-unresolved-badge" title="${this.escapeHtmlAttr(unresolvedIssueText)}">
                  <span class="issue-status-dot"></span>
                  <span>${this.escapeHtmlAttr(unresolvedIssueText)}</span>
                </div>
              ` : `<span class="table-issue-none">${this.currentLang === 'en' ? 'No unresolved issues' : 'គ្មានបញ្ហាមិនទាន់ដោះស្រាយ'}</span>`}
            </div>
          </td>
            </div>
          </td>

          <!-- Photos Column -->
          <td>
            ${(() => {
              const allPhotos = [
                ...(r.openingPhotos || []),
                ...(r.morningPhotos || []),
                ...(r.additionalPhotos || []),
                ...(r.closingPhotos || [])
              ].filter(Boolean);

              if (allPhotos.length === 0) {
                return `<span class="table-photo-none">${this.t('noPhotosLabel')}</span>`;
              }

              const displayPhotos = allPhotos.slice(0, 2);
              const remainingCount = allPhotos.length - displayPhotos.length;
              const viewTooltip = this.t('viewFullPhoto');

              return `
                <div class="table-photos-cell">
                  <div class="table-photos-cluster">
                    ${displayPhotos.map((src, idx) => `
                      <button type="button" class="table-photo-thumb-btn" onclick="window.bsApp.openReportPhotoGallery('${r.id}', ${idx})" title="${viewTooltip}">
                        <img src="${src}" alt="Report photo thumbnail ${idx + 1}" loading="lazy">
                        <span class="table-photo-zoom-hint">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            <line x1="11" y1="8" x2="11" y2="14"></line>
                            <line x1="8" y1="11" x2="14" y2="11"></line>
                          </svg>
                        </span>
                      </button>
                    `).join('')}
                    ${remainingCount > 0 ? `
                      <button type="button" class="table-photo-more-badge" onclick="window.bsApp.openReportPhotoGallery('${r.id}', 2)" title="${viewTooltip} (+${remainingCount})">
                        +${remainingCount}
                      </button>
                    ` : ''}
                  </div>
                  <span class="table-photos-count-badge" onclick="window.bsApp.openReportPhotoGallery('${r.id}', 0)">
                    📷 ${allPhotos.length} ${this.t('photosCountSuffix')}
                  </span>
                </div>
              `;
            })()}
          </td>

          <!-- Status Column -->
          <td>
            <div style="display:flex; flex-direction:column; gap:0.3rem;">
              <span class="table-status-pill">
                <span class="table-status-dot"></span>
                <span>${reportedBadge}</span>
              </span>
              ${r.approvalStatus === 'approved' ? `
                <span class="table-approval-badge badge-approved" title="${this.currentLang === 'en' ? 'Approved by ' + (r.approvedBy || 'Top Management') : 'បានអនុម័តដោយ ' + (r.approvedBy || 'Top Management')}">
                  ✓ ${this.currentLang === 'en' ? 'Approved' : 'បានអនុម័ត'}
                </span>
              ` : `
                <span class="table-approval-badge badge-pending">
                  ⏳ ${this.currentLang === 'en' ? 'Pending' : 'រង់ចាំពិនិត្យ'}
                </span>
              `}
            </div>
          </td>

          <!-- Actions Column -->
          <td class="text-right">
            <div class="table-actions-group">
              ${this.isCurrentUserAdminOrTopMgmt() ? `
                <button type="button" class="btn-table-action ${r.approvalStatus === 'approved' ? 'btn-table-approved' : 'btn-table-approve'}" onclick="window.bsApp.toggleReportApproval('${r.id}')" title="${r.approvalStatus === 'approved' ? (this.currentLang === 'en' ? 'Approved (Click to Revoke)' : 'បានអនុម័ត (ចុចដើម្បីដកការអនុម័ត)') : (this.currentLang === 'en' ? 'Approve Report' : 'អនុម័តរបាយការណ៍')}">
                  <span>${r.approvalStatus === 'approved' ? '✓' : '✓ អនុម័ត'}</span>
                </button>
              ` : ''}

              <button type="button" class="btn-table-action btn-table-view" onclick="window.bsApp.viewReportDoc('${r.id}')" title="${viewA4Title}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span>A4</span>
              </button>

              <button type="button" class="btn-table-action btn-table-print" onclick="window.bsApp.printReportDirect('${r.id}')" title="${printReportTitle}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                <span>PDF</span>
              </button>

              <button type="button" class="btn-table-action btn-table-tg" onclick="window.bsApp.shareReportTg('${r.id}')" title="${tgTitle}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>

              ${this.isCurrentUserAdminOrTopMgmt() ? `
                <button type="button" class="btn-table-action btn-table-delete" onclick="window.bsApp.deleteReport('${r.id}')" title="${deleteTitle}">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  updateStats() {
    const reports = this.getAccessibleReports();
    const totalReportsEl = document.getElementById('stat-total-reports');
    const sidebarCountEl = document.getElementById('sidebar-report-count');
    const branchesCountEl = document.getElementById('stat-branches-count');
    const staffPresentEl = document.getElementById('stat-staff-present');
    const challengesEl = document.getElementById('stat-challenges-count');

    if (totalReportsEl) totalReportsEl.textContent = reports.length;
    if (sidebarCountEl) sidebarCountEl.textContent = reports.length;

    const uniqueBranches = new Set(reports.map(r => this.getCanonicalBranch(r.branch)).filter(Boolean));
    if (branchesCountEl) branchesCountEl.textContent = uniqueBranches.size;

    const totalStaff = reports.reduce((sum, r) => sum + (parseInt(r.presentCount) || 0), 0);
    if (staffPresentEl) staffPresentEl.textContent = totalStaff;

    const unresolvedCount = reports.filter(r => this.hasReportIncompleteIssues(r)).length;
    if (challengesEl) challengesEl.textContent = unresolvedCount;

    // Dynamic Filter Chip Counts
    const todayISO = new Date().toISOString().split('T')[0];
    const approvedCount = reports.filter(r => r.approvalStatus === 'approved').length;
    const pendingCount = reports.filter(r => r.approvalStatus !== 'approved').length;
    const todayCount = reports.filter(r => r.date === todayISO || (r.createdAt && r.createdAt.startsWith(todayISO))).length;

    const chipAll = document.getElementById('chip-count-all');
    const chipUnresolved = document.getElementById('chip-count-unresolved');
    const chipPending = document.getElementById('chip-count-pending');
    const chipApproved = document.getElementById('chip-count-approved');
    const chipToday = document.getElementById('chip-count-today');

    if (chipAll) chipAll.textContent = reports.length;
    if (chipUnresolved) chipUnresolved.textContent = unresolvedCount;
    if (chipPending) chipPending.textContent = pendingCount;
    if (chipApproved) chipApproved.textContent = approvedCount;
    if (chipToday) chipToday.textContent = todayCount;

    this.renderBranchIssuesGraph();
  }

  renderBranchIssuesGraph() {
    const viewport = document.getElementById('branch-line-chart-viewport');
    const totalEl = document.getElementById('graph-val-total');
    const pendingEl = document.getElementById('graph-val-pending');
    const resolvedEl = document.getElementById('graph-val-resolved');
    const rateEl = document.getElementById('graph-val-rate');
    if (!viewport) return;

    const allIssues = this.getAllBranchIssues(true);
    const isEn = this.currentLang === 'en';

    // 1. Initialize stats for all official 27 branches
    const branchStats = {};
    BRANCH_LIST.forEach(bKm => {
      const canonical = this.getCanonicalBranch(bKm) || bKm;
      branchStats[canonical] = {
        branch: canonical,
        total: 0,
        resolved: 0,
        pending: 0,
        issues: []
      };
    });

    let grandTotal = 0;
    let grandResolved = 0;
    let grandPending = 0;

    allIssues.forEach(iss => {
      const canonical = this.getCanonicalBranch(iss.branch) || 'Other';
      if (!branchStats[canonical]) {
        branchStats[canonical] = {
          branch: canonical,
          total: 0,
          resolved: 0,
          pending: 0,
          issues: []
        };
      }

      branchStats[canonical].total++;
      grandTotal++;
      if (iss.status === 'complete') {
        branchStats[canonical].resolved++;
        grandResolved++;
      } else {
        branchStats[canonical].pending++;
        grandPending++;
      }
      branchStats[canonical].issues.push(iss);
    });

    // Update Summary KPI Strip
    if (totalEl) totalEl.textContent = grandTotal;
    if (pendingEl) pendingEl.textContent = grandPending;
    if (resolvedEl) resolvedEl.textContent = grandResolved;
    const overallRate = grandTotal > 0 ? Math.round((grandResolved / grandTotal) * 100) : 100;
    if (rateEl) rateEl.textContent = `${overallRate}%`;

    // Map all 27 branches in official sequence
    const branches = BRANCH_LIST.map(b => branchStats[this.getCanonicalBranch(b)]).filter(Boolean);

    if (branches.length === 0 || grandTotal === 0) {
      viewport.innerHTML = `
        <div class="graph-empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #10b981;">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <div class="graph-empty-text">
            ${isEn ? 'All Branch Operations Smooth (No Issues Recorded)' : 'ប្រតិបត្តិការគ្រប់សាខាដំណើរការរលូនល្អ (គ្មានបញ្ហាប្រឈមទេ)'}
          </div>
        </div>
      `;
      return;
    }

    // 2. Build SVG Line Chart across all 27 branches
    const svgW = Math.max(1200, branches.length * 80);
    const svgH = 260;
    const padLeft = 45;
    const padRight = 35;
    const padTop = 30;
    const padBottom = 45;
    const plotW = svgW - padLeft - padRight;
    const plotH = svgH - padTop - padBottom;

    const maxVal = Math.max(...branches.map(b => Math.max(b.total, b.resolved, b.pending, 1)), 4);
    const stepCount = branches.length;
    const stepX = stepCount > 1 ? plotW / (stepCount - 1) : plotW / 2;

    const pointsTotal = [];
    const pointsResolved = [];
    const pointsPending = [];

    branches.forEach((b, i) => {
      const x = stepCount > 1 ? padLeft + i * stepX : padLeft + plotW / 2;
      const yTot = padTop + plotH - (b.total / maxVal) * plotH;
      const yRes = padTop + plotH - (b.resolved / maxVal) * plotH;
      const yPen = padTop + plotH - (b.pending / maxVal) * plotH;
      pointsTotal.push({ x, y: yTot, data: b });
      pointsResolved.push({ x, y: yRes, data: b });
      pointsPending.push({ x, y: yPen, data: b });
    });

    const getSplinePath = (pts) => {
      if (!pts.length) return '';
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const cpX = (p0.x + p1.x) / 2;
        d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
      }
      return d;
    };

    const getAreaPath = (pts, linePath) => {
      if (!pts.length) return '';
      const first = pts[0];
      const last = pts[pts.length - 1];
      const baseY = padTop + plotH;
      return `${linePath} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;
    };

    const pathTotal = getSplinePath(pointsTotal);
    const pathResolved = getSplinePath(pointsResolved);
    const pathPending = getSplinePath(pointsPending);

    const areaTotal = getAreaPath(pointsTotal, pathTotal);
    const areaResolved = getAreaPath(pointsResolved, pathResolved);
    const areaPending = getAreaPath(pointsPending, pathPending);

    // Y-Axis Horizontal Gridlines
    const yGridLevels = 4;
    let gridLinesSvg = '';
    for (let g = 0; g <= yGridLevels; g++) {
      const gY = padTop + plotH - (g / yGridLevels) * plotH;
      const valLabel = Math.round((g / yGridLevels) * maxVal);
      gridLinesSvg += `
        <line x1="${padLeft}" y1="${gY}" x2="${svgW - padRight}" y2="${gY}" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="4,4" />
        <text x="${padLeft - 10}" y="${gY + 4}" font-size="11" font-family="var(--font-mono)" fill="currentColor" opacity="0.5" text-anchor="end">${valLabel}</text>
      `;
    }

    // X-Axis Labels & Vertical Guidelines
    let xLabelsSvg = '';
    branches.forEach((b, i) => {
      const x = stepCount > 1 ? padLeft + i * stepX : padLeft + plotW / 2;
      const displayBranch = this.getDisplayBranch(b.branch, this.currentLang);
      const shortName = displayBranch.replace(/^សាខា\s*/, '').replace(/^Branch\s*/i, '');
      xLabelsSvg += `
        <line x1="${x}" y1="${padTop}" x2="${x}" y2="${padTop + plotH}" stroke="currentColor" stroke-opacity="0.04" />
        <text x="${x}" y="${padTop + plotH + 22}" font-size="11" font-weight="600" font-family="var(--font-khmer)" fill="currentColor" opacity="0.8" text-anchor="middle">
          ${this.escapeHtmlAttr(shortName)}
        </text>
      `;
    });

    // Dots & Interactive Hover Regions
    let interactiveSvg = '';
    branches.forEach((b, i) => {
      const ptTot = pointsTotal[i];
      const ptRes = pointsResolved[i];
      const ptPen = pointsPending[i];
      const displayBranch = this.getDisplayBranch(b.branch, this.currentLang);

      interactiveSvg += `
        <g class="chart-point-group" data-branch="${this.escapeHtmlAttr(b.branch)}" onclick="window.bsApp && window.bsApp.filterTableByGraphBranch('${this.escapeHtmlAttr(b.branch)}')">
          <!-- Total Dot -->
          <circle cx="${ptTot.x}" cy="${ptTot.y}" r="5" class="chart-dot dot-total-svg" />
          <!-- Resolved Dot -->
          <circle cx="${ptRes.x}" cy="${ptRes.y}" r="4.5" class="chart-dot dot-resolved-svg" />
          <!-- Pending Dot -->
          <circle cx="${ptPen.x}" cy="${ptPen.y}" r="4.5" class="chart-dot dot-pending-svg" />

          <!-- Transparent Hover Column Trigger -->
          <rect x="${ptTot.x - 25}" y="${padTop}" width="50" height="${plotH}" fill="transparent" class="chart-hover-trigger"
            onmouseenter="window.bsApp && window.bsApp.showLineChartTooltip(event, '${this.escapeHtmlAttr(displayBranch)}', ${b.total}, ${b.resolved}, ${b.pending})"
            onmouseleave="window.bsApp && window.bsApp.hideLineChartTooltip()"
          />
        </g>
      `;
    });

    viewport.innerHTML = `
      <div class="line-chart-svg-wrap">
        <svg viewBox="0 0 ${svgW} ${svgH}" class="line-chart-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="gradTotal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#2563eb" stop-opacity="0.22" />
              <stop offset="100%" stop-color="#2563eb" stop-opacity="0.0" />
            </linearGradient>
            <linearGradient id="gradResolved" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#10b981" stop-opacity="0.18" />
              <stop offset="100%" stop-color="#10b981" stop-opacity="0.0" />
            </linearGradient>
            <linearGradient id="gradPending" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ef4444" stop-opacity="0.18" />
              <stop offset="100%" stop-color="#ef4444" stop-opacity="0.0" />
            </linearGradient>
          </defs>

          <!-- Grid Lines -->
          ${gridLinesSvg}

          <!-- Area Fills -->
          <path d="${areaTotal}" fill="url(#gradTotal)" />
          <path d="${areaResolved}" fill="url(#gradResolved)" />
          <path d="${areaPending}" fill="url(#gradPending)" />

          <!-- Main Curves -->
          <path d="${pathTotal}" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="chart-line line-total" />
          <path d="${pathResolved}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="chart-line line-resolved" />
          <path d="${pathPending}" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="chart-line line-pending" />

          <!-- X-Axis Labels -->
          ${xLabelsSvg}

          <!-- Interactive Dots & Triggers -->
          ${interactiveSvg}
        </svg>
      </div>
    `;
  }

  showLineChartTooltip(e, branchName, total, resolved, pending) {
    const tooltip = document.getElementById('line-chart-tooltip');
    const graphCard = document.getElementById('card-branch-issues-graph');
    if (!tooltip || !graphCard) return;
    const isEn = this.currentLang === 'en';

    tooltip.innerHTML = `
      <div class="tooltip-header">
        <span class="tooltip-branch">${branchName}</span>
      </div>
      <div class="tooltip-body">
        <div class="tooltip-row"><span class="tooltip-dot dot-total"></span> <span>${isEn ? 'Total Issues' : 'បញ្ហាសរុប'}:</span> <strong>${total}</strong></div>
        <div class="tooltip-row"><span class="tooltip-dot dot-resolved"></span> <span>${isEn ? 'Resolved' : 'បានដោះស្រាយ'}:</span> <strong>${resolved}</strong></div>
        <div class="tooltip-row"><span class="tooltip-dot dot-pending"></span> <span>${isEn ? 'Unresolved' : 'មិនទាន់រួចរាល់'}:</span> <strong>${pending}</strong></div>
      </div>
      <div class="tooltip-footer">
        ${isEn ? 'Click to filter table' : 'ចុចដើម្បីច្រោះតារាង'}
      </div>
    `;
    tooltip.style.display = 'block';

    const rect = e.target.getBoundingClientRect();
    const cardRect = graphCard.getBoundingClientRect();
    const x = rect.left - cardRect.left + (rect.width / 2);
    const y = rect.top - cardRect.top + 40;

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  hideLineChartTooltip() {
    const tooltip = document.getElementById('line-chart-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  filterTableByGraphBranch(branchName) {
    const filterBranch = document.getElementById('filter-branch');
    const userBranch = String(this.currentUser?.branch || '').trim();
    const isRestrictedUser = Boolean(userBranch && !this.isCurrentUserAdminOrTopMgmt());
    const canonicalUserBranch = this.getCanonicalBranch(userBranch);
    const canonicalTargetBranch = this.getCanonicalBranch(branchName);

    if (isRestrictedUser && canonicalUserBranch !== canonicalTargetBranch) {
      this.showToast(
        this.currentLang === 'en'
          ? `Overall branch stats for ${this.getDisplayBranch(branchName, 'en')} (Your reports: ${this.getDisplayBranch(userBranch, 'en')})`
          : `ស្ថិតិបញ្ហារួមសាខា ${this.getDisplayBranch(branchName, 'km')} (របាយការណ៍របស់អ្នក៖ ${this.getDisplayBranch(userBranch, 'km')})`,
        'info'
      );
      return;
    }

    if (filterBranch) {
      filterBranch.value = branchName;
      filterBranch.dispatchEvent(new Event('change'));
      this.renderReportsTable();
      
      const tableCard = document.querySelector('#history-tab .shadcn-card:nth-of-type(2)');
      if (tableCard) {
        tableCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      this.showToast(this.currentLang === 'en' ? `Filtered by ${this.getDisplayBranch(branchName, 'en')}` : `បានច្រោះតាមសាខា ${this.getDisplayBranch(branchName, 'km')}`, 'info');
    }
  }

  toggleBranchGraph() {
    const content = document.getElementById('branch-graph-content');
    const btn = document.getElementById('btn-toggle-graph');
    if (!content) return;
    const isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    if (btn) {
      btn.classList.toggle('is-collapsed', !isHidden);
    }
  }

  reloadAllBranchData() {
    const isEn = this.currentLang === 'en';
    const confirmMsg = isEn 
      ? 'Reset and load initial sample demo data for all 27 branches? This will restore sample reports.' 
      : 'តើអ្នកពិតជាចង់កំណត់ឡើងវិញ និងផ្ទុកទិន្នន័យគំរូសាខាទាំង ២៧ ឡើងវិញមែនទេ?';
    if (!confirm(confirmMsg)) return;

    Storage.clearDeletedTombstones();
    const initialReports = Storage.getInitialSampleReports();
    Storage.saveReports(initialReports);
    this.renderReportsTable();
    this.renderBranchIssuesGraph();
    this.renderIssuesDashboard();
    this.updateIssuesStatsAndBadge();
    this.showToast(isEn ? 'Loaded data for all 27 branches' : 'បានផ្ទុកទិន្នន័យសាខាទាំង ២៧ រួចរាល់', 'success');
  }

  viewReportDoc(id) {
    const report = Storage.getReportById(id);
    if (report && this.canAccessReport(report)) {
      this.currentReport = { ...report };
      this.openingPhotos = report.openingPhotos || [];
      this.closingPhotos = report.closingPhotos || [];
      this.additionalPhotos = report.additionalPhotos || [];
      this.loadCurrentFormData(this.currentReport);
      this.isViewingSavedReport = true;
      this.setReportFormReadOnly(true);
      this.updateLivePreview();
      this.switchTab('document-tab');
      const bName = this.getDisplayBranch(report.branch, this.currentLang);
      this.showToast(this.currentLang === 'en' ? `Viewing official form for branch "${bName}"` : `កំពុងបង្ហាញទម្រង់ផ្លូវការសាខា "${bName}"`, 'primary');
    }
  }

  printReportDirect(id) {
    const report = Storage.getReportById(id);
    if (report && this.canAccessReport(report)) {
      this.currentReport = { ...report };
      this.openingPhotos = report.openingPhotos || [];
      this.closingPhotos = report.closingPhotos || [];
      this.additionalPhotos = report.additionalPhotos || [];
      this.loadCurrentFormData(this.currentReport);
      this.isViewingSavedReport = true;
      this.setReportFormReadOnly(true);
      this.updateLivePreview();
      this.switchTab('document-tab');
      // Briefly allow DOM layout to update then trigger native print
      setTimeout(() => {
        ExportUtil.printReport();
      }, 150);
    }
  }

  printHistoryTable() {
    const branchFilter = document.getElementById('filter-branch')?.value || '';
    const dateFilter = document.getElementById('filter-date')?.value || '';
    const searchQuery = document.getElementById('search-reports')?.value || '';
    const rows = document.querySelectorAll('#reports-table-body tr.history-table-row');
    const totalCount = rows.length;

    const branchLabel = branchFilter ? this.getDisplayBranch(branchFilter, this.currentLang) : (this.currentLang === 'en' ? 'All Branches' : 'គ្រប់សាខាទាំងអស់');
    const dateLabel = dateFilter || (this.currentLang === 'en' ? 'All Dates' : 'គ្រប់កាលបរិច្ឆេទ');
    const printTime = new Date().toLocaleString(this.currentLang === 'en' ? 'en-US' : 'km-KH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const metaContainer = document.getElementById('history-print-meta');
    if (metaContainer) {
      metaContainer.innerHTML = `
        <div class="history-meta-chip">
          <span class="meta-label">${this.t('historyMetaBranch')}</span>
          <strong class="meta-val">${branchLabel}</strong>
        </div>
        <div class="history-meta-chip">
          <span class="meta-label">${this.t('historyMetaDate')}</span>
          <strong class="meta-val">${dateLabel}</strong>
        </div>
        <div class="history-meta-chip">
          <span class="meta-label">${this.t('historyMetaTotal')}</span>
          <strong class="meta-val">${totalCount}</strong>
        </div>
        <div class="history-meta-chip">
          <span class="meta-label">${this.t('historyMetaPrintedAt')}</span>
          <span class="meta-val">${printTime}</span>
        </div>
      `;
    }

    const origTitle = document.title;
    const dateSuffix = dateFilter || new Date().toISOString().split('T')[0];
    document.title = `BS_Express_Branch_Reports_History_${dateSuffix}`;

    document.body.classList.add('printing-history');
    window.print();

    const cleanup = () => {
      document.body.classList.remove('printing-history');
      document.title = origTitle;
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 2000);
  }

  editReport(id) {
    const isEn = this.currentLang === 'en';
    this.showToast(
      isEn 
        ? 'Uploaded reports in history are officially locked and cannot be edited.' 
        : 'របាយការណ៍ដែលបានរក្សាទុកក្នុងប្រវត្តិ ត្រូវបានចាក់សោរផ្លូវការ មិនអាចកែប្រែបានទេ!',
      'warning'
    );
  }

  setReportFormReadOnly(readOnly) {
    const form = document.getElementById('report-form');
    if (!form) return;
    form.querySelectorAll('input, textarea, select').forEach(field => {
      if (field.type === 'hidden' || field.type === 'file') return;
      if (field.tagName === 'SELECT') field.disabled = readOnly;
      else field.readOnly = readOnly;
    });
    form.querySelectorAll('.btn-add-item, .btn-remove-row, #btn-save-report').forEach(control => {
      control.disabled = readOnly;
    });
  }

  toggleReportApproval(id) {
    if (!this.isCurrentUserAdminOrTopMgmt()) {
      this.showToast(
        this.currentLang === 'en'
          ? 'Permission denied: Only Top Management and Admin can approve reports.'
          : 'គ្មានសិទ្ធិ៖ មានតែគណៈគ្រប់គ្រងជាន់ខ្ពស់ និង Admin ប៉ុណ្ណោះដែលអាចអនុម័តរបាយការណ៍!',
        'danger'
      );
      return;
    }

    const updated = Storage.toggleReportApproval(id, this.currentUser);
    if (updated) {
      const isApproved = updated.approvalStatus === 'approved';
      this.showToast(
        this.currentLang === 'en'
          ? (isApproved ? 'Report successfully approved by Top Management!' : 'Report approval revoked.')
          : (isApproved ? 'បានអនុម័តរបាយការណ៍ដោយជោគជ័យ!' : 'បានដកហូតការអនុម័តរបាយការណ៍រួចរាល់!'),
        isApproved ? 'success' : 'info'
      );

      // Refresh table, stats, and document view if viewing
      this.renderReportsTable();
      this.updateStats();
      if (this.currentReport && this.currentReport.id === id) {
        this.currentReport = updated;
        this.updateLivePreview();
      }
    }
  }

  approveCurrentReportDoc() {
    if (!this.currentReport || !this.currentReport.id) {
      this.showToast(
        this.currentLang === 'en'
          ? 'Please save/submit the report before approving.'
          : 'សូមរក្សាទុករបាយការណ៍ជាមុនសិន មុននឹងអនុម័ត!',
        'warning'
      );
      return;
    }
    this.toggleReportApproval(this.currentReport.id);
  }

  shareReportTg(id) {
    const report = Storage.getReportById(id);
    if (report && this.canAccessReport(report)) {
      const tgText = ExportUtil.formatForTelegram(report, this.currentLang);
      const contentEl = document.getElementById('telegram-content');
      if (contentEl) contentEl.textContent = tgText;
      document.getElementById('telegram-modal')?.classList.add('active');
    }
  }

  openTelegramModal() {
    this.syncFormToReport();
    const tgText = ExportUtil.formatForTelegram(this.currentReport, this.currentLang);
    const contentEl = document.getElementById('telegram-content');
    if (contentEl) contentEl.textContent = tgText;
    document.getElementById('telegram-modal')?.classList.add('active');
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
    this.showToast(isVisible ? (this.currentLang === 'en' ? 'Official seal displayed' : 'បានបង្ហាញត្រាក្រុមហ៊ុន') : (this.currentLang === 'en' ? 'Official seal hidden' : 'បានលាក់ត្រាក្រុមហ៊ុន'), 'primary');
  }

  deleteReport(id) {
    const report = Storage.getReportById(id);
    if (!report || !this.canAccessReport(report)) return;
    if (this.currentUser && !this.isCurrentUserAdminOrTopMgmt()) {
      this.showToast(this.currentLang === 'en' ? 'Saved reports are locked for regular users.' : 'របាយការណ៍ដែលបានរក្សាទុក ត្រូវបានចាក់សោសម្រាប់ User ធម្មតា។', 'warning');
      return;
    }
    const confirmMsg = this.currentLang === 'en' ? 'Are you sure you want to delete this report?' : 'តើអ្នកប្រាកដជាចង់លុបរបាយការណ៍នេះមែនទេ?';
    if (confirm(confirmMsg)) {
      Storage.deleteReport(id);

      // If currently editing or viewing the deleted report, reset form & clear draft
      if (this.currentReport && this.currentReport.id === id) {
        this.resetForm(true);
        Storage.clearDraft(report.branch);
      }

      this.renderReportsTable();
      this.updateStats();
      this.renderIssuesDashboard();
      this.updateIssuesStatsAndBadge();
      if (typeof this.renderBranchIssuesGraph === 'function') {
        this.renderBranchIssuesGraph();
      }
      this.showToast(this.currentLang === 'en' ? 'Report deleted successfully' : 'បានលុបរបាយការណ៍រួចរាល់', 'primary');
    }
  }

  clearAllReports() {
    if (this.currentUser && !this.isCurrentUserAdminOrTopMgmt()) {
      this.showToast(this.currentLang === 'en' ? 'Only administrators can clear all reports.' : 'មានតែអ្នកគ្រប់គ្រងប៉ុណ្ណោះដែលអាចលុបរបាយការណ៍ទាំងអស់។', 'warning');
      return;
    }
    const isEn = this.currentLang === 'en';
    const confirmMsg = isEn 
      ? 'Are you sure you want to delete ALL reports and clear all drafts? This action cannot be undone.' 
      : 'តើអ្នកប្រាកដជាចង់លុបរបាយការណ៍ទាំងអស់ និងជម្រះទិន្នន័យព្រាងមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។';
    if (confirm(confirmMsg)) {
      Storage.clearAllReports();
      this.resetForm(true);
      this.renderReportsTable();
      this.updateStats();
      this.renderIssuesDashboard();
      this.updateIssuesStatsAndBadge();
      if (typeof this.renderBranchIssuesGraph === 'function') {
        this.renderBranchIssuesGraph();
      }
      this.showToast(isEn ? 'All reports and drafts have been deleted.' : 'បានលុបរបាយការណ៍ និងទិន្នន័យព្រាងទាំងអស់រួចរាល់។', 'primary');
    }
  }

  // =========================================================================
  // BRANCH INCOMPLETE ISSUES DASHBOARD METHODS
  // =========================================================================
  getAllBranchIssues(includeAllBranches = false) {
    const reports = includeAllBranches ? Storage.getReports() : this.getAccessibleReports();
    const deletedIssueIds = Storage.getDeletedIssueIds();
    const allIssues = [];

    reports.forEach(r => {
      // 1. From report.issues array
      if (Array.isArray(r.issues) && r.issues.length > 0) {
        r.issues.forEach((iss, idx) => {
          if (iss && iss.issue && iss.issue.trim()) {
            const deterministicId = iss.id || `iss_${r.id}_${idx}`;
            const issueText = iss.issue.trim();
            if (deletedIssueIds.has(deterministicId) || (iss.id && deletedIssueIds.has(String(iss.id))) || deletedIssueIds.has(issueText)) {
              return; // Skip deleted issue
            }
            allIssues.push({
              id: deterministicId,
              reportId: r.id,
              branch: r.branch || 'មិនស្គាល់',
              date: r.date || '',
              dateDisplay: r.dateDisplay || r.date || '',
              reporterName: r.reporterName || '',
              position: r.position || '',
              issue: iss.issue,
              status: iss.status === 'complete' || iss.status === 'completed' ? 'complete' : 'incomplete',
              note: iss.note || '',
              comments: Array.isArray(iss.comments) ? iss.comments : []
            });
          }
        });
      } else {
        // Fallback: ONLY if report had no structured issues array at all or empty (legacy reports)
        const fallbackText = (r.unresolvedIssues || '').trim();
        const resolvedKeywords = ['គ្មាន', 'none', 'បានដោះស្រាយរួចរាល់ទាំងអស់', 'គ្មានបញ្ហា', 'ដោះស្រាយរួច', 'រួចរាល់', 'បានដោះស្រាយ', 'complete', 'completed', 'n/a', '-'];
        if (fallbackText && !resolvedKeywords.includes(fallbackText.toLowerCase())) {
          const fallbackId = `iss_unresolved_${r.id}`;
          if (deletedIssueIds.has(fallbackId) || deletedIssueIds.has(fallbackText)) {
            return; // Skip deleted fallback issue
          }
          allIssues.push({
            id: fallbackId,
            reportId: r.id,
            branch: r.branch || 'មិនស្គាល់',
            date: r.date || '',
            dateDisplay: r.dateDisplay || r.date || '',
            reporterName: r.reporterName || '',
            position: r.position || '',
            issue: r.unresolvedIssues,
            status: 'incomplete',
            note: 'បញ្ហាមិនទាន់ដោះស្រាយពេលបិទសាខា',
            comments: Array.isArray(r.issueComments) ? r.issueComments : []
          });
        }
      }
    });

    return allIssues;
  }

  updateIssuesStatsAndBadge() {
    const allIssues = this.getAllBranchIssues();
    const incompleteIssues = allIssues.filter(i => i.status !== 'complete');
    const resolvedIssues = allIssues.filter(i => i.status === 'complete');
    const uniqueBranchesWithIssues = new Set(incompleteIssues.map(i => i.branch).filter(Boolean));

    // Nav Badge
    const navBadge = document.getElementById('nav-issues-badge');
    if (navBadge) {
      navBadge.textContent = incompleteIssues.length;
      navBadge.style.display = incompleteIssues.length > 0 ? 'inline-flex' : 'none';
    }

    // Top KPI Stat Boxes
    const statIncomplete = document.getElementById('issue-stat-incomplete');
    const statBranches = document.getElementById('issue-stat-branches');
    const statResolved = document.getElementById('issue-stat-resolved');

    if (statIncomplete) statIncomplete.textContent = incompleteIssues.length;
    if (statBranches) statBranches.textContent = uniqueBranchesWithIssues.size;
    if (statResolved) statResolved.textContent = resolvedIssues.length;

    // Quick Filter Chip counts
    const chipIncomplete = document.getElementById('chip-count-incomplete');
    const chipAll = document.getElementById('chip-count-all');
    const chipResolved = document.getElementById('chip-count-resolved');

    if (chipIncomplete) chipIncomplete.textContent = incompleteIssues.length;
    if (chipAll) chipAll.textContent = allIssues.length;
    if (chipResolved) chipResolved.textContent = resolvedIssues.length;
  }

  renderIssuesDashboard() {
    this.updateIssuesStatsAndBadge();
    const container = document.getElementById('issues-grid-container');
    if (!container) return;

    let issues = this.getAllBranchIssues().filter(i => i.status !== 'complete');

    // Filters
    const searchTerm = (document.getElementById('search-issues')?.value || '').toLowerCase().trim();
    const branchFilter = document.getElementById('filter-issue-branch')?.value || '';
    const statusFilter = document.getElementById('filter-issue-status')?.value || 'all';
    const dateFilter = document.getElementById('filter-issue-date')?.value || '';

    // Active Quick Filter Chip
    const activeChip = document.querySelector('.issue-filter-chip.active')?.dataset.filter || 'all';

    // Apply Search
    if (searchTerm) {
      issues = issues.filter(i => {
        const enBranch = this.getDisplayBranch(i.branch, 'en').toLowerCase();
        const kmBranch = this.getDisplayBranch(i.branch, 'km').toLowerCase();
        return (i.issue && i.issue.toLowerCase().includes(searchTerm)) ||
          (i.branch && i.branch.toLowerCase().includes(searchTerm)) ||
          enBranch.includes(searchTerm) ||
          kmBranch.includes(searchTerm) ||
          (i.reporterName && i.reporterName.toLowerCase().includes(searchTerm)) ||
          (i.note && i.note.toLowerCase().includes(searchTerm));
      });
    }

    // Apply Branch Filter
    if (branchFilter) {
      const canonicalFilterBranch = this.getCanonicalBranch(branchFilter);
      issues = issues.filter(i => 
        i.branch === branchFilter || 
        this.getCanonicalBranch(i.branch) === canonicalFilterBranch
      );
    }

    // Apply Status Filter
    if (activeChip === 'incomplete') {
      issues = issues.filter(i => i.status === 'incomplete');
    } else if (activeChip === 'resolved') {
      issues = issues.filter(i => i.status === 'complete');
    } else if (statusFilter !== 'all') {
      issues = issues.filter(i => i.status === statusFilter);
    }

    if (dateFilter) {
      issues = issues.filter(i => i.date === dateFilter);
    }

    if (issues.length === 0) {
      const emptyMsg = this.t('emptyIssuesText');
      container.innerHTML = `
        <div class="issues-empty-state">
          <h3>${emptyMsg}</h3>
          <p style="color: hsl(var(--muted-foreground)); font-size: 0.85rem; margin-top: 0.35rem;">
            ${this.currentLang === 'en' ? 'Try adjusting your search or filters to see past resolved records.' : 'សូមសាកល្បងប្តូរលក្ខខណ្ឌស្វែងរក ឬជ្រើសរើសមើលបញ្ហាដែលបានដោះស្រាយរួច។'}
          </p>
        </div>
      `;
      return;
    }

    const isEn = this.currentLang === 'en';
    const btnMarkDoneText = isEn ? 'Mark Resolved' : 'សម្គាល់ថារួចរាល់';
    const btnMarkPendingText = isEn ? 'Mark Incomplete' : 'ប្តូរជាមិនទាន់រួចរាល់';
    const btnViewText = isEn ? 'View A4 Form' : 'មើលទម្រង់ A4';
    const btnEditText = isEn ? 'Edit Report' : 'កែប្រែរបាយការណ៍';
    const btnDeleteText = isEn ? 'Delete' : 'លុប';
    const notePrefix = isEn ? 'Plan/Note:' : 'ផែនការដោះស្រាយ៖';

    container.innerHTML = issues.map(iss => {
      const isIncomplete = iss.status === 'incomplete';
      const statusBadgeClass = isIncomplete ? 'issue-badge-incomplete' : 'issue-badge-resolved';
      const statusLabel = isIncomplete ? (isEn ? 'Incomplete' : 'មិនទាន់រួចរាល់') : (isEn ? 'Resolved' : 'បានដោះស្រាយរួច');
      const toggleActionText = isIncomplete ? btnMarkDoneText : btnMarkPendingText;
      const toggleBtnClass = isIncomplete ? 'btn-issue-action-complete' : 'btn-issue-action-incomplete';

      return `
        <div class="issue-card ${isIncomplete ? 'issue-card-incomplete' : 'issue-card-resolved'}">
          <div class="issue-card-top">
            <div class="issue-branch-badge">
              <strong>${this.getDisplayBranch(iss.branch, this.currentLang)}</strong>
            </div>
            <div class="issue-card-meta">
              <span class="issue-date">${iss.dateDisplay || iss.date || '-'}</span>
              <span class="issue-status-pill ${statusBadgeClass}">${statusLabel}</span>
            </div>
          </div>

          <div class="issue-reporter-bar">
            <span><strong>${iss.reporterName || '-'}</strong> <small>(${this.getDisplayRole(iss.position, this.currentLang)})</small></span>
          </div>

          <div class="issue-body-box">
            <div class="issue-text-content">
              ${iss.issue}
            </div>
            ${iss.note ? `
              <div class="issue-note-callout">
                <strong>${notePrefix}</strong> ${iss.note}
              </div>
            ` : ''}
            <div class="issue-comments-thread">
              ${(iss.comments || []).map(comment => `
                <div class="issue-comment-item">
                  <strong>${this.escapeHtmlAttr(comment.author || 'User')}</strong>
                  <span>${this.escapeHtmlAttr(comment.text || '')}</span>
                </div>
              `).join('')}
              <div class="issue-comment-compose">
                <input type="text" class="form-input issue-comment-input" id="issue-comment-${iss.id}" placeholder="${isEn ? 'Write a comment or reply...' : 'សរសេរ Comment ឬ Reply...'}" autocomplete="off">
                <button type="button" class="btn btn-sm btn-secondary" onclick="window.bsApp.addIssueComment('${iss.reportId}', '${iss.id}')">${isEn ? 'Send' : 'ផ្ញើ'}</button>
              </div>
            </div>
          </div>

          <div class="issue-card-footer">
            <div class="issue-actions-left">
              <button type="button" class="btn btn-sm ${toggleBtnClass}" onclick="window.bsApp.toggleIssueStatus('${iss.reportId}', '${iss.id}', '${iss.status}')">
                ${toggleActionText}
              </button>
            </div>
            <div class="issue-actions-right">
              <button type="button" class="btn btn-sm btn-secondary" onclick="window.bsApp.viewReportDoc('${iss.reportId}')" title="${btnViewText}">
                ${btnViewText}
              </button>
              <button type="button" class="btn btn-sm btn-secondary" onclick="window.bsApp.shareSingleIssueTg('${iss.reportId}', '${iss.id}')" title="Telegram">
                Telegram
              </button>
              <button type="button" class="btn btn-sm btn-outline-danger" onclick="window.bsApp.deleteIssue('${iss.reportId}', '${iss.id}')" title="${btnDeleteText}">
                ${btnDeleteText}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  deleteIssue(reportId, issueId) {
    const isEn = this.currentLang === 'en';
    const confirmMsg = isEn 
      ? 'Are you sure you want to delete this issue record?' 
      : 'តើអ្នកពិតជាចង់លុបបញ្ហានេះចេញមែនទេ?';
    
    if (!confirm(confirmMsg)) return;

    const success = Storage.deleteIssue(reportId, issueId);
    if (success) {
      // Also sync in-memory currentReport and draft if currently viewing or editing this report
      if (this.currentReport && (this.currentReport.id === reportId || !reportId)) {
        if (Array.isArray(this.currentReport.issues)) {
          this.currentReport.issues = this.currentReport.issues.filter((iss, idx) => 
            iss.id !== issueId && `iss_${this.currentReport.id}_${idx}` !== issueId && iss.issue !== issueId
          );
        }
        const remainingIncomplete = (this.currentReport.issues || []).filter(i => i && i.status !== 'complete' && i.status !== 'completed' && i.issue);
        if (issueId === `iss_unresolved_${this.currentReport.id}` || remainingIncomplete.length === 0) {
          this.currentReport.unresolvedIssues = '';
          const unresHidden = document.getElementById('form-unresolved');
          if (unresHidden) unresHidden.value = '';
        } else {
          this.currentReport.unresolvedIssues = remainingIncomplete.map(i => i.issue).join('\n');
          const unresHidden = document.getElementById('form-unresolved');
          if (unresHidden) unresHidden.value = this.currentReport.unresolvedIssues;
        }
        Storage.saveDraft(this.currentReport);
        if (this.isEditingSavedReport || this.isViewingSavedReport) {
          this.renderIssueRows(this.currentReport.issues);
        }
      }

      this.renderIssuesDashboard();
      this.updateIssuesStatsAndBadge();
      this.renderReportsTable();
      this.updateStats();
      if (typeof this.renderBranchIssuesGraph === 'function') {
        this.renderBranchIssuesGraph();
      }
      const msg = isEn ? 'Issue deleted successfully.' : 'បានលុបបញ្ហារួចរាល់!';
      this.showToast(msg, 'success');
    }
  }

  addIssueComment(reportId, issueId) {
    const input = document.getElementById(`issue-comment-${issueId}`);
    const text = input?.value?.trim();
    if (!text) return;
    const report = Storage.getReportById(reportId);
    if (!report || !this.canAccessReport(report)) return;
    const issue = Array.isArray(report.issues)
      ? report.issues.find((item, index) => item.id === issueId || `iss_${report.id}_${index}` === issueId || item.issue === issueId)
      : null;
    if (issue) {
      issue.comments = Array.isArray(issue.comments) ? issue.comments : [];
      issue.comments.push({
        id: `comment_${Date.now()}`,
        author: this.currentUser?.fullName || this.currentUser?.username || 'User',
        role: this.currentUser?.role || '',
        text,
        createdAt: new Date().toISOString()
      });
      Storage.saveReport(report);
      this.renderIssuesDashboard();
      this.updateIssuesStatsAndBadge();
    }
  }

  toggleIssueStatus(reportId, issueId, currentStatus) {
    const newStatus = currentStatus === 'incomplete' ? 'complete' : 'incomplete';
    const success = Storage.updateIssueStatus(reportId, issueId, newStatus);
    if (success) {
      this.renderIssuesDashboard();
      this.updateIssuesStatsAndBadge();
      this.renderReportsTable();
      this.updateStats();
      const msg = newStatus === 'complete' 
        ? (this.currentLang === 'en' ? 'Issue marked as resolved!' : 'បានសម្គាល់ថាបញ្ហាត្រូវបានដោះស្រាយរួចរាល់!')
        : (this.currentLang === 'en' ? 'Issue marked as incomplete.' : 'បានប្តូរស្ថានភាពជាមិនទាន់រួចរាល់។');
      this.showToast(msg, 'success');
    }
  }

  shareSingleIssueTg(reportId, issueId) {
    const allIssues = this.getAllBranchIssues();
    const issue = allIssues.find(i => i.reportId === reportId && (i.id === issueId || i.issue === issueId));
    if (!issue) return;

    const isEn = this.currentLang === 'en';
    const divider = '━━━━━━━━━━━━━━━━━━━━━━';
    const text = isEn ? `🚨 *BS Express - Branch Issue Follow-up*
${divider}
🏢 *Branch:* ${issue.branch}
📅 *Date:* ${issue.dateDisplay || issue.date}
👤 *Reporter:* ${issue.reporterName} (${issue.position})
${divider}
⚠️ *Issue:* ${issue.issue}
👉 *Status:* ${issue.status === 'complete' ? '✅ Resolved' : '🔴 Incomplete'}
${issue.note ? `📝 *Plan/Note:* ${issue.note}\n` : ''}${divider}
📍 *HQ Operations Monitoring*` : `🚨 *ក្រុមហ៊ុនប៊ីអេស អិចប្រេស - តាមដានបញ្ហាសាខា*
${divider}
🏢 *សាខា៖* ${issue.branch}
📅 *កាលបរិច្ឆេទ៖* ${issue.dateDisplay || issue.date}
👤 *អ្នករាយការណ៍៖* ${issue.reporterName} (${issue.position})
${divider}
⚠️ *បញ្ហាប្រឈម៖* ${issue.issue}
👉 *ស្ថានភាព៖* ${issue.status === 'complete' ? '✅ បានដោះស្រាយរួច' : '🔴 មិនទាន់រួចរាល់'}
${issue.note ? `📝 *ផែនការដោះស្រាយ៖* ${issue.note}\n` : ''}${divider}
📍 *មជ្ឈមណ្ឌលប្រតិបត្តិការកណ្តាល (HQ)*`;

    const contentEl = document.getElementById('telegram-content');
    if (contentEl) contentEl.textContent = text;
    document.getElementById('telegram-modal')?.classList.add('active');
  }

  shareAllIncompleteIssuesTg() {
    const allIssues = this.getAllBranchIssues();
    const tgText = ExportUtil.formatIncompleteIssuesForTelegram(allIssues, this.currentLang);
    const contentEl = document.getElementById('telegram-content');
    if (contentEl) contentEl.textContent = tgText;
    document.getElementById('telegram-modal')?.classList.add('active');
  }

  isCurrentUserAdmin() {
    const user = this.currentUser;
    if (!user) return false;
    const role = String(user.role || '').toLowerCase();
    const roleId = String(user.roleId || '').toLowerCase();
    const username = String(user.username || '').toLowerCase();
    return (
      role.includes('admin') ||
      role.includes('administrator') ||
      role.includes('system') ||
      role.includes('អ្នកគ្រប់គ្រង') ||
      role.includes('នាយកដ្ឋាន') ||
      role.includes('ថ្នាក់ដឹកនាំ') ||
      role.includes('top management') ||
      roleId === 'sys_admin' ||
      roleId === 'admin' ||
      roleId === 'top_management' ||
      username === 'admin' ||
      username === 'sysadmin' ||
      username === 'rithjengdavid' ||
      username === 'vid' ||
      username === 'vif'
    );
  }

  isCurrentUserTopManagement() {
    const user = this.currentUser;
    if (!user) return false;
    const role = String(user.role || '').toLowerCase();
    const roleId = String(user.roleId || '').toLowerCase();
    const username = String(user.username || '').toLowerCase();
    return (
      role.includes('top management') || 
      role.includes('top-management') || 
      role.includes('top_management') ||
      role.includes('top-manament') ||
      role.includes('topmanament') ||
      role.includes('ថ្នាក់ដឹកនាំ') || 
      role.includes('គណៈគ្រប់គ្រង') ||
      role.includes('admin') ||
      role.includes('administrator') ||
      role.includes('នាយក') ||
      roleId === 'top_management' ||
      roleId === 'sys_admin' ||
      roleId === 'admin' ||
      username === 'admin' ||
      username === 'sysadmin' ||
      username === 'rithjengdavid' ||
      username === 'vid' ||
      username === 'vif'
    );
  }

  isCurrentUserAdminOrTopMgmt() {
    return this.isCurrentUserAdmin() || this.isCurrentUserTopManagement();
  }

  getCanonicalBranch(branch) {
    const value = String(branch || '').trim();
    if (!value) return '';
    // Direct match in Khmer list
    const kmIdx = BRANCH_LIST.indexOf(value);
    if (kmIdx >= 0) return BRANCH_LIST[kmIdx];
    // Match in English list
    const enIdx = BRANCH_LIST_EN.findIndex(b => b.toLowerCase() === value.toLowerCase());
    if (enIdx >= 0) return BRANCH_LIST[enIdx];
    // Match partial / unaccented
    const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const fuzzyIdx = BRANCH_LIST_EN.findIndex(b => b.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === normalized);
    if (fuzzyIdx >= 0) return BRANCH_LIST[fuzzyIdx];
    // Common aliases
    if (value === 'HQ' || value.toLowerCase() === 'headquarters' || value.includes('ការិយាល័យកណ្តាល') || value.includes('ការិយាល័យកណ្ដាល')) {
      return BRANCH_LIST[0]; // ការិយាល័យកណ្តាល
    }
    if (value.toLowerCase().includes('phnom penh') || value.includes('ភ្នំពេញ')) {
      return 'ភ្នំពេញ (ដូនពេញ)';
    }
    return value;
  }

  getDisplayBranch(branch, lang = this.currentLang) {
    const value = String(branch || '').trim();
    if (!value) return '';
    const canonical = this.getCanonicalBranch(value);
    const idx = BRANCH_LIST.indexOf(canonical);
    if (idx >= 0) {
      return lang === 'en' ? BRANCH_LIST_EN[idx] : BRANCH_LIST[idx];
    }
    if (canonical === 'ភ្នំពេញ (ដូនពេញ)' || canonical.includes('ភ្នំពេញ')) {
      return lang === 'en' ? 'Phnom Penh (Daun Penh)' : 'ភ្នំពេញ (ដូនពេញ)';
    }
    return canonical;
  }

  getDisplayRole(role, lang = this.currentLang) {
    const value = String(role || '').trim();
    if (!value) return lang === 'en' ? 'Branch Manager' : 'ប្រធានសាខា';
    const lower = value.toLowerCase();
    if (lower.includes('system administrator') || lower.includes('អ្នកគ្រប់គ្រងប្រព័ន្ធ')) {
      return lang === 'en' ? 'System Administrator' : 'អ្នកគ្រប់គ្រងប្រព័ន្ធ';
    }
    if (lower.includes('top management') || lower.includes('top-management') || lower.includes('top_management') || lower.includes('top-manament') || lower.includes('topmanament') || lower.includes('ថ្នាក់ដឹកនាំជាន់ខ្ពស់') || lower.includes('គណៈគ្រប់គ្រង')) {
      return lang === 'en' ? 'Top Management' : 'គណៈគ្រប់គ្រងជាន់ខ្ពស់';
    }
    if (lower.includes('admin') || lower.includes('នាយកដ្ឋានប្រតិបត្តិការ')) {
      return lang === 'en' ? 'Operations Directorate' : 'នាយកដ្ឋានប្រតិបត្តិការ';
    }
    if (lower.includes('customer service') || lower.includes('សេវាអតិថិជន')) {
      return lang === 'en' ? 'Customer Service' : 'ផ្នែកសេវាអតិថិជន';
    }
    if (lower.includes('deputy') || lower.includes('អនុប្រធាន')) {
      return lang === 'en' ? 'Deputy Branch Manager' : 'អនុប្រធានសាខា';
    }
    if (lower.includes('ops supervisor') || lower.includes('supervisor') || lower.includes('មេការ')) {
      return lang === 'en' ? 'Operations Supervisor' : 'មេការប្រតិបត្តិការ';
    }
    if (lower.includes('operations') || lower.includes('ប្រតិបត្តិការ') || lower.includes('បុគ្គលិក')) {
      return lang === 'en' ? 'Operations Staff' : 'បុគ្គលិកប្រតិបត្តិការ';
    }
    if (lower.includes('manager') || lower.includes('ប្រធាន')) {
      return lang === 'en' ? 'Branch Manager' : 'ប្រធានសាខា';
    }
    return value;
  }

  formatAbsentDisplay(absentVal, isEn = (this.currentLang === 'en')) {
    if (absentVal === undefined || absentVal === null) {
      return isEn ? 'None' : 'គ្មាន';
    }
    const str = String(absentVal).trim();
    if (!str || str === '0' || str === '0 នាក់' || str.toLowerCase() === 'none' || str.toLowerCase() === '0 person' || str.toLowerCase() === '0 staff' || str === 'គ្មាន' || str === '-') {
      return isEn ? 'None' : 'គ្មាន';
    }
    if (/^\d+$/.test(str)) {
      const num = parseInt(str, 10);
      if (num === 0) return isEn ? 'None' : 'គ្មាន';
      return isEn ? (num === 1 ? '1 person' : `${num} persons`) : `${num} នាក់`;
    }
    return str;
  }

  setAbsentQuickTag(value) {
    const input = document.getElementById('form-absent-count');
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
    }
  }

  setSelectBranch(selectEl, branchValue) {
    if (!selectEl || !branchValue) return;
    const canonical = this.getCanonicalBranch(branchValue);
    const displayEn = this.getDisplayBranch(canonical, 'en');
    const displayKm = this.getDisplayBranch(canonical, 'km');

    for (let i = 0; i < selectEl.options.length; i++) {
      const optVal = selectEl.options[i].value;
      const optText = selectEl.options[i].textContent;
      if (
        optVal === canonical ||
        optVal === displayEn ||
        optVal === displayKm ||
        optText === displayEn ||
        optText === displayKm ||
        this.getCanonicalBranch(optVal) === canonical
      ) {
        selectEl.selectedIndex = i;
        return;
      }
    }
  }

  canAccessReport(report) {
    if (!report) return false;
    if (!this.currentUser || this.isCurrentUserAdminOrTopMgmt()) return true;
    const userBranch = this.getCanonicalBranch(this.currentUser.branch);
    const reportBranch = this.getCanonicalBranch(report.branch);
    return Boolean(userBranch && reportBranch && userBranch === reportBranch);
  }

  getAccessibleReports() {
    const reports = Storage.getReports();
    return this.currentUser && !this.isCurrentUserAdminOrTopMgmt()
      ? reports.filter(report => this.canAccessReport(report))
      : reports;
  }

  // =========================================================================
  // AUTHENTICATION & FIRST SCREEN GATEWAY METHODS
  // =========================================================================
  initAuth() {
    this.currentUser = Storage.getCurrentUser();
    if (typeof Storage.syncUsersFromDatabase === 'function') {
      Storage.syncUsersFromDatabase().then(() => {
        if (this.isCurrentUserAdminOrTopMgmt()) {
          this.renderUsersTable();
        }
      }).catch(() => {});
    }
    if (this.currentUser) {
      this.populateBranchDropdowns();
      this.fillFormFromCurrentUser();
      const userBranch = this.getCanonicalBranch(this.currentUser.branch);
      const branchDraft = Storage.getDraft(userBranch);
      if (branchDraft && Object.keys(branchDraft).length > 0 && this.canAccessReport(branchDraft)) {
        this.populateForm(branchDraft);
        this.updateLivePreview();
      }
    }
    this.updateScreenVisibility();
    this.updateIssueFeatureVisibility();
    this.renderReportsTable();
    this.renderAuthNav();
    this.updateDbIndicator(Storage.isDbOnline);
  }

  // =========================================================================
  // MULTI-SYSTEM ROUTER & LAUNCHER (DAILY REPORT & FIXED ASSET)
  // =========================================================================
  initSystemRouter() {
    window.addEventListener('hashchange', () => {
      this.handleHashChange();
    });

    // Handle deep linking or initial view
    this.handleInitialSystem();
  }

  handleInitialSystem() {
    const hash = (window.location.hash || '').toLowerCase();
    if (hash === '#portal') {
      this.switchSystem('portal', false);
      return;
    }
    if (hash === '#fixasset' || hash === '#fix-asset') {
      this.switchSystem('fixasset', false);
      return;
    }
    if (hash === '#report' || hash === '#daily-report') {
      this.switchSystem('daily-report', false);
      return;
    }

    // If no hash in URL:
    const saved = Storage && typeof Storage.getActiveSystem === 'function' ? Storage.getActiveSystem() : null;
    if (saved) {
      this.switchSystem(saved, false);
    } else {
      // Default to the luxury Portal Launcher Hub
      this.switchSystem('portal', false);
    }
  }

  handleHashChange() {
    const hash = (window.location.hash || '').toLowerCase();
    if (hash === '#portal') {
      this.switchSystem('portal', false);
    } else if (hash === '#fixasset' || hash === '#fix-asset') {
      this.switchSystem('fixasset', false);
    } else if (hash === '#report' || hash === '#daily-report') {
      this.switchSystem('daily-report', false);
    }
  }

  switchSystem(sys, updateHash = true) {
    if (sys === 'fix-asset') sys = 'fixasset';
    if (sys === 'report') sys = 'daily-report';
    this.activeSystem = sys;

    if (Storage && typeof Storage.setActiveSystem === 'function') {
      Storage.setActiveSystem(sys);
    }

    if (updateHash) {
      if (sys === 'portal') {
        if (window.location.hash !== '#portal') window.location.hash = '#portal';
      } else if (sys === 'fixasset') {
        if (window.location.hash !== '#fixasset') window.location.hash = '#fixasset';
      } else {
        if (window.location.hash !== '#report' && window.location.hash !== '#daily-report') {
          window.location.hash = '#report';
        }
      }
    }

    this.updateScreenVisibility();
  }

  updateScreenVisibility() {
    const authScreen = document.getElementById('auth-gateway-screen');
    const mainApp = document.getElementById('main-app-wrapper');
    const portalHub = document.getElementById('portal-hub-screen');
    const fixAssetWrap = document.getElementById('fixasset-workspace-wrapper');

    let currentSys = this.activeSystem || 'portal';
    if (currentSys === 'fix-asset') currentSys = 'fixasset';
    if (currentSys === 'report') currentSys = 'daily-report';

    // 1. PORTAL HUB SCREEN
    if (currentSys === 'portal') {
      document.body.classList.remove('fa-workspace-active');
      if (portalHub) portalHub.style.display = 'flex';
      if (authScreen) authScreen.style.display = 'none';
      if (mainApp) mainApp.style.display = 'none';
      if (fixAssetWrap) {
        fixAssetWrap.style.display = 'none';
        fixAssetWrap.classList.remove('active');
      }
      this.updateSystemSwitcherPill('portal');
      return;
    }

    // 2. FIXED ASSET SCREEN
    if (currentSys === 'fixasset') {
      const isAuthenticated = Boolean(this.currentUser && this.currentUser.username);
      if (!isAuthenticated) {
        document.body.classList.remove('fa-workspace-active');
        if (portalHub) portalHub.style.display = 'none';
        if (fixAssetWrap) {
          fixAssetWrap.style.display = 'none';
          fixAssetWrap.classList.remove('active');
        }
        if (mainApp) mainApp.style.display = 'none';
        if (authScreen) authScreen.style.display = 'grid';
        this.updateSystemSwitcherPill('fixasset');
        return;
      }

      document.body.classList.add('fa-workspace-active');
      if (portalHub) portalHub.style.display = 'none';
      if (authScreen) authScreen.style.display = 'none';
      if (mainApp) mainApp.style.display = 'none';
      if (fixAssetWrap) {
        fixAssetWrap.style.display = 'flex';
        fixAssetWrap.classList.add('active');
      }
      this.updateSystemSwitcherPill('fixasset');
      if (window.fixAssetUI) {
        window.fixAssetUI.init();
      }
      return;
    }

    // 3. DAILY REPORT SYSTEM
    document.body.classList.remove('fa-workspace-active');
    if (portalHub) portalHub.style.display = 'none';
    if (fixAssetWrap) {
      fixAssetWrap.style.display = 'none';
      fixAssetWrap.classList.remove('active');
    }
    this.updateSystemSwitcherPill('daily-report');

    const isAuthenticated = Boolean(this.currentUser && this.currentUser.username);
    if (isAuthenticated) {
      if (authScreen) authScreen.style.display = 'none';
      if (mainApp) {
        mainApp.style.display = 'block';
        this.populateBranchDropdowns();
        this.syncFormToReport();
        this.updateLivePreview();
        this.renderReportsTable();
        this.updateStats();
        this.renderIssuesDashboard();
        this.updateIssuesStatsAndBadge();
      }
    } else {
      if (authScreen) authScreen.style.display = 'grid';
      if (mainApp) mainApp.style.display = 'none';
    }
  }

  updateSystemSwitcherPill(activeSys) {
    const reportBtns = document.querySelectorAll('.sys-pill-btn[onclick*="daily-report"], #btn-switch-to-report');
    const assetBtns = document.querySelectorAll('.sys-pill-btn[onclick*="fix-asset"], .sys-pill-btn[onclick*="fixasset"], #btn-switch-to-fixasset');
    const portalBtns = document.querySelectorAll('.sys-pill-btn[onclick*="portal"], #btn-switch-to-portal');

    reportBtns.forEach(btn => {
      if (activeSys === 'daily-report') btn.classList.add('active');
      else btn.classList.remove('active');
    });

    assetBtns.forEach(btn => {
      if (activeSys === 'fixasset') btn.classList.add('active');
      else btn.classList.remove('active');
    });

    portalBtns.forEach(btn => {
      if (activeSys === 'portal') btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  // =========================================================================
  // FIXED ASSET SYSTEM (100% NATIVE CLOUD-FIRST UI DELEGATES)
  // =========================================================================
  ensureFixAssetFrameLoaded() {
    if (window.fixAssetUI) {
      window.fixAssetUI.init();
    }
  }

  reloadFixAssetFrame() {
    if (window.fixAssetUI) {
      window.fixAssetUI.loadStats();
      window.fixAssetUI.switchTab(window.fixAssetUI.activeTab || 'dashboard');
    }
    this.showToast(this.currentLang === 'en' ? 'Refreshed Fixed Asset data' : 'បានផ្ទុកទិន្នន័យ Fixed Asset ឡើងវិញ', 'success');
  }

  openFixAssetNewTab() {
    window.open('#fixasset', '_blank');
  }

  renderAuthNav() {
    const container = document.getElementById('auth-nav-container');
    if (!container) return;

    if (this.currentUser) {
      const initials = (this.currentUser.fullName || this.currentUser.username || 'U')
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'U';

      const role = this.currentUser.role || '';
      const uname = (this.currentUser.username || '').toLowerCase();
      const isSystemAdmin = this.isCurrentUserAdminOrTopMgmt();

      let roleBadgeTheme = 'badge-role-admin';
      if (isSystemAdmin) roleBadgeTheme = 'badge-role-sysadmin';
      else if (role.includes('Admin') || role.includes('នាយកដ្ឋាន')) roleBadgeTheme = 'badge-role-admin';
      else if (role.includes('ប្រធាន') || role.includes('Manager')) roleBadgeTheme = 'badge-role-manager';
      else if (role.includes('អនុប្រធាន') || role.includes('Deputy')) roleBadgeTheme = 'badge-role-deputy';
      else if (role.includes('បុគ្គលិក') || role.includes('Operations')) roleBadgeTheme = 'badge-role-ops';
      else if (role.includes('សេវា') || role.includes('Customer Service')) roleBadgeTheme = 'badge-role-cs';

      // Concise Clean Role Text
      let displayRole = this.getDisplayRole(role, this.currentLang);
      let displayBranch = this.getDisplayBranch(this.currentUser.branch, this.currentLang);

      const adminBtnText = this.currentLang === 'en' ? 'Users & Pass' : 'គណនី & Pass';
      const adminBtnHtml = isSystemAdmin ? `
        <button type="button" class="btn-nav-users-mgr" id="btn-open-user-mgr" title="${this.currentLang === 'en' ? 'Inspect All Accounts & Passwords' : 'ពិនិត្យបញ្ជីគណនី Username & Password ទាំងអស់'}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>${adminBtnText}</span>
        </button>
      ` : '';

      const fullName = this.currentUser.fullName || this.currentUser.username || 'User';

      container.innerHTML = `
        ${adminBtnHtml}
        <div class="auth-user-pill" title="${fullName} (${this.currentUser.role || ''}) • ${displayBranch || ''}">
          <div class="user-avatar-wrap">
            <div class="user-avatar">${initials}</div>
            <span class="user-avatar-dot"></span>
          </div>
          <div class="user-info-text">
            <span class="user-name-display">${fullName}</span>
            ${displayBranch ? `<span class="user-branch-text">${displayBranch}</span>` : ''}
          </div>
          <button type="button" class="btn-nav-logout" id="btn-logout" title="${this.t('btnLogout')}">
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
          <span data-i18n="btnOpenAuth">${this.t('btnOpenAuth')}</span>
        </button>
      `;

      document.getElementById('btn-open-auth-modal')?.addEventListener('click', () => {
        this.openAuthModal('login');
      });
    }
  }

  // =========================================================================
  // =========================================================================
  // USER CREDENTIALS & PASSWORDS INSPECTOR (ADMIN TOOL)
  // =========================================================================
  async openUsersModal() {
    if (!this.isCurrentUserAdminOrTopMgmt()) {
      this.showToast(this.currentLang === 'en' ? 'Access restricted: Only Admin or Top Management can view user accounts!' : 'សិទ្ធិត្រូវបានកំណត់៖ មានតែ Admin ឬ គណៈគ្រប់គ្រង ទើបអាចមើលបញ្ជីគណនីបាន!', 'warning');
      return;
    }
    const modal = document.getElementById('users-management-modal');
    if (!modal) return;
    this.populateBranchDropdowns();
    this.usersFilterRole = 'all';
    document.querySelectorAll('#users-role-filters .user-filter-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.filterRole === 'all');
    });
    const searchInput = document.getElementById('search-users-input');
    const clearBtn = document.getElementById('btn-clear-search-users');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    const addPanel = document.getElementById('admin-quick-add-panel');
    if (addPanel) addPanel.style.display = 'none';
    modal.classList.add('active');
    this.renderUsersTable();

    if (typeof Storage.syncUsersFromDatabase === 'function') {
      await Storage.syncUsersFromDatabase();
      this.renderUsersTable(searchInput?.value || '');
    }
  }

  closeUsersModal() {
    const modal = document.getElementById('users-management-modal');
    if (modal) modal.classList.remove('active');
  }

  toggleAllPasswords() {
    this.showAllPasswords = !this.showAllPasswords;
    const btn = document.getElementById('btn-toggle-all-passwords');
    const label = document.getElementById('label-toggle-all-pwd');
    if (btn) {
      btn.classList.toggle('is-active', this.showAllPasswords);
    }
    if (label) {
      label.innerHTML = this.showAllPasswords 
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg><span>${this.currentLang === 'en' ? 'Hide Passwords' : 'លាក់ Password'}</span>`
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg><span>${this.currentLang === 'en' ? 'Show Passwords' : 'បង្ហាញ Password'}</span>`;
    }
    this.renderUsersTable(document.getElementById('search-users-input')?.value || '');
  }

  copyToClipboard(text, successMsg, btn = null) {
    const showSuccess = () => {
      this.showToast(successMsg, 'success');
      if (btn) {
        const origHtml = btn.innerHTML;
        btn.classList.add('is-copied');
        btn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
        setTimeout(() => {
          btn.classList.remove('is-copied');
          btn.innerHTML = origHtml;
        }, 1200);
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showSuccess();
      }).catch(() => {
        this.fallbackCopy(text, showSuccess);
      });
    } else {
      this.fallbackCopy(text, showSuccess);
    }
  }

  fallbackCopy(text, callback) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '-9999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(ta);
      if (successful) {
        if (callback) callback();
      } else {
        this.showToast(text, 'primary');
      }
    } catch (e) {
      this.showToast(text, 'primary');
    }
  }

  renderUsersTable(filterText = '') {
    const tbody = document.getElementById('users-table-body');
    const summary = document.getElementById('users-count-summary');
    const headerBadge = document.getElementById('users-header-badge');
    if (!tbody) return;

    const users = Storage.getUsers();
    const query = filterText.trim().toLowerCase();
    const roleFilter = this.usersFilterRole || 'all';

    const filtered = users.filter(u => {
      // Role filter chip
      if (roleFilter === 'admin') {
        const r = (u.role || '').toLowerCase();
        const un = (u.username || '').toLowerCase();
        const isAdm = r.includes('system') || r.includes('អ្នកគ្រប់គ្រង') || r.includes('admin') || r.includes('នាយក') || r.includes('top') || un === 'rithjengdavid' || un === 'admin' || un === 'sysadmin' || un === 'vid' || un === 'vif';
        if (!isAdm) return false;
      } else if (roleFilter === 'manager') {
        const r = (u.role || '').toLowerCase();
        const isMgr = r.includes('ប្រធាន') || r.includes('manager') || r.includes('អនុប្រធាន');
        if (!isMgr) return false;
      } else if (roleFilter === 'staff') {
        const r = (u.role || '').toLowerCase();
        const isStaff = r.includes('បុគ្គលិក') || r.includes('សេវា') || r.includes('staff') || r.includes('ops');
        if (!isStaff) return false;
      }

      if (!query) return true;
      return (
        (u.fullName && u.fullName.toLowerCase().includes(query)) ||
        (u.username && u.username.toLowerCase().includes(query)) ||
        (u.role && u.role.toLowerCase().includes(query)) ||
        (u.branch && u.branch.toLowerCase().includes(query)) ||
        (u.phone && String(u.phone).includes(query))
      );
    });

    if (headerBadge) {
      headerBadge.textContent = this.currentLang === 'en' ? `${filtered.length} Users` : `${filtered.length} គណនី`;
    }

    if (summary) {
      summary.textContent = this.currentLang === 'en' 
        ? `Total ${filtered.length} accounts (${users.length} registered)` 
        : `សរុប ${filtered.length} គណនី (នៃ ${users.length} គណនីក្នុងប្រព័ន្ធ)`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2.8rem 1rem; color: hsl(var(--muted-foreground));">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.65rem;">
              <div style="width: 44px; height: 44px; border-radius: 50%; background: hsl(var(--muted)); display: flex; align-items: center; justify-content: center; opacity: 0.7;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <span style="font-size: 0.92rem; font-weight: 600; color: hsl(var(--foreground));">${this.currentLang === 'en' ? `No accounts match "${filterText}"` : `មិនមានគណនីដែលត្រូវនឹង "${filterText}" ទេ`}</span>
              <span style="font-size: 0.78rem;">${this.currentLang === 'en' ? 'Try searching another keyword or switch role filter tab' : 'សូមសាកល្បងស្វែងរកពាក្យផ្សេង ឬចុចផ្ទាំងចម្រាញ់តួនាទីផ្សេង'}</span>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(u => {
      const initials = (u.fullName || u.username || 'U')
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'U';

      let avatarClass = 'avatar-blue';
      let badgeClass = 'badge-blue';
      const r = (u.role || '');
      const uLower = (u.username || '').toLowerCase();
      const isSystemAdmin = uLower === 'admin' || uLower === 'sysadmin' || uLower === 'rithjengdavid' || uLower === 'vid' || uLower === 'vif' || r.includes('System') || r.includes('អ្នកគ្រប់គ្រង') || r.includes('Admin') || r.includes('នាយកដ្ឋាន') || r.includes('Top Management') || r.includes('គណៈគ្រប់គ្រង');

      if (isSystemAdmin) {
        avatarClass = 'avatar-purple';
        badgeClass = 'badge-purple';
      } else if (r.includes('Admin') || r.includes('នាយកដ្ឋាន')) {
        avatarClass = 'avatar-red';
        badgeClass = 'badge-red';
      } else if (r.includes('អនុប្រធាន') || r.includes('Deputy')) {
        avatarClass = 'avatar-cyan';
        badgeClass = 'badge-cyan';
      } else if (r.includes('បុគ្គលិក') || r.includes('Operations')) {
        avatarClass = 'avatar-amber';
        badgeClass = 'badge-amber';
      } else if (r.includes('សេវា') || r.includes('Customer Service')) {
        avatarClass = 'avatar-emerald';
        badgeClass = 'badge-emerald';
      } else {
        avatarClass = 'avatar-blue';
        badgeClass = 'badge-blue';
      }

      const pwdDisplay = this.showAllPasswords ? u.password : '••••••••';
      const isProtectedAdmin = uLower === 'admin' || uLower === 'sysadmin' || uLower === 'rithjengdavid' || uLower === 'vid' || uLower === 'vif';

      let formattedDate = '-';
      let formattedTime = '';
      if (u.createdAt) {
        try {
          const d = new Date(u.createdAt);
          if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const mins = String(d.getMinutes()).padStart(2, '0');
            formattedDate = `${day}/${month}/${year}`;
            formattedTime = `${hours}:${mins}`;
          }
        } catch (e) {}
      }

      return `
        <tr data-user-id="${u.id}" class="users-table-row">
          <!-- 1. បុគ្គលិក (Employee / Name) -->
          <td class="col-user">
            <div class="user-cell-wrap">
              <div class="user-cell-avatar ${avatarClass}">
                <span>${initials}</span>
              </div>
              <div class="user-cell-info">
                <span class="user-cell-name">${this.escapeHtmlAttr(u.fullName || u.username)}</span>
                ${isProtectedAdmin ? '<span class="user-cell-badge-admin">🛡️ System Admin</span>' : ''}
              </div>
            </div>
          </td>

          <!-- 2. ឈ្មោះគណនី (Username) -->
          <td class="col-username">
            <div class="user-username-box">
              <code class="user-username-code">${this.escapeHtmlAttr(u.username)}</code>
              <button type="button" class="btn-icon-cell btn-copy-username" data-username="${this.escapeHtmlAttr(u.username)}" title="${this.currentLang === 'en' ? 'Copy Username' : 'ចម្លង Username'}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </td>

          <!-- 3. លេខសម្ងាត់ (Password) -->
          <td class="col-password">
            <div class="pwd-cell-box">
              <span class="pwd-text-val ${this.showAllPasswords ? 'pwd-revealed' : ''}" id="pwd-val-${u.id}" data-real-pwd="${this.escapeHtmlAttr(u.password)}">${this.escapeHtmlAttr(pwdDisplay)}</span>
              <button type="button" class="btn-icon-cell btn-toggle-row-pwd" data-target="pwd-val-${u.id}" title="${this.currentLang === 'en' ? 'Show / Hide' : 'បង្ហាញ / លាក់'}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
              <button type="button" class="btn-icon-cell btn-copy-pwd" data-pwd="${this.escapeHtmlAttr(u.password)}" title="${this.currentLang === 'en' ? 'Copy Password' : 'ចម្លង Password'}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </td>

          <!-- 4. តួនាទី (Role) -->
          <td class="col-role">
            <button type="button" class="demo-role-badge ${badgeClass} btn-quick-role-badge" data-user-id="${u.id}" title="${this.currentLang === 'en' ? 'Click to edit role' : 'ចុចដើម្បីប្តូរតួនាទី'}">
              <span class="role-dot"></span>
              <span>${this.escapeHtmlAttr(this.getDisplayRole(u.role, this.currentLang))}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="role-edit-icon" style="margin-left: 5px; opacity: 0.75;">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
          </td>

          <!-- 5. សាខា (Branch) -->
          <td class="col-branch">
            <div class="user-branch-pill" title="${this.escapeHtmlAttr(this.getDisplayBranch(u.branch, this.currentLang))}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="user-branch-icon">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${this.escapeHtmlAttr(this.getDisplayBranch(u.branch, this.currentLang) || '-')}</span>
            </div>
          </td>

          <!-- 6. លេខទូរស័ព្ទ (Phone) -->
          <td class="col-phone">
            <div class="user-phone-box">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="phone-ico">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span>${this.escapeHtmlAttr(u.phone || '-')}</span>
            </div>
          </td>

          <!-- 7. កាលបរិច្ឆេទបង្កើត (Created Date) -->
          <td class="col-created">
            <div class="user-created-box">
              <span class="user-created-date">${formattedDate}</span>
              ${formattedTime ? `<span class="user-created-time">${formattedTime}</span>` : ''}
            </div>
          </td>

          <!-- 8. សកម្មភាព (Actions) -->
          <td class="col-actions" style="text-align: right;">
            <div class="user-actions-row">
              <button type="button" class="btn-cell-edit-role" data-user-id="${u.id}" title="${this.currentLang === 'en' ? 'Edit User Role' : 'ប្តូរតួនាទី'}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="19" y1="8" x2="19" y2="14"></line>
                  <line x1="22" y1="11" x2="16" y2="11"></line>
                </svg>
                <span>${this.currentLang === 'en' ? 'Role' : 'តួនាទី'}</span>
              </button>
              ${isProtectedAdmin ? `
                <span class="badge-default-admin" title="Default System Administrator (Protected)">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>ការពារ (Protected)</span>
                </span>
              ` : `
                <button type="button" class="btn-cell-delete" data-user-id="${u.id}" data-username="${this.escapeHtmlAttr(u.username)}" title="${this.currentLang === 'en' ? 'Delete Account' : 'លុបគណនី'}">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  <span>${this.currentLang === 'en' ? 'Delete' : 'លុប'}</span>
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Bind row action events with instant feedback and safe clipboard
    tbody.querySelectorAll('.btn-copy-username').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const username = e.currentTarget.dataset.username;
        this.copyToClipboard(username, this.currentLang === 'en' ? `Copied Username: ${username}` : `បានចម្លង Username: ${username}`, e.currentTarget);
      });
    });

    tbody.querySelectorAll('.btn-copy-pwd').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pwd = e.currentTarget.dataset.pwd;
        this.copyToClipboard(pwd, this.currentLang === 'en' ? 'Password copied to clipboard!' : 'បានចម្លង Password រួចរាល់!', e.currentTarget);
      });
    });

    tbody.querySelectorAll('.btn-toggle-row-pwd').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target;
        const span = document.getElementById(targetId);
        if (span) {
          const isMasked = span.textContent.includes('•');
          span.textContent = isMasked ? span.dataset.realPwd : '••••••••';
          span.classList.toggle('pwd-revealed', isMasked);
        }
      });
    });

    tbody.querySelectorAll('.btn-cell-edit-role, .btn-quick-role-badge').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = e.currentTarget.dataset.userId;
        if (userId) this.openEditRoleModal(userId);
      });
    });

    tbody.querySelectorAll('.btn-cell-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.userId;
        const name = e.currentTarget.dataset.username;
        
        // Prevent deleting currently logged in user
        if (this.currentUser && (this.currentUser.id === id || (this.currentUser.username || '').toLowerCase() === (name || '').toLowerCase())) {
          this.showToast(this.currentLang === 'en' ? 'Cannot delete currently active logged-in account!' : 'មិនអាចលុបគណនីដែលអ្នកកំពុង Login ប្រើប្រាស់បានទេ!', 'error');
          return;
        }

        const confirmMsg = this.currentLang === 'en' ? `Are you sure you want to delete account "${name}"?` : `តើអ្នកប្រាកដជាចង់លុបគណនី "${name}" មែនទេ?`;
        if (confirm(confirmMsg)) {
          Storage.deleteUser(id);
          this.renderUsersTable(document.getElementById('search-users-input')?.value || '');
          this.showToast(this.currentLang === 'en' ? `Account "${name}" deleted successfully` : `បានលុបគណនី ${name} ជោគជ័យ`, 'primary');
        }
      });
    });
  }

  showUserCreatedModal(user) {
    const modal = document.getElementById('user-created-modal');
    const grid = document.getElementById('user-created-grid');
    if (!modal || !grid || !user) return;

    let formattedDate = new Date().toLocaleString('km-KH');
    try {
      const d = new Date(user.createdAt || Date.now());
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      formattedDate = `${day}/${month}/${year} ${hours}:${mins}`;
    } catch (e) {}

    grid.innerHTML = `
      <div class="user-detail-row">
        <span class="user-detail-label">👤 ឈ្មោះពេញ (Full Name):</span>
        <strong class="user-detail-val">${this.escapeHtmlAttr(user.fullName || user.username)}</strong>
      </div>
      <div class="user-detail-row">
        <span class="user-detail-label">🔑 ឈ្មោះគណនី (Username):</span>
        <code class="user-detail-code">${this.escapeHtmlAttr(user.username)}</code>
      </div>
      <div class="user-detail-row">
        <span class="user-detail-label">🔒 លេខសម្ងាត់ (Password):</span>
        <strong class="user-detail-val font-mono">${this.escapeHtmlAttr(user.password)}</strong>
      </div>
      <div class="user-detail-row">
        <span class="user-detail-label">💼 តួនាទី (Role):</span>
        <span class="user-detail-val">${this.escapeHtmlAttr(this.getDisplayRole(user.role, this.currentLang))}</span>
      </div>
      <div class="user-detail-row">
        <span class="user-detail-label">🏢 សាខា (Branch):</span>
        <strong class="user-detail-val">${this.escapeHtmlAttr(this.getDisplayBranch(user.branch, this.currentLang))}</strong>
      </div>
      <div class="user-detail-row">
        <span class="user-detail-label">📞 លេខទូរស័ព្ទ (Phone):</span>
        <span class="user-detail-val">${this.escapeHtmlAttr(user.phone || '-')}</span>
      </div>
      <div class="user-detail-row">
        <span class="user-detail-label">🕒 កាលបរិច្ឆេទបង្កើត (Created):</span>
        <span class="user-detail-val text-muted">${formattedDate}</span>
      </div>
      <div class="user-detail-row user-detail-status">
        <span class="user-detail-label">💾 MySQL Database:</span>
        <span class="badge-db-synced">🟢 បានរក្សាទុកក្នុង MySQL រួចរាល់</span>
      </div>
    `;

    const copyBtn = document.getElementById('btn-copy-new-user-info');
    if (copyBtn) {
      copyBtn.onclick = () => {
        const text = `BS Express Account:
ឈ្មោះ: ${user.fullName || user.username}
Username: ${user.username}
Password: ${user.password}
តួនាទី: ${user.role}
សាខា: ${user.branch}
លេខទូរស័ព្ទ: ${user.phone || '-'}
កាលបរិច្ឆេទបង្កើត: ${formattedDate}`;
        this.copyToClipboard(text, 'បានចម្លងព័ត៌មានគណនីជោគជ័យ!', copyBtn);
      };
    }

    const viewBtn = document.getElementById('btn-view-in-users-modal');
    if (viewBtn) {
      viewBtn.onclick = () => {
        modal.classList.remove('active');
        this.openUsersModal();
      };
    }

    const closeBtn = document.getElementById('btn-close-created-modal');
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.classList.remove('active');
      };
    }

    modal.classList.add('active');
  }

  // =========================================================================
  // ADMIN ONLY: EDIT USER ROLE
  // =========================================================================
  openEditRoleModal(userId) {
    if (!this.isCurrentUserAdminOrTopMgmt()) {
      this.showToast(this.currentLang === 'en' ? 'Access restricted: Only Admin can edit user roles!' : 'សិទ្ធិត្រូវបានកំណត់៖ មានតែ Admin ទើបអាចកែប្រែតួនាទីបាន!', 'warning');
      return;
    }
    const modal = document.getElementById('edit-user-role-modal');
    if (!modal) return;

    const users = Storage.getUsers();
    const target = String(userId).trim().toLowerCase();
    const user = users.find(u => (u.id && String(u.id).toLowerCase() === target) || (u.username && u.username.toLowerCase() === target));
    if (!user) {
      this.showToast('រកមិនឃើញគណនីនេះទេ!', 'error');
      return;
    }

    const idInput = document.getElementById('edit-role-user-id');
    if (idInput) idInput.value = user.id || user.username;

    const fullnameEl = document.getElementById('edit-role-user-fullname');
    if (fullnameEl) fullnameEl.textContent = user.fullName || user.username;

    const unameEl = document.getElementById('edit-role-user-uname');
    if (unameEl) unameEl.textContent = `@${user.username}`;

    const branchEl = document.getElementById('edit-role-user-branch');
    if (branchEl) branchEl.textContent = this.getDisplayBranch(user.branch, this.currentLang) || user.branch || '-';

    const avatarEl = document.getElementById('edit-role-avatar');
    if (avatarEl) {
      const initials = (user.fullName || user.username || 'U')
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'U';
      avatarEl.textContent = initials;
    }

    const selectEl = document.getElementById('edit-role-select');
    if (selectEl) {
      selectEl.value = user.role || 'បុគ្គលិកប្រតិបត្តិការ';
    }

    modal.classList.add('active');
  }

  closeEditRoleModal() {
    const modal = document.getElementById('edit-user-role-modal');
    if (modal) modal.classList.remove('active');
  }

  async submitEditRole() {
    if (!this.isCurrentUserAdminOrTopMgmt()) {
      this.showToast(this.currentLang === 'en' ? 'Access restricted: Only Admin can edit user roles!' : 'សិទ្ធិត្រូវបានកំណត់៖ មានតែ Admin ទើបអាចកែប្រែតួនាទីបាន!', 'warning');
      return;
    }

    const userId = document.getElementById('edit-role-user-id')?.value;
    const newRole = document.getElementById('edit-role-select')?.value;
    if (!userId || !newRole) return;

    const saveBtn = document.getElementById('btn-save-edit-role');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.6';
    }

    try {
      const res = await Storage.updateUserRole(userId, newRole);
      if (!res.success) {
        this.showToast(res.error, 'error');
        return;
      }

      const roleDisplay = this.getDisplayRole(newRole, this.currentLang);
      const targetName = res.user?.fullName || res.user?.username || 'User';
      const successMsg = this.currentLang === 'en'
        ? `Successfully updated ${targetName}'s role to "${roleDisplay}"!`
        : `បានផ្លាស់ប្តូរតួនាទីរបស់ ${targetName} ទៅជា "${roleDisplay}" ជោគជ័យ!`;

      this.showToast(successMsg, 'success');
      this.closeEditRoleModal();
      this.renderUsersTable(document.getElementById('search-users-input')?.value || '');

      // If updated self, update current session and navbar
      if (this.currentUser && (this.currentUser.id === userId || (this.currentUser.username || '').toLowerCase() === (res.user?.username || '').toLowerCase())) {
        this.currentUser.role = newRole;
        this.renderAuthNav();
      }
    } catch (e) {
      this.showToast('មានបញ្ហាក្នុងការរក្សាទុកតួនាទី!', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
      }
    }
  }

  fillFormFromCurrentUser() {
    const nameInput = document.getElementById('form-name');
    const posInput = document.getElementById('form-position');
    const branchSelect = document.getElementById('form-branch');
    const dateInput = document.getElementById('form-date');
    const opRep = document.getElementById('form-opening-reporter');
    const clRep = document.getElementById('form-closing-reporter');

    // Auto-update date to today's date if empty or creating new report
    if (dateInput && (!dateInput.value || dateInput.value === '2026-08-14')) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }

    if (this.currentUser) {
      const fullName = this.currentUser.fullName || this.currentUser.username || 'User';
      const initials = (this.currentUser.fullName || this.currentUser.username || 'U')
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'U';
      const displayRole = this.getDisplayRole(this.currentUser.role, this.currentLang) || (this.currentLang === 'en' ? 'Branch Manager' : 'ប្រធានសាខា');
      const userBranch = this.currentUser.branch || '';
      const displayBranch = this.getDisplayBranch(userBranch, this.currentLang) || (this.currentLang === 'en' ? 'All Branches' : 'គ្រប់សាខា');

      // 1. Update Step 1 Auto-Tracking Banner
      const trackerBanner = document.getElementById('step1-user-tracker');
      const trackerAvatar = document.getElementById('tracker-avatar');
      const trackerName = document.getElementById('tracker-user-name');
      const trackerRole = document.getElementById('tracker-user-role');
      const trackerBranch = document.getElementById('tracker-user-branch');

      if (trackerBanner) trackerBanner.classList.remove('d-none');
      if (trackerAvatar) trackerAvatar.textContent = initials;
      if (trackerName) trackerName.textContent = fullName;
      if (trackerRole) trackerRole.textContent = displayRole;
      if (trackerBranch) trackerBranch.textContent = displayBranch;

      // 2. Auto-populate & Lock Reporter Name & Position
      const roleQuickTags = posInput?.parentElement?.querySelector('.quick-tags-wrap');

      if (nameInput) {
        nameInput.value = fullName;
        nameInput.readOnly = true;
        nameInput.classList.add('is-locked');
      }
      if (posInput) {
        posInput.value = displayRole;
        posInput.readOnly = true;
        posInput.classList.add('is-locked');
      }
      if (roleQuickTags) {
        roleQuickTags.classList.add('d-none');
      }

      if (opRep && !opRep.value) {
        opRep.value = fullName;
      }
      if (clRep && !clRep.value) {
        clRep.value = fullName;
      }

      // 3. Auto-populate & lock Branch if restricted user
      if (userBranch && userBranch !== 'ការិយាល័យកណ្ដាល' && userBranch !== 'Head Office' && userBranch !== 'All') {
        if (branchSelect) {
          this.setSelectBranch(branchSelect, userBranch);
          if (!this.isCurrentUserAdminOrTopMgmt()) {
            branchSelect.disabled = true;
            branchSelect.classList.add('is-locked');
          } else {
            branchSelect.disabled = false;
            branchSelect.classList.remove('is-locked');
          }
          const sidebarBranchSelect = document.getElementById('sidebar-branch-select');
          if (sidebarBranchSelect) {
            this.setSelectBranch(sidebarBranchSelect, branchSelect.value);
          }
        }
      } else if (branchSelect) {
        branchSelect.disabled = false;
        branchSelect.classList.remove('is-locked');
      }
      if (branchSelect) {
        branchSelect.classList.remove('d-none');
      }
    } else {
      // Not logged in or guest mode
      const trackerBanner = document.getElementById('step1-user-tracker');
      if (trackerBanner) trackerBanner.classList.add('d-none');

      const roleQuickTags = posInput?.parentElement?.querySelector('.quick-tags-wrap');

      if (nameInput) {
        nameInput.readOnly = false;
        nameInput.classList.remove('is-locked');
        if (!nameInput.value) nameInput.value = '';
      }
      if (posInput) {
        posInput.readOnly = false;
        posInput.classList.remove('is-locked');
        if (!posInput.value) {
          posInput.value = this.currentLang === 'en' ? 'Branch Manager' : 'ប្រធានសាខា';
        }
      }
      if (roleQuickTags) {
        roleQuickTags.classList.remove('d-none');
      }
      if (branchSelect) {
        branchSelect.disabled = false;
        branchSelect.classList.remove('is-locked');
        if (!branchSelect.value) {
          this.setSelectBranch(branchSelect, this.currentLang === 'en' ? 'Kratie' : 'ក្រចេះ');
        }
        branchSelect.classList.remove('d-none');
      }
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

  async submitScreenLogin() {
    const username = document.getElementById('screen-login-username')?.value || '';
    const password = document.getElementById('screen-login-password')?.value || '';
    const remember = Boolean(document.getElementById('screen-login-remember')?.checked);
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
    await this.handleLogin(username, password, remember);
  }

  async submitScreenRegister() {
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

    await this.handleRegister({ fullName, username, role, branch, phone, password, confirmPassword }, true);
  }

  async submitModalLogin() {
    const username = document.getElementById('login-username')?.value || '';
    const password = document.getElementById('login-password')?.value || '';
    await this.handleLogin(username, password, true);
  }

  async submitModalRegister() {
    const fullName = document.getElementById('reg-fullname')?.value || '';
    const username = document.getElementById('reg-username')?.value || '';
    const role = document.getElementById('reg-role')?.value || '';
    const branch = document.getElementById('reg-branch')?.value || '';
    const phone = document.getElementById('reg-phone')?.value || '';
    const password = document.getElementById('reg-password')?.value || '';
    const confirmPassword = document.getElementById('reg-confirm-password')?.value || '';
    await this.handleRegister({ fullName, username, role, branch, phone, password, confirmPassword }, true);
  }

  async handleLogin(username, password, remember = true) {
    const result = await Storage.authenticateUserAsync(username, password);
    if (!result.success) {
      this.showToast(result.error, 'error');
      return false;
    }

    this.currentUser = result.user;
    Storage.setCurrentUser(this.currentUser, remember);
    this.populateBranchDropdowns();
    this.fillFormFromCurrentUser();

    const userBranch = this.getCanonicalBranch(this.currentUser.branch);
    const branchDraft = Storage.getDraft(userBranch);
    if (branchDraft && Object.keys(branchDraft).length > 0 && this.canAccessReport(branchDraft)) {
      this.populateForm(branchDraft);
      this.updateLivePreview();
    } else {
      this.resetForm(true);
    }

    this.updateScreenVisibility();
    this.renderAuthNav();
    this.updateDbIndicator(Storage.isDbOnline);
    this.closeAuthModal();
    const displayRole = this.getDisplayRole(this.currentUser.role, this.currentLang);
    this.showToast(`${this.t('toastLoginSuccess')} ${this.currentUser.fullName} - ${displayRole}!`, 'success');
    return true;
  }

  async quickLogin(username = 'admin', password = '123') {
    const userField = document.getElementById('screen-login-username') || document.getElementById('login-username');
    const passField = document.getElementById('screen-login-password') || document.getElementById('login-password');
    if (userField) userField.value = username;
    if (passField) passField.value = password;
    return await this.handleLogin(username, password, true);
  }

  async handleRegister(formData, remember = true) {
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

    const result = await Storage.registerUser({ username, password, fullName, role, branch, phone });
    if (!result.success) {
      this.showToast(result.error, 'error');
      return false;
    }

    this.currentUser = result.user;
    Storage.setCurrentUser(this.currentUser, remember);
    this.populateBranchDropdowns();
    this.fillFormFromCurrentUser();
    this.resetForm(true);
    this.updateScreenVisibility();
    this.renderAuthNav();
    this.updateDbIndicator(Storage.isDbOnline);
    this.closeAuthModal();
    this.showToast(`${this.t('toastRegisterSuccess')} ${this.currentUser.fullName}!`, 'success');
    this.showUserCreatedModal(result.user);
    return true;
  }

  handleLogout() {
    Storage.logout();
    this.currentUser = null;
    this.populateBranchDropdowns();
    this.fillFormFromCurrentUser();
    this.resetForm(true);
    this.updateScreenVisibility();
    this.renderAuthNav();
    this.updateDbIndicator(Storage.isDbOnline);
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
    document.getElementById('btn-close-users-modal-footer')?.addEventListener('click', () => {
      this.closeUsersModal();
    });
    document.getElementById('users-management-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'users-management-modal') {
        this.closeUsersModal();
      }
    });

    // Edit User Role Modal events
    document.getElementById('btn-close-edit-role-modal')?.addEventListener('click', () => {
      this.closeEditRoleModal();
    });
    document.getElementById('btn-cancel-edit-role')?.addEventListener('click', () => {
      this.closeEditRoleModal();
    });
    document.getElementById('btn-save-edit-role')?.addEventListener('click', () => {
      this.submitEditRole();
    });
    document.getElementById('edit-user-role-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'edit-user-role-modal') {
        this.closeEditRoleModal();
      }
    });

    // Role filter chips in Inspector
    document.querySelectorAll('#users-role-filters .user-filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        document.querySelectorAll('#users-role-filters .user-filter-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        this.usersFilterRole = btn.dataset.filterRole || 'all';
        this.renderUsersTable(document.getElementById('search-users-input')?.value || '');
      });
    });

    // Toggle All Passwords in Inspector
    document.getElementById('btn-toggle-all-passwords')?.addEventListener('click', () => {
      this.toggleAllPasswords();
    });

    // Search Users in Inspector
    const searchUsersInput = document.getElementById('search-users-input');
    const clearSearchUsersBtn = document.getElementById('btn-clear-search-users');

    searchUsersInput?.addEventListener('input', (e) => {
      const val = e.target.value;
      if (clearSearchUsersBtn) {
        clearSearchUsersBtn.style.display = val.length > 0 ? 'flex' : 'none';
      }
      this.renderUsersTable(val);
    });

    clearSearchUsersBtn?.addEventListener('click', () => {
      if (searchUsersInput) {
        searchUsersInput.value = '';
        searchUsersInput.focus();
      }
      clearSearchUsersBtn.style.display = 'none';
      this.renderUsersTable('');
    });

    // Toggle Inline Add User Form
    const addPanel = document.getElementById('admin-quick-add-panel');
    document.getElementById('btn-show-add-user-form')?.addEventListener('click', () => {
      if (addPanel) {
        const isHidden = addPanel.style.display === 'none' || !addPanel.style.display;
        addPanel.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
          this.populateBranchDropdowns();
          document.getElementById('admin-add-fullname')?.focus();
        }
      }
    });

    document.getElementById('btn-close-quick-add-x')?.addEventListener('click', () => {
      if (addPanel) addPanel.style.display = 'none';
    });

    document.getElementById('btn-cancel-add-user')?.addEventListener('click', () => {
      if (addPanel) addPanel.style.display = 'none';
    });

    // Submit Admin Add User Form
    document.getElementById('form-admin-add-user')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('admin-add-fullname')?.value || '';
      const username = document.getElementById('admin-add-username')?.value || '';
      const password = document.getElementById('admin-add-password')?.value || '';
      const role = document.getElementById('admin-add-role')?.value || '';
      const branch = document.getElementById('admin-add-branch')?.value || '';
      const phone = document.getElementById('admin-add-phone')?.value || '';

      const res = await Storage.registerUser({ username, password, fullName, role, branch, phone });
      if (!res.success) {
        this.showToast(res.error, 'error');
        return;
      }

      this.showToast(`បានបង្កើតគណនីថ្មី ${fullName} (${username}) ជោគជ័យ!`, 'success');
      document.getElementById('form-admin-add-user')?.reset();
      if (addPanel) addPanel.style.display = 'none';
      this.usersFilterRole = 'all';
      document.querySelectorAll('#users-role-filters .user-filter-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.filterRole === 'all');
      });
      this.renderUsersTable();
      this.showUserCreatedModal(res.user);
    });

    // Auth Switcher Tabs (Modal & First Screen)
    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.dataset.authTab;
        this.switchAuthTab(targetTab);
      });
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

    // Enter Key Submission on Login Fields
    ['screen-login-username', 'screen-login-password'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.submitScreenLogin();
        }
      });
    });

    // Enter Key Submission on Register Fields
    ['screen-reg-fullname', 'screen-reg-username', 'screen-reg-phone', 'screen-reg-password', 'screen-reg-confirm-password'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.submitScreenRegister();
        }
      });
    });

    // Explicit Click Handlers for First Screen Buttons
    document.getElementById('btn-screen-submit-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.submitScreenLogin();
    });

    document.getElementById('btn-screen-submit-register')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.submitScreenRegister();
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

        this.handleLogin(user, pwd, true);
      });
    });

    // Form Login Submit (Modal)
    document.getElementById('form-login')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitModalLogin();
    });

    // Form Login Submit (First Screen)
    document.getElementById('screen-form-login')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitScreenLogin();
    });

    // Form Register Submit (Modal)
    document.getElementById('form-register')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitModalRegister();
    });

    // Form Register Submit (First Screen)
    document.getElementById('screen-form-register')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitScreenRegister();
    });
  }


  // =========================================================================
  // MORNING SHIFT WRITER FORM METHODS
  // =========================================================================
  initMorningForm() {
    const branchSelect = document.getElementById('morning-branch');
    const dateInput = document.getElementById('morning-date');
    const nameInput = document.getElementById('morning-reporter-name');
    const posInput = document.getElementById('morning-position');

    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }

    if (this.currentUser) {
      if (nameInput && !nameInput.value) nameInput.value = this.currentUser.fullName || '';
      if (posInput && !posInput.value) posInput.value = this.currentUser.role || '';
      if (branchSelect && this.currentUser.branch && this.currentUser.branch !== 'All' && this.currentUser.branch !== 'Headquarters (HQ)') {
        branchSelect.value = this.currentUser.branch;
      }
    }
    this.updateMorningLivePreview();
  }

  loadMorningSampleData() {
    const branchSelect = document.getElementById('morning-branch');
    const dateInput = document.getElementById('morning-date');
    const nameInput = document.getElementById('morning-reporter-name');
    const posInput = document.getElementById('morning-position');
    const timeInput = document.getElementById('morning-opening-time');
    const presentInput = document.getElementById('morning-present-count');
    const absentInput = document.getElementById('morning-absent-count');
    const cleanInput = document.getElementById('morning-cleanliness');
    const challengesInput = document.getElementById('morning-challenges');

    if (branchSelect) branchSelect.value = this.currentLang === 'en' ? 'Kratie' : 'ក្រចេះ';
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    if (nameInput) nameInput.value = 'ប៊ុនតា ភឿន';
    if (posInput) posInput.value = this.currentLang === 'en' ? 'Branch Manager' : 'ប្រធានសាខា';
    if (timeInput) timeInput.value = '6:00Am';
    if (presentInput) presentInput.value = '14';
    if (absentInput) absentInput.value = 'Day Off 1នាក់';
    if (cleanInput) cleanInput.value = 'ស្ថានភាពអនាម័យ និងភាពរៀបរយក្នុង-ក្រៅសាខា';
    if (challengesInput) challengesInput.value = 'ម៉ោង 6:00 ព្រឹក បើកដំណើរការទាន់ពេល បុគ្គលិកមកទាន់ម៉ោង មិនមានបញ្ហាអ្វីទេ។';
    this.updateMorningLivePreview();

    this.showToast(this.currentLang === 'en' ? 'Morning sample data loaded!' : 'បានផ្ទុកទិន្នន័យគំរូពេលព្រឹករួចរាល់!', 'success');
  }

  saveMorningReportForm() {
    const branch = document.getElementById('morning-branch')?.value;
    const date = document.getElementById('morning-date')?.value || new Date().toISOString().split('T')[0];
    const reporterName = document.getElementById('morning-reporter-name')?.value || '';
    const position = document.getElementById('morning-position')?.value || '';
    const openingTime = document.getElementById('morning-opening-time')?.value || '6:00Am';
    const presentCount = document.getElementById('morning-present-count')?.value || '0';
    const absentCount = document.getElementById('morning-absent-count')?.value || '0';
    const cleanlinessStatus = document.getElementById('morning-cleanliness')?.value || '';
    const morningChallenges = document.getElementById('morning-challenges')?.value || '';

    if (!branch) {
      this.showToast(this.currentLang === 'en' ? 'Please select a branch!' : 'សូមជ្រើសរើសសាខា!', 'warning');
      return;
    }
    if (!reporterName) {
      this.showToast(this.currentLang === 'en' ? 'Please enter reporter name!' : 'សូមបញ្ចូលឈ្មោះអ្នករាយការណ៍!', 'warning');
      return;
    }

    const rowData = {
      reporterName,
      position,
      openingTime,
      presentCount: parseInt(presentCount, 10) || 0,
      absentCount,
      cleanlinessStatus,
      morningChallenges,
      photos: this.morningPhotos || []
    };

    const saved = Storage.saveMorningBranchRow(date, branch, rowData);
    this.updateStats();
    this.updateIssuesStatsAndBadge();
    this.renderReportsTable();
    this.showToast(
      this.currentLang === 'en' 
        ? `Morning report for ${branch} saved successfully!` 
        : `បានរក្សាទុករបាយការណ៍ពេលព្រឹកសាខា ${branch} ជោគជ័យ!`,
      'success'
    );
    return saved;
  }

  updateMorningLivePreview() {
    const branch = document.getElementById('morning-branch')?.value || (this.currentLang === 'en' ? 'Select Branch' : 'ជ្រើសរើសសាខា');
    const rawDate = document.getElementById('morning-date')?.value || new Date().toISOString().split('T')[0];
    const dateParts = rawDate.split('-');
    const dateDisplay = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0].slice(2)}` : rawDate;
    const name = document.getElementById('morning-reporter-name')?.value || '--';
    const position = document.getElementById('morning-position')?.value || '--';
    const openingTime = document.getElementById('morning-opening-time')?.value || '--';
    const presentCount = document.getElementById('morning-present-count')?.value || '--';
    const absentCount = document.getElementById('morning-absent-count')?.value || '--';
    const cleanliness = document.getElementById('morning-cleanliness')?.value || '--';
    const challenges = document.getElementById('morning-challenges')?.value || '';

    document.querySelectorAll('.doc-morning-val-branch').forEach(el => el.textContent = branch);
    document.querySelectorAll('.doc-morning-val-date').forEach(el => el.textContent = dateDisplay);
    document.querySelectorAll('.doc-morning-val-name').forEach(el => el.textContent = name);
    document.querySelectorAll('.doc-morning-val-position').forEach(el => el.textContent = position);
    document.querySelectorAll('.doc-morning-val-opening-time').forEach(el => el.textContent = openingTime);
    document.querySelectorAll('.doc-morning-val-present').forEach(el => el.textContent = presentCount);
    document.querySelectorAll('.doc-morning-val-absent').forEach(el => el.textContent = absentCount);
    document.querySelectorAll('.doc-morning-val-cleanliness').forEach(el => el.textContent = cleanliness);

    const challengesEl = document.querySelector('.doc-morning-val-challenges');
    if (challengesEl) {
      challengesEl.textContent = challenges.trim() 
        ? challenges.trim() 
        : (this.currentLang === 'en' ? 'No morning challenges' : 'គ្មានបញ្ហាប្រឈមពេលព្រឹកទេ');
    }

    // Render morning photos in A4 gallery
    const morningGallery = document.getElementById('doc-morning-photo-gallery');
    if (morningGallery) {
      morningGallery.innerHTML = '';
      if (this.morningPhotos && this.morningPhotos.length > 0) {
        this.morningPhotos.forEach((src, idx) => {
          const img = document.createElement('img');
          img.src = src;
          img.alt = `Morning Photo ${idx + 1}`;
          img.className = 'doc-gallery-img';
          img.addEventListener('click', () => this.openPhotoViewer(src));
          morningGallery.appendChild(img);
        });
      }
    }
  }

  printMorningDoc() {
    this.updateMorningLivePreview();
    document.body.classList.add('printing-morning');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-morning');
    }, 1000);
  }

  shareMorningFormTelegram() {
    const branch = document.getElementById('morning-branch')?.value || 'ក្រចេះ';
    const date = document.getElementById('morning-date')?.value || new Date().toISOString().split('T')[0];
    const reporterName = document.getElementById('morning-reporter-name')?.value || 'ប៊ុនតា ភឿន';
    const position = document.getElementById('morning-position')?.value || 'ប្រធានសាខា';
    const openingTime = document.getElementById('morning-opening-time')?.value || '6:00Am';
    const presentCount = document.getElementById('morning-present-count')?.value || '14';
    const absentCount = document.getElementById('morning-absent-count')?.value || 'Day Off 1នាក់';
    const cleanlinessStatus = document.getElementById('morning-cleanliness')?.value || 'ស្ថានភាពអនាម័យ និងភាពរៀបរយក្នុង-ក្រៅសាខា';
    const morningChallenges = document.getElementById('morning-challenges')?.value || '';

    const data = {
      branch,
      date,
      dateDisplay: date,
      reporterName,
      position,
      openingTime,
      presentCount,
      absentCount,
      cleanlinessStatus,
      morningChallenges
    };

    const text = ExportUtil.formatSingleMorningReportForTelegram(data, this.currentLang);
    const contentEl = document.getElementById('telegram-content');
    if (contentEl) contentEl.textContent = text;
    const modal = document.getElementById('telegram-modal');
    if (modal) modal.classList.add('active');
  }

  renderMorningMatrix() {
    // Safe stub if morning matrix table is ever embedded
    return;
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
      if (toast && toast.style) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
      }
      setTimeout(() => {
        if (toast && typeof toast.remove === 'function') toast.remove();
      }, 300);
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
