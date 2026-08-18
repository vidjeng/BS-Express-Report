/**
 * BS Express Daily Report System - Storage Module
 * Manages LocalStorage, Sample Data seeding, and CRUD operations
 */

const STORAGE_KEY = 'bs_express_daily_reports';
const SETTINGS_KEY = 'bs_express_settings';

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
  absentCount: 'Day Off 1នាក់',
  cleanlinessStatus: 'ស្ថានភាពអនាម័យ និងភាពរៀបរយក្នុង-ក្រៅសាខា',
  openingPhotos: [],

  // Section 2: Daily Operation
  workStatus: 'បញ្ញើរអីវ៉ាន់ សម្រាប់ភ្ញៀវVIPនិងកំពុងស្វែងរកភ្ញៀវបន្ថែម',
  operationChallenges: 'អីវ៉ាន់ដឹកអត់ដល់ កង់បីអស់ថ្ម អីវ៉ាន់ខ្លះសល់ទុកដឹកស្អែកសម្រួលជាមួយភ្ញៀវដឹកជូនថ្ងៃស្អែក',

  // Section 3: Closing Shift
  accomplishedTasks: 'ដោះស្រាយអីវ៉ាន់ដែលដឹកអត់ដល់និងសម្រួលដឹកអីវ៉ាន់ដែលជាប់ខូច',
  unresolvedIssues: 'អីវ៉ាន់ដឹកអត់ដល់ទុកដឹកស្អែក',
  packageSecurity: 'អីវ៉ាន់ដែលនៅសល់ទុកដាក់នៅកន្លែងមានផាសុខភាពនិងមិនសើម',
  closingTime: '11:00Pm',
  closingPhotos: [],

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

const BRANCH_LIST = [
  'ក្រចេះ',
  'ភ្នំពេញ (ដូនពេញ)',
  'ភ្នំពេញ (ទួលគោក)',
  'ភ្នំពេញ (មានជ័យ)',
  'សៀមរាប',
  'បាត់ដំបង',
  'កំពង់ចាម',
  'ព្រះសីហនុ',
  'កំពត',
  'បន្ទាយមានជ័យ (ប៉ោយប៉ែត)',
  'ស្វាយរៀង (បាវិត)',
  'តាកែវ',
  'កំពង់ធំ',
  'ពោធិ៍សាត់',
  'កណ្តាល (តាខ្មៅ)'
];

const Storage = {
  getReports() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        this.saveReports(INITIAL_REPORTS);
        return INITIAL_REPORTS;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error loading reports from localStorage:', e);
      return INITIAL_REPORTS;
    }
  },

  saveReports(reports) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
      return true;
    } catch (e) {
      console.error('Error saving reports to localStorage:', e);
      return false;
    }
  },

  saveReport(report) {
    const reports = this.getReports();
    const existingIndex = reports.findIndex(r => r.id === report.id);

    if (existingIndex >= 0) {
      reports[existingIndex] = { ...report, updatedAt: new Date().toISOString() };
    } else {
      reports.unshift({ ...report, id: report.id || 'report_' + Date.now(), createdAt: new Date().toISOString() });
    }

    this.saveReports(reports);
    return report;
  },

  getReportById(id) {
    const reports = this.getReports();
    return reports.find(r => r.id === id) || null;
  },

  deleteReport(id) {
    let reports = this.getReports();
    reports = reports.filter(r => r.id !== id);
    this.saveReports(reports);
    return reports;
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
      const dummyUsernames = ['kratie_mgr', 'phnompenh_mgr', 'staff_sr', 'admin', 'sysadmin'];
      parsed = parsed.filter(u => !dummyUsernames.includes((u.username || '').toLowerCase()));

      // Ensure Rithjengdavid always exists as System Administrator
      const rithIdx = parsed.findIndex(u => (u.username || '').toLowerCase() === 'rithjengdavid');
      if (rithIdx === -1) {
        parsed.unshift(INITIAL_USERS[0]);
      } else {
        parsed[rithIdx].role = 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (System Administrator)';
        parsed[rithIdx].roleId = 'sys_admin';
        parsed[rithIdx].fullName = 'Rith Jeng David';
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

  registerUser({ username, password, fullName, role, branch, phone = '' }) {
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
    return { success: true, user: newUser };
  },

  authenticateUser(username, password) {
    const cleanUsername = username.trim();
    const user = this.findUserByUsername(cleanUsername);
    if (!user) {
      return { success: false, error: 'រកមិនឃើញឈ្មោះគណនីនេះទេ!' };
    }
    if (user.password !== password) {
      return { success: false, error: 'លេខសម្ងាត់ (Password) មិនត្រឹមត្រូវទេ!' };
    }
    return { success: true, user };
  },

  deleteUser(id) {
    let users = this.getUsers();
    const beforeLen = users.length;
    users = users.filter(u => u.id !== id && (u.username || '').toLowerCase() !== 'rithjengdavid');
    if (users.length !== beforeLen) {
      this.saveUsers(users);
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
      return true;
    }
    return false;
  },

  getCurrentUser() {
    const raw = localStorage.getItem('bs_express_session');
    if (!raw) return null;
    try {
      const user = JSON.parse(raw);
      if (user && user.username) {
        const u = user.username.toLowerCase();
        if (u === 'rithjengdavid' || u === 'admin' || u === 'sysadmin') {
          user.role = 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (System Administrator)';
          user.roleId = 'sys_admin';
          if (u === 'rithjengdavid' && (!user.fullName || user.fullName === 'System Administrator')) {
            user.fullName = 'Rith Jeng David';
          }
        }
      }
      return user;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    try {
      if (!user) {
        localStorage.removeItem('bs_express_session');
      } else {
        localStorage.setItem('bs_express_session', JSON.stringify(user));
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  logout() {
    localStorage.removeItem('bs_express_session');
  }
};

const USER_ROLES = [
  { id: 'sys_admin', nameKm: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (System Administrator)', nameEn: 'System Administrator', badgeColor: 'purple' },
  { id: 'ops_department', nameKm: 'នាយកដ្ឋានប្រតិបត្តិការ (Admin)', nameEn: 'Operations Department (Admin)', badgeColor: 'red' },
  { id: 'branch_manager', nameKm: 'ប្រធានសាខា', nameEn: 'Branch Manager', badgeColor: 'blue' },
  { id: 'deputy_manager', nameKm: 'អនុប្រធានសាខា', nameEn: 'Deputy Branch Manager', badgeColor: 'cyan' },
  { id: 'operations_staff', nameKm: 'បុគ្គលិកប្រតិបត្តិការ', nameEn: 'Operations Staff', badgeColor: 'amber' },
  { id: 'customer_service', nameKm: 'ផ្នែកសេវាអតិថិជន', nameEn: 'Customer Service', badgeColor: 'emerald' }
];

const INITIAL_USERS = [
  {
    id: 'user_rithjengdavid',
    username: 'Rithjengdavid',
    password: '123',
    fullName: 'Rith Jeng David',
    role: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (System Administrator)',
    roleId: 'sys_admin',
    branch: 'ការិយាល័យកណ្តាល (HQ)',
    phone: '010 888 999',
    createdAt: '2026-08-01T08:00:00.000Z'
  }
];

if (typeof window !== 'undefined') {
  window.Storage = Storage;
  window.SAMPLE_REPORT = SAMPLE_REPORT;
  window.BRANCH_LIST = BRANCH_LIST;
  window.USER_ROLES = USER_ROLES;
  window.INITIAL_USERS = INITIAL_USERS;
}
