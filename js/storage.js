/**
 * BS Express Daily Report System - Storage Module
 * Manages LocalStorage, Sample Data seeding, and CRUD operations
 */

const STORAGE_KEY = 'bs_express_daily_reports';
const SETTINGS_KEY = 'bs_express_settings';
const DELETED_REPORTS_KEY = 'bs_express_deleted_report_ids';
const DELETED_ISSUES_KEY = 'bs_express_deleted_issue_ids';
const SEEDED_KEY = 'bs_express_reports_seeded_v3';

// Lightweight SVG sample photos with official watermark styling
const SAMPLE_IMG_OPEN_1 = "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1e3a8a"/><stop offset="100%" stop-color="#0284c7"/></linearGradient></defs><rect width="640" height="420" fill="url(#g1)"/><rect x="20" y="20" width="600" height="380" rx="12" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="3"/><circle cx="320" cy="180" r="50" fill="rgba(255,255,255,0.15)"/><path d="M320 145v70M285 180h70" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/><text x="320" y="270" fill="#ffffff" font-size="22" font-family="sans-serif" font-weight="bold" text-anchor="middle">BS EXPRESS - OPENING SHIFT</text><text x="320" y="300" fill="rgba(255,255,255,0.8)" font-size="14" font-family="sans-serif" text-anchor="middle">Branch Inspection • 6:00 AM</text><rect x="30" y="345" width="220" height="45" rx="6" fill="rgba(0,0,0,0.6)"/><text x="40" y="365" fill="#facc15" font-size="11" font-family="monospace">📍 KRATIE BRANCH</text><text x="40" y="380" fill="#ffffff" font-size="10" font-family="monospace">🕒 2026-08-14 06:00:15</text></svg>');

const SAMPLE_IMG_OPEN_2 = "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f766e"/><stop offset="100%" stop-color="#0d9488"/></linearGradient></defs><rect width="640" height="420" fill="url(#g2)"/><rect x="20" y="20" width="600" height="380" rx="12" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="3"/><path d="M220 230l60-60 50 40 80-80 50 50" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/><text x="320" y="275" fill="#ffffff" font-size="22" font-family="sans-serif" font-weight="bold" text-anchor="middle">OFFICE CLEANLINESS CHECK</text><text x="320" y="305" fill="rgba(255,255,255,0.8)" font-size="14" font-family="sans-serif" text-anchor="middle">Staff Reception Counter &amp; Floor</text><rect x="30" y="345" width="220" height="45" rx="6" fill="rgba(0,0,0,0.6)"/><text x="40" y="365" fill="#facc15" font-size="11" font-family="monospace">📍 KRATIE BRANCH</text><text x="40" y="380" fill="#ffffff" font-size="10" font-family="monospace">🕒 2026-08-14 06:15:30</text></svg>');

const SAMPLE_IMG_CLOSE_1 = "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#312e81"/><stop offset="100%" stop-color="#4338ca"/></linearGradient></defs><rect width="640" height="420" fill="url(#g3)"/><rect x="20" y="20" width="600" height="380" rx="12" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="3"/><rect x="280" y="140" width="80" height="90" rx="8" fill="none" stroke="#ffffff" stroke-width="4"/><circle cx="320" cy="175" r="10" fill="#ffffff"/><path d="M300 140v-20a20 20 0 0 1 40 0v20" fill="none" stroke="#ffffff" stroke-width="4"/><text x="320" y="275" fill="#ffffff" font-size="22" font-family="sans-serif" font-weight="bold" text-anchor="middle">WAREHOUSE SECURITY &amp; LOCK</text><text x="320" y="305" fill="rgba(255,255,255,0.8)" font-size="14" font-family="sans-serif" text-anchor="middle">Packages Stored in Secure Zone • 11:00 PM</text><rect x="30" y="345" width="220" height="45" rx="6" fill="rgba(0,0,0,0.6)"/><text x="40" y="365" fill="#facc15" font-size="11" font-family="monospace">📍 KRATIE BRANCH</text><text x="40" y="380" fill="#ffffff" font-size="10" font-family="monospace">🕒 2026-08-14 23:00:40</text></svg>');

// Sample report matching the user's uploaded image exactly
const SAMPLE_REPORT = {
  id: 'report_sample_kratie',
  branch: 'ក្រចេះ',
  date: '2026-08-14',
  dateDisplay: '14/08/26',
  reporterName: 'ប៊ុនតា ភឿន',
  position: 'ប្រធានសាខា',
  
  // Section 1: Opening Shift
  openingTime: '6:00Am',
  presentCount: 14,
  absentCount: 1,
  cleanlinessStatus: 'ស្ថានភាពអនាម័យ និងភាពរៀបរយក្នុង-ក្រៅសាខា',
  openingPhotos: [SAMPLE_IMG_OPEN_1, SAMPLE_IMG_OPEN_2],

  // Section 2: Daily Operation
  workStatus: 'បញ្ញើរអីវ៉ាន់ សម្រាប់ភ្ញៀវVIPនិងកំពុងស្វែងរកភ្ញៀវបន្ថែម',
  operationChallenges: 'អីវ៉ាន់ដឹកអត់ដល់ កង់បីអស់ថ្ម អីវ៉ាន់ខ្លះសល់ទុកដឹកស្អែកសម្រួលជាមួយភ្ញៀវដឹកជូនថ្ងៃស្អែក',

  // Section 3: Closing Shift
  accomplishedTasks: 'ដោះស្រាយអីវ៉ាន់ដែលដឹកអត់ដល់និងសម្រួលដឹកអីវ៉ាន់ដែលជាប់ខូច',
  unresolvedIssues: 'អីវ៉ាន់ដឹកអត់ដល់ទុកដឹកស្អែក',
  packageSecurity: 'អីវ៉ាន់ដែលនៅសល់ទុកដាក់នៅកន្លែងមានផាសុខភាពនិងមិនសើម',
  closingTime: '11:00Pm',
  closingPhotos: [SAMPLE_IMG_CLOSE_1],

  createdAt: new Date().toISOString(),
  status: 'completed'
};

// Additional sample reports to demonstrate multi-branch reports
const INITIAL_REPORTS = [
  SAMPLE_REPORT,
  {
    id: 'report_sample_phnom_penh',
    branch: 'ភ្នំពេញ (ដូនពេញ)',
    date: '2026-08-14',
    dateDisplay: '14/08/26',
    reporterName: 'សុខ វិបុល',
    position: 'ប្រធានសាខា',
    openingTime: '6:30Am',
    presentCount: 22,
    absentCount: 'ច្បាប់ឈឺ 1នាក់',
    cleanlinessStatus: 'សាខាបានបោសសម្អាត រៀបចំតុទទួលភ្ញៀវ និងទីធ្លាខាងមុខរួចរាល់',
    openingPhotos: [],
    workStatus: 'ទទួលបញ្ញើចេញខេត្តបាន 420 កញ្ចប់ និងចែកចាយក្នុងក្រុង 310 កញ្ចប់',
    operationChallenges: 'ភ្លៀងខ្លាំងនៅពេលរសៀល ធ្វើឱ្យការដឹកជញ្ជូនយឺតយ៉ាវបន្តិច',
    accomplishedTasks: 'ចែកចាយកញ្ចប់បញ្ញើរួចរាល់ 95% និងទំនាក់ទំនងអតិថិជនបានល្អ',
    unresolvedIssues: 'សល់ 15 កញ្ចប់អតិថិជនសុំលើកទៅទទួលថ្ងៃស្អែក',
    packageSecurity: 'ទំនិញទាំងអស់បានរៀបចំទុកដាក់លើធ្នើរ និងចាក់សោទ្វារឃ្លាំងសុវត្ថិភាព',
    closingTime: '9:30Pm',
    closingPhotos: [],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    status: 'completed'
  },
  {
    id: 'report_sample_siemreap',
    branch: 'សៀមរាប',
    date: '2026-08-14',
    dateDisplay: '14/08/26',
    reporterName: 'ជា វណ្ណា',
    position: 'អនុប្រធានសាខា',
    openingTime: '6:00Am',
    presentCount: 16,
    absentCount: 'គ្រប់ចំនួន',
    cleanlinessStatus: 'អនាម័យស្អាតល្អទាំងក្នុង និងក្រៅការិយាល័យសាខា',
    openingPhotos: [],
    workStatus: 'បញ្ញើទំនិញទេសចរណ៍ និងអីវ៉ាន់អនឡាញដំណើរការធម្មតា',
    operationChallenges: 'គ្មានបញ្ហាប្រឈមធ្ងន់ធ្ងរទេ',
    accomplishedTasks: 'ដឹកជញ្ជូនដល់គោលដៅគ្រប់ចំនួន 100%',
    unresolvedIssues: 'គ្មាន',
    packageSecurity: 'បញ្ញើទាំងអស់រក្សាទុកក្នុងបន្ទប់ត្រជាក់ និងឃ្លាំងសុវត្ថិភាពខ្ពស់',
    closingTime: '10:00Pm',
    closingPhotos: [],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    status: 'completed'
  }
];

// All 27 Branches in Khmer
const BRANCH_LIST = [
  'ការិយាល័យកណ្តាល',
  'ឃ្មួញ',
  'ស្ទឹងមានជ័យ',
  'ស្វាយរៀង',
  'កំពង់ឆ្នាំង',
  'ព្រៃវែង',
  'ប៉ៃលិន',
  'ឧត្តរមានជ័យ',
  'ព្រះវិហារ',
  'សៀមរាប',
  'មណ្ឌលគិរី',
  'ស្ទឹងត្រែង',
  'រតនគិរី',
  'កំពង់ធំ',
  'ត្បូងឃ្មុំ',
  'ពោធិ៍សាត់',
  'បាត់ដំបង',
  'កំពង់ស្ពឺ',
  'ព្រះសីហនុ',
  'កំពត',
  'តាកែវ',
  'បន្ទាយមានជ័យ',
  'ក្រចេះ',
  'កំពង់ចាម',
  'កោះកុង',
  'បាវិត',
  'ប៉ោយប៉ែត'
];

// All 27 Branches in English (1-to-1 match)
const BRANCH_LIST_EN = [
  'Head Office',
  'Khmounh',
  'Stueng Meanchey',
  'Svay Rieng',
  'Kampong Chhnang',
  'Prey Veng',
  'Pailin',
  'Oddar Meanchey',
  'Preah Vihear',
  'Siem Reap',
  'Mondulkiri',
  'Steung Treng',
  'Ratanakiri',
  'Kampong Thom',
  'Tboung Khmum',
  'Pursat',
  'Battambang',
  'Kampong Speu',
  'Preah Sihanouk',
  'Kampot',
  'Takeo',
  'Banteay Meanchey',
  'Kratie',
  'Kampong Cham',
  'Koh Kong',
  'Bavet',
  'Poi Pet'
];

const USER_ROLES = [
  { id: 'sys_admin', nameKm: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ', nameEn: 'System Administrator', badgeColor: 'purple' },
  { id: 'top_management', nameKm: 'គណៈគ្រប់គ្រងជាន់ខ្ពស់', nameEn: 'Top Management', badgeColor: 'indigo' },
  { id: 'ops_department', nameKm: 'នាយកដ្ឋានប្រតិបត្តិការ', nameEn: 'Operations Department (Admin)', badgeColor: 'red' },
  { id: 'branch_manager', nameKm: 'ប្រធានសាខា', nameEn: 'Branch Manager', badgeColor: 'blue' },
  { id: 'deputy_manager', nameKm: 'អនុប្រធានសាខា', nameEn: 'Deputy Branch Manager', badgeColor: 'cyan' },
  { id: 'operations_staff', nameKm: 'បុគ្គលិកប្រតិបត្តិការ', nameEn: 'Operations Staff', badgeColor: 'amber' },
  { id: 'customer_service', nameKm: 'ផ្នែកសេវាអតិថិជន', nameEn: 'Customer Service', badgeColor: 'emerald' }
];

const INITIAL_USERS = [
  {
    id: 'user_vid',
    username: 'vid',
    password: '123',
    fullName: 'Vid (System Admin)',
    role: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)',
    roleId: 'sys_admin',
    branch: 'ការិយាល័យកណ្ដាល',
    phone: '010 888 999',
    createdAt: '2026-08-01T08:00:00.000Z'
  },
  {
    id: 'user_admin',
    username: 'admin',
    password: '123',
    fullName: 'System Administrator',
    role: 'System Administrator (គ្រប់គ្រងប្រព័ន្ធ)',
    roleId: 'sys_admin',
    branch: 'ការិយាល័យកណ្ដាល',
    phone: '010 888 999',
    createdAt: '2026-08-01T08:00:00.000Z'
  },
  {
    id: 'user_rithjengdavid',
    username: 'rithjengdavid',
    password: '123',
    fullName: 'Rith Jeng David',
    role: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (System Administrator)',
    roleId: 'sys_admin',
    branch: 'ការិយាល័យកណ្ដាល',
    phone: '010 888 999',
    createdAt: '2026-08-01T08:00:00.000Z'
  },
  {
    id: 'user_sysadmin',
    username: 'sysadmin',
    password: '123',
    fullName: 'System Administrator',
    role: 'System Administrator (គ្រប់គ្រងប្រព័ន្ធ)',
    roleId: 'sys_admin',
    branch: 'ការិយាល័យកណ្ដាល',
    phone: '010 888 999',
    createdAt: '2026-08-01T08:00:00.000Z'
  },
  {
    id: 'user_vif',
    username: 'vif',
    password: '123',
    fullName: 'vif',
    role: 'គណៈគ្រប់គ្រងជាន់ខ្ពស់ (Top Management)',
    roleId: 'top_management',
    branch: 'ការិយាល័យកណ្តាល',
    phone: '123',
    createdAt: '2026-08-01T08:00:00.000Z'
  }
];

const Storage = {
  getDeletedReportIds() {
    try {
      const raw = localStorage.getItem(DELETED_REPORTS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr.map(id => String(id).trim()) : []);
    } catch (e) {
      return new Set();
    }
  },

  addDeletedReportId(id, sync = true) {
    if (!id) return;
    try {
      const strId = String(id).trim();
      const set = this.getDeletedReportIds();
      set.add(strId);
      localStorage.setItem(DELETED_REPORTS_KEY, JSON.stringify([...set]));
      if (sync && typeof this.syncDeletedTombstoneToDatabase === 'function') {
        this.syncDeletedTombstoneToDatabase('report', strId);
      }
    } catch (e) {
      console.warn('Error saving deleted report tombstone:', e);
    }
  },

  getDeletedIssueIds() {
    try {
      const raw = localStorage.getItem(DELETED_ISSUES_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr.map(id => String(id).trim()) : []);
    } catch (e) {
      return new Set();
    }
  },

  addDeletedIssueId(id, sync = true) {
    if (!id) return;
    try {
      const strId = String(id).trim();
      const set = this.getDeletedIssueIds();
      set.add(strId);
      localStorage.setItem(DELETED_ISSUES_KEY, JSON.stringify([...set]));
      if (sync && typeof this.syncDeletedTombstoneToDatabase === 'function') {
        this.syncDeletedTombstoneToDatabase('issue', strId);
      }
    } catch (e) {
      console.warn('Error saving deleted issue tombstone:', e);
    }
  },

  clearDeletedTombstones() {
    try {
      localStorage.removeItem(DELETED_REPORTS_KEY);
      localStorage.removeItem(DELETED_ISSUES_KEY);
    } catch (e) {}
  },

  getReports() {
    try {
      const deletedReportIds = this.getDeletedReportIds();
      const deletedIssueIds = this.getDeletedIssueIds();
      const isSeeded = localStorage.getItem(SEEDED_KEY) === 'true';
      const data = localStorage.getItem(STORAGE_KEY);

      if (!data) {
        // In web environment with Cloudflare D1 backend, never auto-seed dummy reports.
        // The authoritative reports will be fetched immediately from the database.
        localStorage.setItem(SEEDED_KEY, 'true');
        return [];
      }

      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          localStorage.setItem(SEEDED_KEY, 'true');
          return [];
        }

        if (!isSeeded) {
          localStorage.setItem(SEEDED_KEY, 'true');
        }

        // Filter out broken items, legacy fake seed reports, and any reports marked as deleted
        let filtered = parsed.filter(r => r && r.id && !String(r.id).startsWith('report_init_') && !deletedReportIds.has(String(r.id)));

        // Clean issues and unresolvedIssues of surviving reports against deletedIssueIds
        filtered.forEach(r => {
          if (Array.isArray(r.issues)) {
            r.issues = r.issues.filter((iss, idx) => {
              const iId = String(iss.id || '').trim();
              const synId = `iss_${r.id}_${idx}`;
              const iText = String(iss.issue || '').trim();
              return !deletedIssueIds.has(iId) && !deletedIssueIds.has(synId) && !deletedIssueIds.has(iText);
            });
          }
          if (deletedIssueIds.has(`iss_unresolved_${r.id}`) || (r.unresolvedIssues && deletedIssueIds.has(String(r.unresolvedIssues).trim()))) {
            r.unresolvedIssues = '';
          }
        });
        
        // Deduplicate identical duplicate reports (e.g. created by double-click or rapid double-save)
        const seenIds = new Set();
        const seenSignatures = new Set();
        const deduplicated = [];

        for (const r of filtered) {
          const rId = String(r.id);
          const branch = String(r.branch || '').trim();
          const date = String(r.date || '').trim();
          const reporter = String(r.reporterName || '').trim();
          const opTime = String(r.openingTime || '').trim();
          const content = String(r.workStatus || r.cleanlinessStatus || '').trim().slice(0, 50);

          const contentSig = `${branch}|${date}|${reporter}|${opTime}|${content}`;

          if (!seenIds.has(rId) && (!contentSig || !seenSignatures.has(contentSig))) {
            seenIds.add(rId);
            if (branch && date) seenSignatures.add(contentSig);
            deduplicated.push(r);
          }
        }

        if (deduplicated.length !== parsed.length) {
          this.saveReports(deduplicated);
        }
        return deduplicated;
      }
      return [];
    } catch (e) {
      console.error('Error loading reports from localStorage:', e);
      return [];
    }
  },

  getInitialSampleReports() {
    const today = new Date().toISOString().split('T')[0];
    const todayDisplay = new Date().toLocaleDateString('km-KH');

    return [
      {
        id: 'report_init_sihanoukville',
        branch: 'ព្រះសីហនុ',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'ព្រះសីហនុ បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 22,
        absentCount: 2,
        absentReason: 'សុំច្បាប់ឈឺ ១នាក់, ធុរៈផ្ទាល់ខ្លួន ១នាក់',
        workStatus: 'ការទទួល និងបញ្ជូនទំនិញដំណើរការធម្មតា',
        operationChallenges: 'អីវ៉ាន់ដឹកអត់ដល់ កង់បីអស់ថ្ម អីវ៉ាន់ខ្លះសល់ទុកដឹកស្អែក',
        accomplishedTasks: '• ចែកចាយកញ្ចប់ទំនិញបាន 180 កញ្ចប់\n• ប្រមូលប្រាក់ COD បានគ្រប់ចំនួន',
        unresolvedIssues: '• អីវ៉ាន់ដឹកអត់ដល់ កង់បីអស់ថ្ម\n• ភ្ញៀវអត់លើកទូរស័ព្ទ ចំនួន ៣កញ្ចប់',
        packageSecurity: 'ទំនិញក្នុងឃ្លាំងមានសុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_shv_1', issue: 'អីវ៉ាន់ដឹកអត់ដល់ កង់បីអស់ថ្ម', status: 'incomplete', note: 'ត្រូវយកទៅសាកថ្មយប់នេះ' },
          { id: 'iss_shv_2', issue: 'ភ្ញៀវអត់លើកទូរស័ព្ទ ចំនួន ៣កញ្ចប់', status: 'incomplete', note: 'ទាក់ទងឡើងវិញស្អែកព្រឹក' },
          { id: 'iss_shv_3', issue: 'ជួសជុលម៉ាស៊ីនព្រីនវិក្កយបត្រ', status: 'complete', note: 'បានដោះស្រាយរួចរាល់' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'report_init_headoffice',
        branch: 'ការិយាល័យកណ្តាល',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:00 AM',
        closingTime: '08:00 PM',
        reporterName: 'ជា សុភ័ក្រ្ត',
        position: 'ប្រធានសាខា',
        presentCount: 45,
        absentCount: 1,
        absentReason: 'សុំច្បាប់',
        workStatus: 'ប្រតិបត្តិការទូទាំងរាជធានីភ្នំពេញដំណើរការយ៉ាងរលូន',
        operationChallenges: 'គ្មាន',
        accomplishedTasks: '• បញ្ជូនអីវ៉ាន់ VIP ទៅសាខាខេត្តបានទាន់ពេល\n• ត្រួតពិនិត្យប្រព័ន្ធទិន្នន័យ Server',
        unresolvedIssues: 'គ្មាន',
        packageSecurity: 'ឃ្លាំងកណ្តាលមានសុវត្ថិភាព 100%',
        issues: [
          { id: 'iss_hq_1', issue: 'បញ្ជូនអីវ៉ាន់ VIP ទៅសាខាខេត្ត', status: 'complete', note: 'បានចេញឡានម៉ោង ៩ព្រឹក' },
          { id: 'iss_hq_2', issue: 'ត្រួតពិនិត្យប្រព័ន្ធទិន្នន័យ Server', status: 'complete', note: 'ដំណើរការប្រក្រតី' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
      },
      {
        id: 'report_init_siemreap',
        branch: 'សៀមរាប',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:30 PM',
        reporterName: 'សៀមរាប បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 18,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'អីវ៉ាន់ចូលមកច្រើននៅពេលរសៀល',
        operationChallenges: 'ភ្ញៀវសុំពន្យារពេលទទួលឥវ៉ាន់ថ្ងៃស្អែក',
        accomplishedTasks: '• រៀបចំកញ្ចប់ផ្ញើទៅភ្នំពេញជើងព្រឹក\n• ចែកចាយទំនិញតំបន់ក្រុង',
        unresolvedIssues: '• ភ្ញៀវសុំពន្យារពេលទទួលឥវ៉ាន់ថ្ងៃស្អែក',
        packageSecurity: 'ទំនិញរក្សាទុកក្នុងបន្ទប់សុវត្ថិភាព',
        issues: [
          { id: 'iss_sr_1', issue: 'ភ្ញៀវសុំពន្យារពេលទទួលឥវ៉ាន់ថ្ងៃស្អែក', status: 'incomplete', note: 'ភ្ញៀវជាប់រវល់ប្រជុំ' },
          { id: 'iss_sr_2', issue: 'រៀបចំកញ្ចប់ផ្ញើទៅភ្នំពេញជើងព្រឹក', status: 'complete', note: 'ផ្ញើរួចរាល់' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
      },
      {
        id: 'report_init_battambang',
        branch: 'បាត់ដំបង',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'បាត់ដំបង បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 16,
        absentCount: 1,
        absentReason: 'សុំច្បាប់',
        workStatus: 'ការងារដំណើរការល្អ ទទួលបញ្ញើបាន 140 កញ្ចប់',
        operationChallenges: 'ទូរស័ព្ទសាខាមានបញ្ហាសេវា',
        accomplishedTasks: '• ជួសជុលម៉ូតូដឹកជញ្ជូនរួចរាល់\n• ចែកចាយបញ្ញើតាមស្រុក',
        unresolvedIssues: '• ទូរស័ព្ទសាខាមានបញ្ហាសេវា',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_btb_1', issue: 'ម៉ូតូដឹកជញ្ជូនខូចកង់ ១គ្រឿង', status: 'complete', note: 'បានប្តូរកង់ថ្មីរួច' },
          { id: 'iss_btb_2', issue: 'ទូរស័ព្ទសាខាមានបញ្ហាសេវា', status: 'incomplete', note: 'បានទាក់ទងក្រុមហ៊ុនទូរគមនាគមន៍' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
      },
      {
        id: 'report_init_poipet',
        branch: 'ប៉ោយប៉ែត',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:00 AM',
        closingTime: '08:00 PM',
        reporterName: 'ប៉ោយប៉ែត បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 15,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ទំនិញនាំចូលពីច្រកទ្វារព្រំដែនច្រើន',
        operationChallenges: 'កកស្ទះការត្រួតពិនិត្យឯកសារគយ',
        accomplishedTasks: '• បានរៀបចំឃ្លាំងស្តុកឥវ៉ាន់រួចរាល់',
        unresolvedIssues: '• រង់ចាំអីវ៉ាន់ឆ្លងដែនពីថៃ\n• កកស្ទះការត្រួតពិនិត្យឯកសារគយ',
        packageSecurity: 'ទំនិញត្រូវបានឆែកត្រួតពិនិត្យម៉ត់ចត់',
        issues: [
          { id: 'iss_ppt_1', issue: 'រង់ចាំអីវ៉ាន់ឆ្លងដែនពីថៃ', status: 'incomplete', note: 'ទំនិញនឹងមកដល់យប់នេះ' },
          { id: 'iss_ppt_2', issue: 'កកស្ទះការត្រួតពិនិត្យឯកសារគយ', status: 'incomplete', note: 'កំពុងរង់ចាំការអនុញ្ញាត' },
          { id: 'iss_ppt_3', issue: 'បានរៀបចំឃ្លាំងស្តុកឥវ៉ាន់រួចរាល់', status: 'complete', note: 'ឃ្លាំងស្អាតរៀបរយ' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
      },
      {
        id: 'report_init_bavet',
        branch: 'បាវិត',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:30 PM',
        reporterName: 'បាវិត បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 12,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ការងារនាំចេញនាំចូលដំណើរការធម្មតា',
        operationChallenges: 'អីវ៉ាន់មកពីវៀតណាមយឺតយ៉ាវ',
        accomplishedTasks: '• បានទូទាត់ប្រាក់ COD ជូនអតិថិជនរួច',
        unresolvedIssues: '• អីវ៉ាន់មកពីវៀតណាមយឺតយ៉ាវ',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_bvt_1', issue: 'អីវ៉ាន់មកពីវៀតណាមយឺតយ៉ាវ', status: 'incomplete', note: 'ឡានដឹកជញ្ជូនជាប់កកស្ទះព្រំដែន' },
          { id: 'iss_bvt_2', issue: 'បានទូទាត់ប្រាក់ COD ជូនអតិថិជនរួច', status: 'complete', note: 'ទូទាត់រួចរាល់ 100%' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 7).toISOString()
      },
      {
        id: 'report_init_kampot',
        branch: 'កំពត',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'កំពត បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 10,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ការងារចែកចាយទំនិញក្នុងក្រុងកំពតបានល្អ',
        operationChallenges: 'ភ្លៀងធ្លាក់ខ្លាំង យឺតយ៉ាវការដឹកជញ្ជូនបន្តិច',
        accomplishedTasks: '• ចែកចាយទំនិញបាន 95 កញ្ចប់',
        unresolvedIssues: 'គ្មាន',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_kpt_1', issue: 'ភ្លៀងធ្លាក់ខ្លាំង យឺតយ៉ាវការដឹកជញ្ជូនបន្តិច', status: 'complete', note: 'បានដឹកជូនភ្ញៀវរួចរាល់នៅល្ងាច' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 8).toISOString()
      },
      {
        id: 'report_init_kratie',
        branch: 'ក្រចេះ',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'ក្រចេះ បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 8,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ការងារដំណើរការរលូន',
        operationChallenges: 'ផ្លូវលិចទឹកពិបាកដឹកជញ្ជូនតំបន់ស្រុក',
        accomplishedTasks: '• បានទំនាក់ទំនងអតិថិជនមកយកនៅសាខាផ្ទាល់',
        unresolvedIssues: '• ផ្លូវលិចទឹកពិបាកដឹកជញ្ជូនតំបន់ស្រុក',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_krt_1', issue: 'ផ្លូវលិចទឹកពិបាកដឹកជញ្ជូនតំបន់ស្រុក', status: 'incomplete', note: 'រង់ចាំទឹកស្រក' },
          { id: 'iss_krt_2', issue: 'បានទំនាក់ទំនងអតិថិជនមកយកនៅសាខាផ្ទាល់', status: 'complete', note: 'អតិថិជនបានមកទទួល' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 9).toISOString()
      },
      {
        id: 'report_init_kampongcham',
        branch: 'កំពង់ចាម',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'កំពង់ចាម បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 14,
        absentCount: 1,
        absentReason: 'ឈឺសុំច្បាប់',
        workStatus: 'ការងារដំណើរការល្អ ទទួលបញ្ញើបាន 120 កញ្ចប់',
        operationChallenges: 'គ្មាន',
        accomplishedTasks: '• បុគ្គលិកឈឺសុំច្បាប់ ១នាក់\n• រៀបចំអីវ៉ាន់ចែកតាមស្រុក',
        unresolvedIssues: 'គ្មាន',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_kpc_1', issue: 'បុគ្គលិកឈឺសុំច្បាប់ ១នាក់', status: 'complete', note: 'បានរៀបចំបុគ្គលិកជំនួស' },
          { id: 'iss_kpc_2', issue: 'រៀបចំអីវ៉ាន់ចែកតាមស្រុក', status: 'complete', note: 'ចែករួចរាល់' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 10).toISOString()
      },
      {
        id: 'report_init_takeo',
        branch: 'តាកែវ',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'តាកែវ បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 11,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ការងារដំណើរការធម្មតា',
        operationChallenges: 'ខ្វះប្រអប់វេចខ្ចប់ទំហំ L',
        accomplishedTasks: '• ចែកចាយអីវ៉ាន់បាន 80 កញ្ចប់',
        unresolvedIssues: '• ខ្វះប្រអប់វេចខ្ចប់ទំហំ L',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_tko_1', issue: 'ខ្វះប្រអប់វេចខ្ចប់ទំហំ L', status: 'incomplete', note: 'បានស្នើសុំមកការិយាល័យកណ្តាល' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 11).toISOString()
      },
      {
        id: 'report_init_khmounh',
        branch: 'ឃ្មួញ',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'ឃ្មួញ បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 13,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ការងារទទួលនិងចែកទំនិញតំបន់សែនសុខបានល្អ',
        operationChallenges: 'ខ្វះខ្សែរុំកញ្ចប់ទំនិញ',
        accomplishedTasks: '• ជួសជុលរទេះរុញទំនិញរួចរាល់',
        unresolvedIssues: '• ខ្វះខ្សែរុំកញ្ចប់ទំនិញ',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_khm_1', issue: 'ជួសជុលរទេះរុញទំនិញ', status: 'complete', note: 'ជួសជុលរួច' },
          { id: 'iss_khm_2', issue: 'ខ្វះខ្សែរុំកញ្ចប់ទំនិញ', status: 'incomplete', note: 'រង់ចាំសម្ភារៈបន្ថែម' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
      },
      {
        id: 'report_init_stuengmeanchey',
        branch: 'ស្ទឹងមានជ័យ',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:00 AM',
        closingTime: '07:30 PM',
        reporterName: 'ស្ទឹងមានជ័យ បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 20,
        absentCount: 1,
        absentReason: 'សុំច្បាប់',
        workStatus: 'ទំនិញចេញចូលច្រើនក្នុងតំបន់មានជ័យ',
        operationChallenges: 'ចរាចរណ៍កកស្ទះផ្លូវវេងស្រេង',
        accomplishedTasks: '• រៀបចំកញ្ចប់ Express ពេលព្រឹក\n• ជួសជុលម៉ូតូដឹកជញ្ជូនរួច',
        unresolvedIssues: '• ចរាចរណ៍កកស្ទះផ្លូវវេងស្រេង',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_smc_1', issue: 'ចរាចរណ៍កកស្ទះផ្លូវវេងស្រេង', status: 'incomplete', note: 'ត្រូវពង្វាងផ្លូវផ្សេង' },
          { id: 'iss_smc_2', issue: 'រៀបចំកញ្ចប់ Express ពេលព្រឹក', status: 'complete', note: 'ចែករួចរាល់' },
          { id: 'iss_smc_3', issue: 'ជួសជុលម៉ូតូដឹកជញ្ជូន', status: 'complete', note: 'ដំណើរការធម្មតាវិញ' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 13).toISOString()
      },
      {
        id: 'report_init_svayrieng',
        branch: 'ស្វាយរៀង',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'ស្វាយរៀង បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 10,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ការងារដំណើរការរលូនល្អ',
        operationChallenges: 'រង់ចាំទំនិញពីព្រំដែនព្រៃវល្លិ៍',
        accomplishedTasks: '• ប្រមូលប្រាក់ COD គ្រប់ចំនួន',
        unresolvedIssues: '• រង់ចាំទំនិញពីព្រំដែនព្រៃវល្លិ៍',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_svr_1', issue: 'រង់ចាំទំនិញពីព្រំដែនព្រៃវល្លិ៍', status: 'incomplete', note: 'ទំនិញមកដល់យប់នេះ' },
          { id: 'iss_svr_2', issue: 'ប្រមូលប្រាក់ COD គ្រប់ចំនួន', status: 'complete', note: 'បានបញ្ជូនចូលគណនីក្រុមហ៊ុន' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 14).toISOString()
      },
      {
        id: 'report_init_kampongchhnang',
        branch: 'កំពង់ឆ្នាំង',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'កំពង់ឆ្នាំង បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 9,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ចែកចាយទំនិញតំបន់ក្រុងនិងស្រុករលូន',
        operationChallenges: 'ផ្លូវក្រួសក្រហមពិបាកធ្វើដំណើរ',
        accomplishedTasks: '• បានទូទាត់ប្រាក់ជូនអ្នកផ្ញើ',
        unresolvedIssues: '• ផ្លូវក្រួសក្រហមពិបាកធ្វើដំណើរ',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_kcn_1', issue: 'ផ្លូវក្រួសក្រហមពិបាកធ្វើដំណើរ', status: 'incomplete', note: 'ផ្លូវរអិលពេលភ្លៀង' },
          { id: 'iss_kcn_2', issue: 'បានទូទាត់ប្រាក់ជូនអ្នកផ្ញើ', status: 'complete', note: 'រួចរាល់' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 15).toISOString()
      },
      {
        id: 'report_init_preyveng',
        branch: 'ព្រៃវែង',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'ព្រៃវែង បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 11,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ប្រតិបត្តិការដំណើរការលឿននិងទាន់ពេលវេលា',
        operationChallenges: 'គ្មាន',
        accomplishedTasks: '• បានបញ្ចប់ការចែកទំនិញមុនម៉ោង ៥ល្ងាច\n• សម្អាតឃ្លាំងស្តុក',
        unresolvedIssues: 'គ្មាន',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_pv_1', issue: 'បានបញ្ចប់ការចែកទំនិញមុនម៉ោង ៥ល្ងាច', status: 'complete', note: 'ជោគជ័យ 100%' },
          { id: 'iss_pv_2', issue: 'សម្អាតឃ្លាំងស្តុក', status: 'complete', note: 'ឃ្លាំងស្អាត' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 16).toISOString()
      },
      {
        id: 'report_init_pailin',
        branch: 'ប៉ៃលិន',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'ប៉ៃលិន បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 7,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ការងារដំណើរការល្អ',
        operationChallenges: 'អាកាសធាតុភ្លៀងអ័ព្ទច្រើន',
        accomplishedTasks: '• ត្រួតពិនិត្យទំនិញកសិផល',
        unresolvedIssues: '• អាកាសធាតុភ្លៀងអ័ព្ទច្រើន',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_pln_1', issue: 'អាកាសធាតុភ្លៀងអ័ព្ទច្រើន', status: 'incomplete', note: 'បើកបរដោយប្រុងប្រយ័ត្ន' },
          { id: 'iss_pln_2', issue: 'ត្រួតពិនិត្យទំនិញកសិផល', status: 'complete', note: 'ពិនិត្យរួចរាល់' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 17).toISOString()
      },
      {
        id: 'report_init_oddarmeanchey',
        branch: 'ឧត្តរមានជ័យ',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'ឧត្តរមានជ័យ បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 8,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ការងារដំណើរការធម្មតា',
        operationChallenges: 'រង់ចាំអតិថិជនមកយកទំនិញនៅសាខា',
        accomplishedTasks: '• បានផ្ញើទំនិញបន្តទៅអន្លង់វែង',
        unresolvedIssues: '• រង់ចាំអតិថិជនមកយកទំនិញនៅសាខា',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_omc_1', issue: 'រង់ចាំអតិថិជនមកយកទំនិញនៅសាខា', status: 'incomplete', note: 'អតិថិជនមកយកស្អែក' },
          { id: 'iss_omc_2', issue: 'បានផ្ញើទំនិញបន្តទៅអន្លង់វែង', status: 'complete', note: 'ផ្ញើរួចរាល់' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 18).toISOString()
      },
      {
        id: 'report_init_preahvihear',
        branch: 'ព្រះវិហារ',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'ព្រះវិហារ បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 8,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ការងារដំណើរការល្អ',
        operationChallenges: 'ចម្ងាយឆ្ងាយរវាងភូមិនិងស្រុក',
        accomplishedTasks: '• បានបញ្ចប់ការដឹកជញ្ជូនតំបន់ក្រុង',
        unresolvedIssues: '• ចម្ងាយឆ្ងាយរវាងភូមិនិងស្រុក',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_pvh_1', issue: 'ចម្ងាយឆ្ងាយរវាងភូមិនិងស្រុក', status: 'incomplete', note: 'ត្រូវការរៀបចំផ្លូវដឹកឱ្យបានល្អ' },
          { id: 'iss_pvh_2', issue: 'បានបញ្ចប់ការដឹកជញ្ជូនតំបន់ក្រុង', status: 'complete', note: 'ចែករួចរាល់' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 19).toISOString()
      },
      {
        id: 'report_init_mondulkiri',
        branch: 'មណ្ឌលគិរី',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'មណ្ឌលគិរី បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 6,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ការងារដំណើរការល្អ',
        operationChallenges: 'ផ្លូវឡើងភ្នំពិបាកបើកបរពេលភ្លៀង',
        accomplishedTasks: '• បានចែកចាយកាហ្វេនិងកញ្ចប់ទំនិញ',
        unresolvedIssues: '• ផ្លូវឡើងភ្នំពិបាកបើកបរពេលភ្លៀង',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_mdk_1', issue: 'ផ្លូវឡើងភ្នំពិបាកបើកបរពេលភ្លៀង', status: 'incomplete', note: 'រថយន្តត្រូវមានច្រវាក់ការពារកង់' },
          { id: 'iss_mdk_2', issue: 'បានចែកចាយកាហ្វេនិងកញ្ចប់ទំនិញ', status: 'complete', note: 'ចែករួចរាល់' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 20).toISOString()
      },
      {
        id: 'report_init_stungtreng',
        branch: 'ស្ទឹងត្រែង',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'ស្ទឹងត្រែង បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 7,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ការងារដំណើរការធម្មតា',
        operationChallenges: 'ទូកឆ្លងសាឡាងយឺតយ៉ាវ',
        accomplishedTasks: '• បានចែកកញ្ចប់ទំនិញតំបន់កណ្តាលក្រុង',
        unresolvedIssues: '• ទូកឆ្លងសាឡាងយឺតយ៉ាវ',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_str_1', issue: 'ទូកឆ្លងសាឡាងយឺតយ៉ាវ', status: 'incomplete', note: 'រង់ចាំជើងសាឡាង' },
          { id: 'iss_str_2', issue: 'បានចែកកញ្ចប់ទំនិញតំបន់កណ្តាលក្រុង', status: 'complete', note: 'ចែករួចរាល់' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 21).toISOString()
      },
      {
        id: 'report_init_ratanakiri',
        branch: 'រតនគិរី',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'រតនគិរី បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 7,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ការងារចែកចាយទំនិញដំណើរការល្អ',
        operationChallenges: 'សេវាទូរស័ព្ទនៅតំបន់ដាច់ស្រយាលរអាក់រអួល',
        accomplishedTasks: '• បានរៀបចំទុកដាក់ទំនិញមានសុវត្ថិភាព',
        unresolvedIssues: '• សេវាទូរស័ព្ទនៅតំបន់ដាច់ស្រយាលរអាក់រអួល',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_rtk_1', issue: 'សេវាទូរស័ព្ទនៅតំបន់ដាច់ស្រយាលរអាក់រអួល', status: 'incomplete', note: 'ទាក់ទងភ្ញៀវតាម WhatsApp / Telegram' },
          { id: 'iss_rtk_2', issue: 'បានរៀបចំទុកដាក់ទំនិញមានសុវត្ថិភាព', status: 'complete', note: 'ឃ្លាំងមានសុវត្ថិភាព' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 22).toISOString()
      },
      {
        id: 'report_init_kampongthom',
        branch: 'កំពង់ធំ',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'កំពង់ធំ បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 13,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ការងារដំណើរការលឿននិងទាន់ពេលវេលា',
        operationChallenges: 'គ្មាន',
        accomplishedTasks: '• បានបញ្ចប់ការចែកចាយតាមស្រុកស្ទោង\n• ត្រួតពិនិត្យប្រព័ន្ធកាមេរ៉ាសុវត្ថិភាព',
        unresolvedIssues: 'គ្មាន',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_kpt_1', issue: 'បានបញ្ចប់ការចែកចាយតាមស្រុកស្ទោង', status: 'complete', note: 'ចែករួចរាល់' },
          { id: 'iss_kpt_2', issue: 'ត្រួតពិនិត្យប្រព័ន្ធកាមេរ៉ាសុវត្ថិភាព', status: 'complete', note: 'កាមេរ៉ាដំណើរការល្អ' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 23).toISOString()
      },
      {
        id: 'report_init_tboungkhmum',
        branch: 'ត្បូងឃ្មុំ',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'ត្បូងឃ្មុំ បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 10,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ការងារចែកចាយទំនិញដំណើរការល្អ',
        operationChallenges: 'អតិថិជនសុំពន្យារពេលទទួលកញ្ចប់ថ្ងៃចន្ទ',
        accomplishedTasks: '• បានទូទាត់ប្រាក់បញ្ញើ',
        unresolvedIssues: '• អតិថិជនសុំពន្យារពេលទទួលកញ្ចប់ថ្ងៃចន្ទ',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_tbk_1', issue: 'អតិថិជនសុំពន្យារពេលទទួលកញ្ចប់ថ្ងៃចន្ទ', status: 'incomplete', note: 'ភ្ញៀវជាប់រវល់' },
          { id: 'iss_tbk_2', issue: 'បានទូទាត់ប្រាក់បញ្ញើ', status: 'complete', note: 'ទូទាត់រួច' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: 'report_init_pursat',
        branch: 'ពោធិ៍សាត់',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'ពោធិ៍សាត់ បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 11,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ការងារចែកចាយទំនិញដំណើរការល្អ',
        operationChallenges: 'កង់បីខូចប៊ូស៊ីពេលកំពុងដឹក',
        accomplishedTasks: '• បានជួសជុលនិងដឹកបន្តរួចរាល់',
        unresolvedIssues: 'គ្មាន',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_pst_1', issue: 'កង់បីខូចប៊ូស៊ីពេលកំពុងដឹក', status: 'complete', note: 'ជួសជុលរួចរាល់' },
          { id: 'iss_pst_2', issue: 'បានជួសជុលនិងដឹកបន្តរួចរាល់', status: 'complete', note: 'ចែករួចរាល់' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 25).toISOString()
      },
      {
        id: 'report_init_kampongspeu',
        branch: 'កំពង់ស្ពឺ',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'កំពង់ស្ពឺ បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 14,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ការងារដឹកជញ្ជូនរោងចក្រដំណើរការលឿន',
        operationChallenges: 'គ្មាន',
        accomplishedTasks: '• បានដឹកជញ្ជូនរោងចក្រតំបន់ផ្លូវជាតិលេខ៤\n• រៀបចំបញ្ជីទំនិញប្រចាំថ្ងៃ',
        unresolvedIssues: 'គ្មាន',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_kps_1', issue: 'បានដឹកជញ្ជូនរោងចក្រតំបន់ផ្លូវជាតិលេខ៤', status: 'complete', note: 'ដឹកទាន់ម៉ោង' },
          { id: 'iss_kps_2', issue: 'រៀបចំបញ្ជីទំនិញប្រចាំថ្ងៃ', status: 'complete', note: 'បញ្ជីត្រឹមត្រូវ' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 26).toISOString()
      },
      {
        id: 'report_init_banteaymeanchey',
        branch: 'បន្ទាយមានជ័យ',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:30 PM',
        reporterName: 'បន្ទាយមានជ័យ បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 14,
        absentCount: 1,
        absentReason: 'សុំច្បាប់',
        workStatus: 'ការងារចេញចូលទំនិញច្រើន',
        operationChallenges: 'កកស្ទះចរាចរណ៍តំបន់ផ្សារសិរីសោភ័ណ',
        accomplishedTasks: '• បានចែកទំនិញទាន់ពេល\n• បានប្តូរប្រេងម៉ាស៊ីនរថយន្ត',
        unresolvedIssues: '• កកស្ទះចរាចរណ៍តំបន់ផ្សារសិរីសោភ័ណ',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_bmc_1', issue: 'កកស្ទះចរាចរណ៍តំបន់ផ្សារសិរីសោភ័ណ', status: 'incomplete', note: 'ពន្យារពេលដឹកបន្តិច' },
          { id: 'iss_bmc_2', issue: 'បានចែកទំនិញទាន់ពេល', status: 'complete', note: 'ចែករួចរាល់' },
          { id: 'iss_bmc_3', issue: 'បានប្តូរប្រេងម៉ាស៊ីនរថយន្ត', status: 'complete', note: 'ថែទាំរួច' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 27).toISOString()
      },
      {
        id: 'report_init_kohkong',
        branch: 'កោះកុង',
        date: today,
        dateDisplay: todayDisplay,
        openingTime: '07:30 AM',
        closingTime: '07:00 PM',
        reporterName: 'កោះកុង បុគ្គលិក',
        position: 'បុគ្គលិកប្រតិបត្តិការ',
        presentCount: 8,
        absentCount: 0,
        absentReason: 'គ្មាន',
        workStatus: 'ការងារដំណើរការធម្មតា',
        operationChallenges: 'ភ្លៀងធ្លាក់ខ្លាំងតំបន់ឆ្នេរ',
        accomplishedTasks: '• បានរក្សាទុកកញ្ចប់ទំនិញក្នុងថង់ការពារទឹកជ្រាប',
        unresolvedIssues: '• ភ្លៀងធ្លាក់ខ្លាំងតំបន់ឆ្នេរ',
        packageSecurity: 'សុវត្ថិភាពល្អ',
        issues: [
          { id: 'iss_kk_1', issue: 'ភ្លៀងធ្លាក់ខ្លាំងតំបន់ឆ្នេរ', status: 'incomplete', note: 'ការពារទំនិញកុំឱ្យសើម' },
          { id: 'iss_kk_2', issue: 'បានរក្សាទុកកញ្ចប់ទំនិញក្នុងថង់ការពារទឹកជ្រាប', status: 'complete', note: 'ទំនិញស្ងួតល្អ' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 28).toISOString()
      }
    ];
  },

  saveReports(reports) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
      localStorage.setItem(SEEDED_KEY, 'true');
      return true;
    } catch (e) {
      console.warn('LocalStorage quota limit reached in saveReports. Preserving latest photos and report texts...', e);
      try {
        // Tier 1: Keep full photos for the 3 most recent reports locally (Cloudflare D1 keeps all photos on cloud)
        const optimized = (reports || []).map((r, idx) => {
          if (idx < 3) return r;
          return {
            ...r,
            openingPhotos: (r.openingPhotos && r.openingPhotos.length > 0) ? [r.openingPhotos[0]] : [],
            closingPhotos: (r.closingPhotos && r.closingPhotos.length > 0) ? [r.closingPhotos[0]] : []
          };
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(optimized));
        localStorage.setItem(SEEDED_KEY, 'true');
        return true;
      } catch (e2) {
        try {
          // Tier 2: Retain full report for most recent report, text-only for older reports
          const textOnly = (reports || []).map((r, idx) => {
            if (idx === 0) return r;
            return { ...r, openingPhotos: [], closingPhotos: [], additionalPhotos: [] };
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(textOnly));
          localStorage.setItem(SEEDED_KEY, 'true');
          return true;
        } catch (e3) {
          console.error('Critical quota error in saveReports:', e3);
          return false;
        }
      }
    }
  },

  saveReport(report) {
    if (!report) return null;
    report.id = report.id || ('report_' + Date.now());

    // If this report is tombstoned, do not resurrect it
    const deletedReportIds = this.getDeletedReportIds();
    if (deletedReportIds.has(String(report.id))) {
      return null;
    }

    // Filter out any tombstoned issues attached to this report
    if (Array.isArray(report.issues)) {
      const deletedIssueIds = this.getDeletedIssueIds();
      report.issues = report.issues.filter((iss, idx) => {
        const iId = String(iss.id || '').trim();
        const synId = `iss_${report.id}_${idx}`;
        const iText = String(iss.issue || '').trim();
        return !deletedIssueIds.has(iId) && !deletedIssueIds.has(synId) && !deletedIssueIds.has(iText);
      });
    }

    const reports = this.getReports();
    
    // Check if matching report exists by ID or exact same-day same-branch same-time content signature
    const branch = String(report.branch || '').trim();
    const date = String(report.date || '').trim();
    const reporter = String(report.reporterName || '').trim();
    const opTime = String(report.openingTime || '').trim();
    const content = String(report.workStatus || report.cleanlinessStatus || '').trim().slice(0, 50);
    const contentSig = `${branch}|${date}|${reporter}|${opTime}|${content}`;

    const existingIndex = reports.findIndex(r => {
      if (r.id === report.id) return true;
      if (branch && date && r.branch === branch && r.date === date) {
        const rSig = `${String(r.branch || '').trim()}|${String(r.date || '').trim()}|${String(r.reporterName || '').trim()}|${String(r.openingTime || '').trim()}|${String(r.workStatus || r.cleanlinessStatus || '').trim().slice(0, 50)}`;
        return rSig === contentSig;
      }
      return false;
    });

    if (existingIndex >= 0) {
      report.id = reports[existingIndex].id; // Maintain stable ID
      reports[existingIndex] = { ...report, updatedAt: new Date().toISOString() };
    } else {
      reports.unshift({ ...report, createdAt: new Date().toISOString() });
    }

    this.saveReports(reports);
    this.syncReportToDatabase(report);
    return report;
  },

  getReportById(id) {
    const reports = this.getReports();
    return reports.find(r => r.id === id) || null;
  },

  deleteReport(id) {
    if (!id) return this.getReports();
    const strId = String(id).trim();
    this.addDeletedReportId(strId);

    // Also tombstone all issues attached to this report
    let rawReports = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      rawReports = raw ? JSON.parse(raw) : [];
    } catch (e) {
      rawReports = [];
    }

    const rep = rawReports.find(r => r && String(r.id) === strId);
    if (rep) {
      this.addDeletedIssueId(`iss_unresolved_${strId}`);
      if (Array.isArray(rep.issues)) {
        rep.issues.forEach((iss, idx) => {
          if (iss.id) this.addDeletedIssueId(String(iss.id));
          this.addDeletedIssueId(`iss_${strId}_${idx}`);
          if (iss.issue) this.addDeletedIssueId(String(iss.issue).trim());
        });
      }
      if (rep.unresolvedIssues && String(rep.unresolvedIssues).trim()) {
        this.addDeletedIssueId(String(rep.unresolvedIssues).trim());
      }
    }

    let reports = rawReports.filter(r => r && String(r.id) !== strId);
    this.saveReports(reports);
    this.syncDeleteReportToDatabase(strId);

    // Also clean up any standalone issues referencing this report
    try {
      let issues = this.getIssues();
      const initLen = issues.length;
      issues = issues.filter(i => String(i.reportId) !== strId);
      if (issues.length !== initLen) {
        this.saveIssues(issues);
      }
    } catch (e) {}

    return reports;
  },

  // =========================================================================
  // MYSQL DATABASE SYNC & API INTEGRATION
  // =========================================================================
  isDbOnline: false,

  getApiBaseUrl() {
    try {
      const customUrl = localStorage.getItem('bs_express_api_url');
      if (customUrl && typeof customUrl === 'string' && customUrl.trim()) {
        const trimmed = customUrl.trim().replace(/\/+$/, '');
        // Automatically prune stale tunnel or localhost URLs when on Pages or file protocol
        if (trimmed.includes('trycloudflare.com') || trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
          if (typeof window !== 'undefined' && (window.location.hostname.endsWith('pages.dev') || window.location.protocol === 'file:')) {
            localStorage.removeItem('bs_express_api_url');
            return window.location.protocol === 'file:' ? 'https://bs-express-report.pages.dev' : '';
          }
        }
        return trimmed;
      }
    } catch (e) {}
    // If opened directly from file system (file://), connect to production Pages backend
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      return 'https://bs-express-report.pages.dev';
    }
    // Native Same-Origin for Cloudflare Pages (with D1 Functions) and local server
    return '';
  },

  setApiBaseUrl(url) {
    try {
      if (!url) {
        localStorage.removeItem('bs_express_api_url');
      } else {
        localStorage.setItem('bs_express_api_url', String(url).trim().replace(/\/+$/, ''));
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  setDbOnline(online) {
    this.isDbOnline = Boolean(online);
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('bs-db-status', { 
        detail: { online: this.isDbOnline } 
      }));
    }
  },

  async checkDbHealth() {
    try {
      const baseUrl = this.getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/db/status`);
      if (res.ok) {
        const data = await res.json();
        this.setDbOnline(data.connected);
        return data;
      }
    } catch (err) {
      this.setDbOnline(false);
    }
    return { connected: false };
  },

  async syncReportToDatabase(report) {
    try {
      const baseUrl = this.getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
      if (res.ok) {
        const data = await res.json();
        this.setDbOnline(true);
        return data;
      }
    } catch (err) {
      this.setDbOnline(false);
    }
    return null;
  },

  async syncDeleteReportToDatabase(id) {
    try {
      const baseUrl = this.getApiBaseUrl();
      await fetch(`${baseUrl}/api/reports/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch (err) {}
  },

  async syncDeleteIssueToDatabase(reportId, issueId) {
    try {
      const baseUrl = this.getApiBaseUrl();
      const url = `${baseUrl}/api/issues/${encodeURIComponent(issueId)}` + (reportId ? `?reportId=${encodeURIComponent(reportId)}` : '');
      await fetch(url, { method: 'DELETE' });
    } catch (err) {}
  },

  async syncDeletedTombstoneToDatabase(type, recordId) {
    try {
      const baseUrl = this.getApiBaseUrl();
      await fetch(`${baseUrl}/api/deleted-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, recordId })
      });
    } catch (err) {}
  },

  async syncUsersFromDatabase() {
    try {
      const baseUrl = this.getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/users`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users) && data.users.length > 0) {
          this.setDbOnline(true);
          const userMap = new Map();
          // Server database is the authority for registered users
          data.users.forEach(u => {
            if (u && u.username) {
              userMap.set(u.username.toLowerCase(), u);
            }
          });
          // Guarantee core admin accounts exist
          INITIAL_USERS.forEach(initU => {
            const key = initU.username.toLowerCase();
            if (!userMap.has(key)) {
              userMap.set(key, initU);
            }
          });
          const merged = Array.from(userMap.values());
          this.saveUsers(merged);
          return merged;
        }
      }
    } catch (err) {}
    return null;
  },

  async syncUserToDatabase(user) {
    if (!user || !user.username) return null;
    try {
      const baseUrl = this.getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (res.ok) {
        const data = await res.json();
        this.setDbOnline(true);
        return data;
      }
    } catch (err) {}
    return null;
  },

  async syncDeleteUserToDatabase(id) {
    if (!id) return;
    try {
      const baseUrl = this.getApiBaseUrl();
      await fetch(`${baseUrl}/api/users/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch (err) {}
  },

  async syncReportsFromDatabase() {
    try {
      const baseUrl = this.getApiBaseUrl();
      // 1. Fetch tombstones from database first to ensure local tombstones are up-to-date
      try {
        const tombRes = await fetch(`${baseUrl}/api/deleted-records`);
        if (tombRes.ok) {
          const tombData = await tombRes.json();
          if (tombData && Array.isArray(tombData.reports)) {
            tombData.reports.forEach(id => this.addDeletedReportId(id, false));
          }
          if (tombData && Array.isArray(tombData.issues)) {
            tombData.issues.forEach(id => this.addDeletedIssueId(id, false));
          }
        }
      } catch (tombErr) {}

      // 2. Fetch reports from database
      const res = await fetch(`${baseUrl}/api/reports`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.reports)) {
          this.setDbOnline(true);
          const merged = this.mergeRemoteReports(data.reports);
          return merged || data.reports;
        }
      }
    } catch (err) {
      this.setDbOnline(false);
    }
    return null;
  },

  mergeRemoteReports(remoteReports) {
    if (!Array.isArray(remoteReports)) return this.getReports();
    const deletedReportIds = this.getDeletedReportIds();
    const deletedIssueIds = this.getDeletedIssueIds();
    const localReports = this.getReports();
    const map = new Map();
    const remoteIdSet = new Set();

    const cleanReportIssues = (rep) => {
      if (!rep) return rep;
      if (Array.isArray(rep.issues)) {
        rep.issues = rep.issues.filter((iss, idx) => {
          const iId = String(iss.id || '').trim();
          const synId = `iss_${rep.id}_${idx}`;
          const iText = String(iss.issue || '').trim();
          return !deletedIssueIds.has(iId) && !deletedIssueIds.has(synId) && !deletedIssueIds.has(iText);
        });
      }
      if (deletedIssueIds.has(`iss_unresolved_${rep.id}`) || (rep.unresolvedIssues && deletedIssueIds.has(String(rep.unresolvedIssues).trim()))) {
        rep.unresolvedIssues = '';
      }
      return rep;
    };

    // 1. Remote reports from Cloudflare D1 are authoritative
    remoteReports.forEach(r => {
      if (r && r.id) {
        const idStr = String(r.id);
        remoteIdSet.add(idStr);
        if (!deletedReportIds.has(idStr)) {
          map.set(idStr, cleanReportIssues(r));
        }
      }
    });

    // 2. Check local reports: Discard fake seed reports ('report_init_...'),
    // and keep only genuine offline user-created reports not yet on server
    const unSyncedOfflineReports = [];
    localReports.forEach(r => {
      if (!r || !r.id) return;
      const idStr = String(r.id);
      if (idStr.startsWith('report_init_') || deletedReportIds.has(idStr)) {
        return;
      }
      if (!remoteIdSet.has(idStr)) {
        map.set(idStr, cleanReportIssues(r));
        unSyncedOfflineReports.push(r);
      }
    });

    const merged = Array.from(map.values()).sort((a, b) => {
      return (new Date(b.date || 0)) - (new Date(a.date || 0));
    });

    this.saveReports(merged);

    // Auto-sync any genuine offline reports up to the Cloudflare D1 database
    if (unSyncedOfflineReports.length > 0) {
      unSyncedOfflineReports.forEach(offRep => {
        this.syncReportToDatabase(offRep);
      });
    }

    return merged;
  },

  clearAllReports() {
    let reports = this.getReports();
    reports.forEach(r => {
      if (r && r.id) this.addDeletedReportId(r.id);
    });
    this.saveReports([]);
    try {
      localStorage.removeItem('bs_express_branch_issues');
      localStorage.removeItem('bs_express_current_draft');
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('bs_express_draft_')) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {}
    return true;
  },

  exportAllAsJson() {
    const reports = this.getReports();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reports, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `BS_Express_Reports_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  // =========================================================================
  // ISSUE & MORNING BRANCH ROW MANAGEMENT
  // =========================================================================
  getIssues() {
    try {
      const raw = localStorage.getItem('bs_express_branch_issues');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  saveIssues(issues) {
    try {
      localStorage.setItem('bs_express_branch_issues', JSON.stringify(issues));
      return true;
    } catch (e) {
      return false;
    }
  },

  addIssue(issue) {
    const issues = this.getIssues();
    const newIssue = {
      id: 'issue_' + Date.now(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      ...issue
    };
    issues.unshift(newIssue);
    this.saveIssues(issues);
    return newIssue;
  },

  updateIssue(id, updates) {
    const issues = this.getIssues();
    const idx = issues.findIndex(i => i.id === id);
    if (idx >= 0) {
      issues[idx] = { ...issues[idx], ...updates, updatedAt: new Date().toISOString() };
      this.saveIssues(issues);
      return issues[idx];
    }
    return null;
  },

  deleteIssue(reportIdOrIssueId, issueId) {
    const targetIssueId = String(issueId || reportIdOrIssueId || '').trim();
    const targetReportId = issueId ? String(reportIdOrIssueId || '').trim() : '';
    if (!targetIssueId && !targetReportId) return false;

    // 1. Tombstone the issue ID(s)
    if (targetIssueId) {
      this.addDeletedIssueId(targetIssueId);
    }
    if (targetReportId && targetIssueId.startsWith('iss_unresolved_')) {
      this.addDeletedIssueId(`iss_unresolved_${targetReportId}`);
    }

    let updated = false;

    // 2. Scan and update all reports in localStorage
    let reports = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      reports = raw ? JSON.parse(raw) : [];
    } catch (e) {
      reports = [];
    }

    reports.forEach(rep => {
      if (!rep) return;
      const isTargetReport = targetReportId ? String(rep.id) === targetReportId : false;
      let repChanged = false;

      // Process if this is the target report or if searching across all reports
      if (isTargetReport || !targetReportId) {
        // Check rep.issues array
        if (Array.isArray(rep.issues)) {
          const beforeLen = rep.issues.length;

          // Match by id, synthetic id, or issue text
          const matched = rep.issues.filter((iss, idx) => {
            const iId = String(iss.id || '');
            const synId = `iss_${rep.id}_${idx}`;
            const iText = String(iss.issue || '').trim();
            return iId === targetIssueId || synId === targetIssueId || iText === targetIssueId;
          });

          matched.forEach(m => {
            if (m.id) this.addDeletedIssueId(String(m.id));
            if (m.issue) this.addDeletedIssueId(String(m.issue).trim());
          });

          rep.issues = rep.issues.filter((iss, idx) => {
            const iId = String(iss.id || '');
            const synId = `iss_${rep.id}_${idx}`;
            const iText = String(iss.issue || '').trim();
            return iId !== targetIssueId && synId !== targetIssueId && iText !== targetIssueId;
          });

          if (rep.issues.length !== beforeLen) {
            repChanged = true;
          }
        }

        // Check unresolvedIssues fallback text
        const isFallbackTarget = targetIssueId === `iss_unresolved_${rep.id}` || 
          (rep.unresolvedIssues && String(rep.unresolvedIssues).trim() === targetIssueId);

        if (isFallbackTarget) {
          rep.unresolvedIssues = '';
          repChanged = true;
        } else if (repChanged) {
          // Issues array was modified: recalculate unresolvedIssues so it doesn't resurrect deleted issues!
          const remainingIncomplete = (rep.issues || []).filter(i => i && i.status === 'incomplete' && i.issue);
          if (remainingIncomplete.length === 0) {
            rep.unresolvedIssues = '';
          } else {
            rep.unresolvedIssues = remainingIncomplete.map(i => i.note ? `${i.issue} (Note: ${i.note})` : i.issue).join('\n');
          }
        }

        // Clean up issue comments if matching this issue
        if (Array.isArray(rep.issueComments)) {
          const beforeComm = rep.issueComments.length;
          rep.issueComments = rep.issueComments.filter(c => c && c.issueId !== targetIssueId);
          if (rep.issueComments.length !== beforeComm) repChanged = true;
        }

        if (repChanged) {
          updated = true;
        }
      }
    });

    if (updated) {
      this.saveReports(reports);
      // Sync each changed report to MySQL database
      reports.forEach(rep => {
        if (targetReportId ? String(rep.id) === targetReportId : true) {
          this.syncReportToDatabase(rep);
        }
      });
      this.syncDeleteIssueToDatabase(targetReportId, targetIssueId);
    }

    // 3. Clean standalone branch issues in bs_express_branch_issues
    let issues = this.getIssues();
    const initLen = issues.length;
    issues = issues.filter(i => {
      const iId = String(i.id || '');
      const rId = String(i.reportId || '');
      const iText = String(i.issue || '').trim();
      if (iId === targetIssueId || iText === targetIssueId) return false;
      if (targetReportId && rId === targetReportId && (iId === targetIssueId || iText === targetIssueId)) return false;
      return true;
    });
    if (issues.length !== initLen) {
      this.saveIssues(issues);
      updated = true;
    }

    return true;
  },

  updateIssueStatus(reportId, issueId, newStatus) {
    let updated = false;
    const targetIssueId = String(issueId || '').trim();
    const targetReportId = String(reportId || '').trim();

    // 1. Update in reports
    const reports = this.getReports();
    const rep = reports.find(r => String(r.id) === targetReportId);
    if (rep) {
      rep.issues = Array.isArray(rep.issues) ? rep.issues : [];

      // Check if matching issue is in rep.issues
      let targetIssue = rep.issues.find((iss, idx) => {
        return String(iss.id || '') === targetIssueId || 
               `iss_${rep.id}_${idx}` === targetIssueId || 
               String(iss.issue || '').trim() === targetIssueId;
      });

      if (targetIssue) {
        targetIssue.status = newStatus;
        updated = true;
      } else if (targetIssueId === `iss_unresolved_${rep.id}`) {
        // Was a fallback issue from unresolvedIssues text
        const text = rep.unresolvedIssues && rep.unresolvedIssues.trim() ? rep.unresolvedIssues.trim() : 'បញ្ហា';
        targetIssue = {
          id: targetIssueId,
          issue: text,
          status: newStatus,
          note: newStatus === 'complete' ? 'ដោះស្រាយរួចរាល់' : 'ត្រូវធ្វើនៅថ្ងៃស្អែក'
        };
        rep.issues.push(targetIssue);
        updated = true;
      }

      if (updated) {
        // Recalculate unresolvedIssues from incomplete issues
        const remainingIncomplete = rep.issues.filter(i => i && i.status !== 'complete' && i.status !== 'completed' && i.issue);
        if (remainingIncomplete.length === 0) {
          rep.unresolvedIssues = '';
        } else {
          rep.unresolvedIssues = remainingIncomplete.map(i => i.note ? `${i.issue} (Note: ${i.note})` : i.issue).join('\n');
        }
        this.saveReport(rep);
      }
    }

    // 2. Update in standalone branch issues table if present
    const issues = this.getIssues();
    const iss = issues.find(i => String(i.id) === targetIssueId || (String(i.reportId) === targetReportId && (String(i.issue || '').trim() === targetIssueId || String(i.id) === targetIssueId)));
    if (iss) {
      iss.status = newStatus;
      this.saveIssues(issues);
      updated = true;
    }

    return updated;
  },

  approveReport(id, approver) {
    const reports = this.getReports();
    const idx = reports.findIndex(r => r.id === id);
    if (idx !== -1) {
      reports[idx].approvalStatus = 'approved';
      reports[idx].approvedBy = approver?.fullName || approver?.username || 'Top Management';
      reports[idx].approvedRole = approver?.role || 'គណៈគ្រប់គ្រងជាន់ខ្ពស់ (Top Management)';
      reports[idx].approvedAt = new Date().toISOString();
      this.saveReports(reports);
      return reports[idx];
    }
    return null;
  },

  unapproveReport(id) {
    const reports = this.getReports();
    const idx = reports.findIndex(r => r.id === id);
    if (idx !== -1) {
      reports[idx].approvalStatus = 'pending';
      reports[idx].approvedBy = null;
      reports[idx].approvedRole = null;
      reports[idx].approvedAt = null;
      this.saveReports(reports);
      return reports[idx];
    }
    return null;
  },

  toggleReportApproval(id, approver) {
    const reports = this.getReports();
    const rep = reports.find(r => r.id === id);
    if (rep) {
      if (rep.approvalStatus === 'approved') {
        return this.unapproveReport(id);
      } else {
        return this.approveReport(id, approver);
      }
    }
    return null;
  },

  getMorningBranches() {
    try {
      const raw = localStorage.getItem('bs_express_morning_branches');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  saveMorningBranches(branches) {
    try {
      localStorage.setItem('bs_express_morning_branches', JSON.stringify(branches));
      return true;
    } catch (e) {
      return false;
    }
  },

  addMorningBranch(item) {
    const list = this.getMorningBranches();
    const newItem = {
      id: 'mb_' + Date.now(),
      createdAt: new Date().toISOString(),
      ...item
    };
    list.unshift(newItem);
    this.saveMorningBranches(list);
    return newItem;
  },

  updateMorningBranch(id, updates) {
    const list = this.getMorningBranches();
    const idx = list.findIndex(b => b.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
      this.saveMorningBranches(list);
      return list[idx];
    }
    return null;
  },

  deleteMorningBranch(id) {
    let list = this.getMorningBranches();
    list = list.filter(b => b.id !== id);
    this.saveMorningBranches(list);
    return list;
  },

  saveMorningBranchRow(date, branch, rowData) {
    const list = this.getMorningBranches();
    const existingIdx = list.findIndex(b => b.branch === branch && (b.date === date || b.dateDisplay === date));
    const entry = {
      id: existingIdx >= 0 ? list[existingIdx].id : 'mb_' + Date.now(),
      branch,
      date,
      ...rowData,
      updatedAt: new Date().toISOString()
    };
    if (existingIdx >= 0) {
      list[existingIdx] = entry;
    } else {
      list.unshift(entry);
    }
    this.saveMorningBranches(list);
    return entry;
  },

  // =========================================================================
  // DRAFT AUTO-SAVE & MERGE IMPORT UTILITIES
  // =========================================================================
  getDraftKey(branchOrUser) {
    const user = this.getCurrentUser();
    const target = branchOrUser || user?.branch || user?.username;
    if (!target) return 'bs_express_current_draft';
    const clean = String(target).trim().replace(/[\s()]+/g, '_').toLowerCase();
    return `bs_express_draft_${clean}`;
  },

  getDraft(branchOrUser) {
    try {
      const key = this.getDraftKey(branchOrUser);
      const raw = localStorage.getItem(key) || localStorage.getItem('bs_express_current_draft');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  saveDraft(draftData, branchOrUser) {
    try {
      const key = this.getDraftKey(branchOrUser || draftData?.branch);
      if (!draftData) {
        localStorage.removeItem(key);
        localStorage.removeItem('bs_express_current_draft');
      } else {
        localStorage.setItem(key, JSON.stringify({
          ...draftData,
          _savedAt: new Date().toISOString()
        }));
      }
      return true;
    } catch (e) {
      console.warn('LocalStorage quota limit reached in saveDraft. Storing lightweight draft...', e);
      try {
        const key = this.getDraftKey(branchOrUser || draftData?.branch);
        // Fallback: keep all form fields intact, store latest 10 photos in draft
        const safeDraft = {
          ...draftData,
          openingPhotos: (draftData.openingPhotos || []).slice(-10),
          closingPhotos: (draftData.closingPhotos || []).slice(-10),
          _savedAt: new Date().toISOString()
        };
        localStorage.setItem(key, JSON.stringify(safeDraft));
        return true;
      } catch (e2) {
        return false;
      }
    }
  },

  clearDraft(branchOrUser) {
    try {
      const key = this.getDraftKey(branchOrUser);
      localStorage.removeItem(key);
      localStorage.removeItem('bs_express_current_draft');
      return true;
    } catch (e) {
      return false;
    }
  },

  mergeImportedReports(importedList) {
    if (!Array.isArray(importedList)) return false;
    const current = this.getReports();
    const map = new Map();
    // Add existing
    current.forEach(r => { if (r && r.id) map.set(r.id, r); });
    // Merge or add imported
    let addedCount = 0;
    importedList.forEach(r => {
      if (r && r.id) {
        map.set(r.id, r);
        addedCount++;
      } else if (r) {
        const id = 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        map.set(id, { ...r, id });
        addedCount++;
      }
    });
    const merged = Array.from(map.values()).sort((a, b) => {
      const tA = new Date(a.createdAt || a.date).getTime();
      const tB = new Date(b.createdAt || b.date).getTime();
      return tB - tA;
    });
    this.saveReports(merged);
    return { success: true, count: merged.length, added: addedCount };
  },

  importFromJson(jsonData) {
    try {
      const parsed = JSON.parse(jsonData);
      if (Array.isArray(parsed)) {
        this.saveReports(parsed);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to parse import JSON:', e);
      return false;
    }
  },

  // =========================================================================
  // USER AUTHENTICATION & ROLE MANAGEMENT
  // =========================================================================
  getUsers() {
    const raw = localStorage.getItem('bs_express_users');
    if (!raw) {
      this.saveUsers(INITIAL_USERS);
      return INITIAL_USERS;
    }
    try {
      let parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.saveUsers(INITIAL_USERS);
        return INITIAL_USERS;
      }
      
      // Remove old dummy demo users
      const dummyUsernames = ['kratie_mgr', 'phnompenh_mgr', 'staff_sr'];
      parsed = parsed.filter(u => !dummyUsernames.includes((u.username || '').toLowerCase()));

      // 1. Ensure 'admin' always exists as System Administrator
      const adminIdx = parsed.findIndex(u => (u.username || '').toLowerCase() === 'admin');
      if (adminIdx === -1) {
        parsed.unshift(INITIAL_USERS[0]);
      } else {
        parsed[adminIdx].role = 'អ្នកគ្រប់គ្រងប្រព័ន្ធ';
        parsed[adminIdx].roleId = 'sys_admin';
        parsed[adminIdx].fullName = parsed[adminIdx].fullName || 'System Administrator';
        if (!parsed[adminIdx].password) parsed[adminIdx].password = '123';
      }

      // 2. Ensure 'Rithjengdavid' always exists as System Administrator
      const rithIdx = parsed.findIndex(u => (u.username || '').toLowerCase() === 'rithjengdavid');
      if (rithIdx === -1) {
        parsed.push(INITIAL_USERS[1]);
      } else {
        parsed[rithIdx].role = 'អ្នកគ្រប់គ្រងប្រព័ន្ធ';
        parsed[rithIdx].roleId = 'sys_admin';
        parsed[rithIdx].fullName = 'Rith Jeng David';
        if (!parsed[rithIdx].password) parsed[rithIdx].password = '123';
      }

      // 3. Ensure 'vid' exists as System Administrator
      const vidIdx = parsed.findIndex(u => (u.username || '').toLowerCase() === 'vid');
      if (vidIdx === -1) {
        parsed.push({
          id: 'user_vid',
          username: 'vid',
          password: '123',
          fullName: 'Vid (System Admin)',
          role: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ',
          roleId: 'sys_admin',
          branch: 'ការិយាល័យកណ្តាល',
          phone: '010 888 999',
          createdAt: '2026-08-01T08:00:00.000Z'
        });
      } else {
        parsed[vidIdx].role = 'អ្នកគ្រប់គ្រងប្រព័ន្ធ';
        parsed[vidIdx].roleId = 'sys_admin';
        parsed[vidIdx].fullName = parsed[vidIdx].fullName || 'Vid (System Admin)';
        if (!parsed[vidIdx].password) parsed[vidIdx].password = '123';
      }

      // 4. Ensure 'sysadmin' exists
      const sysIdx = parsed.findIndex(u => (u.username || '').toLowerCase() === 'sysadmin');
      if (sysIdx === -1) {
        parsed.push({
          id: 'user_sysadmin',
          username: 'sysadmin',
          password: '123',
          fullName: 'System Administrator',
          role: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ',
          roleId: 'sys_admin',
          branch: 'ការិយាល័យកណ្តាល',
          phone: '010 888 999',
          createdAt: '2026-08-01T08:00:00.000Z'
        });
      }

      this.saveUsers(parsed);
      return parsed;
    } catch (e) {
      return INITIAL_USERS;
    }
  },

  saveUsers(users) {
    try {
      localStorage.setItem('bs_express_users', JSON.stringify(users));
      return true;
    } catch (e) {
      console.error('Error saving users to localStorage:', e);
      return false;
    }
  },

  findUserByUsername(username) {
    const users = this.getUsers();
    return users.find(u => u.username.toLowerCase() === username.trim().toLowerCase()) || null;
  },

  async registerUser({ username, password, fullName, role, branch, phone = '' }) {
    const users = this.getUsers();
    const cleanUsername = username.trim();
    
    if (this.findUserByUsername(cleanUsername)) {
      return { success: false, error: 'ឈ្មោះគណនី (Username) នេះមានក្នុងប្រព័ន្ធរួចហើយ!' };
    }

    const newUser = {
      id: 'user_' + Date.now(),
      username: cleanUsername,
      password: password,
      fullName: fullName.trim(),
      role: role || 'បុគ្គលិកប្រតិបត្តិការ',
      branch: branch || 'ក្រចេះ',
      phone: phone.trim(),
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);
    await this.syncUserToDatabase(newUser);
    return { success: true, user: newUser };
  },

  authenticateUser(username, password) {
    const cleanUsername = username.trim();
    const user = this.findUserByUsername(cleanUsername);
    
    // Master admin password fallback support (e.g. 123 or admin)
    const lowerUser = cleanUsername.toLowerCase();
    const isAdminAccount = lowerUser === 'admin' || lowerUser === 'sysadmin' || lowerUser === 'rithjengdavid' || lowerUser === 'vid' || lowerUser === 'vif';
    const isMasterPassword = isAdminAccount && (password === '123' || password === 'admin' || password === 'admin123' || password === '123456');

    if (!user) {
      if (isAdminAccount && isMasterPassword) {
        const seedUser = INITIAL_USERS.find(u => u.username.toLowerCase() === lowerUser) || {
          id: 'user_' + lowerUser,
          username: lowerUser,
          password: '123',
          fullName: lowerUser === 'vid' ? 'Vid (System Admin)' : 'System Administrator',
          role: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)',
          roleId: 'sys_admin',
          branch: 'ការិយាល័យកណ្ដាល'
        };
        const users = this.getUsers();
        users.push(seedUser);
        this.saveUsers(users);
        return { success: true, user: seedUser };
      }
      return { success: false, error: 'រកមិនឃើញឈ្មោះគណនីនេះទេ!' };
    }

    if (user.password !== password && !isMasterPassword) {
      return { success: false, error: 'លេខសម្ងាត់ (Password) មិនត្រឹមត្រូវទេ!' };
    }
    return { success: true, user };
  },

  async authenticateUserAsync(username, password) {
    let res = this.authenticateUser(username, password);
    if (res.success) return res;

    // If local check failed, attempt remote sync from D1 database in case user was registered on another browser/device
    try {
      await this.syncUsersFromDatabase();
      res = this.authenticateUser(username, password);
      if (res.success) return res;
    } catch (e) {}

    return res;
  },

  deleteUser(id) {
    let users = this.getUsers();
    const beforeLen = users.length;
    const protectedUsernames = ['admin', 'sysadmin', 'rithjengdavid', 'vid', 'vif'];
    users = users.filter(u => u.id !== id && !protectedUsernames.includes((u.username || '').toLowerCase()));
    if (users.length !== beforeLen) {
      this.saveUsers(users);
      this.syncDeleteUserToDatabase(id);
      return true;
    }
    return false;
  },

  updateUserPassword(username, newPassword) {
    const users = this.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (user) {
      user.password = newPassword;
      this.saveUsers(users);
      this.syncUserToDatabase(user);
      return true;
    }
    return false;
  },

  async updateUserRole(userIdOrUsername, newRole) {
    if (!userIdOrUsername || !newRole) {
      return { success: false, error: 'User and role are required' };
    }
    const cleanRole = String(newRole).trim();
    if (!cleanRole) {
      return { success: false, error: 'Role cannot be empty' };
    }

    const users = this.getUsers();
    const target = String(userIdOrUsername).trim().toLowerCase();
    const user = users.find(u => (u.id && String(u.id).toLowerCase() === target) || (u.username && u.username.toLowerCase() === target));
    
    if (!user) {
      return { success: false, error: 'រកមិនឃើញគណនីអ្នកប្រើប្រាស់នេះទេ!' };
    }

    // Protect master admin accounts from being demoted accidentally
    const protectedUsernames = ['admin', 'sysadmin', 'rithjengdavid', 'vid', 'vif'];
    if (protectedUsernames.includes(user.username.toLowerCase()) && !cleanRole.toLowerCase().includes('admin') && !cleanRole.toLowerCase().includes('top management') && !cleanRole.toLowerCase().includes('អ្នកគ្រប់គ្រង') && !cleanRole.toLowerCase().includes('នាយកដ្ឋាន')) {
      return { success: false, error: 'មិនអាចផ្លាស់ប្តូរតួនាទីគណនី Master Admin ទៅជាបុគ្គលិកធម្មតាបានទេ!' };
    }

    user.role = cleanRole;
    this.saveUsers(users);

    // Sync to remote database (MySQL and Cloudflare D1)
    await this.syncUserToDatabase(user);

    // If updating currently logged in user session, refresh session
    const cur = this.getCurrentUser();
    if (cur && (cur.id === user.id || (cur.username && cur.username.toLowerCase() === user.username.toLowerCase()))) {
      cur.role = cleanRole;
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem('bs_express_session', JSON.stringify(cur));
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('bs_express_session', JSON.stringify(cur));
      } catch (e) {}
    }

    return { success: true, user };
  },

  getCurrentUser() {
    const raw = (typeof localStorage !== 'undefined' ? localStorage.getItem('bs_express_session') : null) ||
                (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bs_express_session') : null);
    if (!raw) return null;
    try {
      const user = JSON.parse(raw);
      if (user && user.username) {
        // Validate against registered users
        const existing = this.findUserByUsername(user.username);
        if (!existing) {
          this.logout();
          return null;
        }
        const u = user.username.toLowerCase();
        if (u === 'rithjengdavid' || u === 'admin' || u === 'sysadmin') {
          user.role = 'អ្នកគ្រប់គ្រងប្រព័ន្ធ';
          user.roleId = 'sys_admin';
          if (u === 'rithjengdavid' && (!user.fullName || user.fullName === 'System Administrator')) {
            user.fullName = 'Rith Jeng David';
          }
        }
        return user;
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user, remember = true) {
    try {
      if (!user) {
        if (typeof localStorage !== 'undefined') localStorage.removeItem('bs_express_session');
        if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('bs_express_session');
      } else {
        if (remember) {
          if (typeof localStorage !== 'undefined') localStorage.setItem('bs_express_session', JSON.stringify(user));
          if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('bs_express_session');
        } else {
          if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('bs_express_session', JSON.stringify(user));
          if (typeof localStorage !== 'undefined') localStorage.removeItem('bs_express_session');
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  logout() {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('bs_express_session');
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('bs_express_session');
  },

  // =========================================================================
  // MULTI-SYSTEM PORTAL & FIX ASSET INTEGRATION
  // =========================================================================
  getFixAssetUrl() {
    try {
      if (typeof localStorage === 'undefined') return 'http://localhost:8000';
      const stored = localStorage.getItem('bs_express_fixasset_url');
      if (stored && stored.trim()) return stored.trim();
    } catch (e) {}
    return 'http://localhost:8000';
  },

  setFixAssetUrl(url) {
    try {
      if (typeof localStorage === 'undefined') return;
      if (!url || !url.trim()) {
        localStorage.removeItem('bs_express_fixasset_url');
      } else {
        localStorage.setItem('bs_express_fixasset_url', url.trim());
      }
    } catch (e) {}
  },

  getActiveSystem() {
    try {
      if (typeof localStorage === 'undefined') return 'portal';
      return localStorage.getItem('bs_express_active_system') || 'portal';
    } catch (e) {
      return 'portal';
    }
  },

  setActiveSystem(sys) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem('bs_express_active_system', sys || 'portal');
    } catch (e) {}
  }
};

if (typeof window !== 'undefined') {
  window.Storage = Storage;
  window.SAMPLE_REPORT = SAMPLE_REPORT;
  window.BRANCH_LIST = BRANCH_LIST;
  window.BRANCH_LIST_EN = BRANCH_LIST_EN;
  window.USER_ROLES = USER_ROLES;
  window.INITIAL_USERS = INITIAL_USERS;
}
