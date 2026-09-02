/**
 * Export & Sharing Utilities for BS Express Reports
 */

const ExportUtil = {
  /**
   * Generates formatted text tailored for Telegram/Messenger group reporting
   * @param {Object} report 
   * @returns {string}
   */
  formatForTelegram(report, lang = 'km') {
    const divider = '━━━━━━━━━━━━━━━━━━━━━━';
    const branchName = window.bsApp?.getDisplayBranch ? window.bsApp.getDisplayBranch(report.branch, lang) : (report.branch || '-');
    const cleanRole = roleName ? roleName.replace(/^\s*[\(（]\s*|\s*[\)）]\s*$/g, '').trim() : '';
    const roleSuffix = cleanRole ? ` (${cleanRole})` : '';

    const formatMultiBullet = (val, defaultBullet = '•') => {
      if (!val || !String(val).trim()) return '-';
      const lines = String(val).split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) return lines[0] || '-';
      return '\n' + lines.map(l => `  ${defaultBullet} ${l.replace(/^[•\-\*\d+\.]\s*/, '')}`).join('\n');
    };

    const formatIssuesForTelegram = (issues, legacyUnresolved) => {
      if (Array.isArray(issues) && issues.length > 0) {
        const lines = issues.filter(i => i.issue || i.status).map(i => {
          const st = i.status === 'complete' ? '✓' : '!';
          const note = i.note ? ` (${i.note})` : '';
          return `  ${st} ${i.issue}${note}`;
        });
        if (lines.length) return '\n' + lines.join('\n');
      }
      return formatMultiBullet(legacyUnresolved, '⚠️');
    };

    const presNum = report.presentCount !== undefined && report.presentCount !== null && String(report.presentCount).trim() !== ''
      ? String(report.presentCount).replace(/\D/g, '')
      : '0';
    const rawAbs = report.absentCount !== undefined && report.absentCount !== null ? String(report.absentCount).replace(/\D/g, '') : '';
    const absNum = rawAbs !== '' ? parseInt(rawAbs, 10) : 0;

    if (lang === 'en') {
      const enAttendance = `Present ${presNum || '0'} staff | Absent: ${absNum > 0 ? absNum + ' person' : '0'}`;
      return `🚚 *BS Express*
📋 *Branch Daily Work Report*
${divider}
🏢 *Branch:* ${branchName || '-'}
📅 *Date:* ${report.dateDisplay || report.date || '-'}
${divider}
🌅 *1. Opening Shift (6:00 AM)*
• Opening Reporter: ${(report.openingReporterName || report.reporterName || '-')}${roleSuffix}
• Opening Time: ${report.openingTime || '-'}
• Attendance: ${enAttendance}
• Cleanliness: ${report.cleanlinessStatus || '-'}

📦 *2. Daily Operation Report*
• Work Status: 
  👉 ${formatMultiBullet(report.workStatus, '👉')}
• Operational Challenges: 
  ⚠️ ${formatMultiBullet(report.operationChallenges, '⚠️')}

🌙 *3. Closing Shift (11:00 PM)*
• Closing Reporter: ${(report.closingReporterName || report.reporterName || '-')}${roleSuffix}
• Accomplished Tasks: 
  ✅ ${formatMultiBullet(report.accomplishedTasks, '✅')}
• Unresolved Issues: 
  ⚠️ ${formatIssuesForTelegram(report.issues, report.unresolvedIssues)}
• Security & Storage: 
  🔒 ${formatMultiBullet(report.packageSecurity, '🔒')}
• Closing Time: ${report.closingTime || '-'}
${divider}
📍 *HQ:* KL Plaza No.131, Bld C11-C12, St 154 x St 13, Phnom Penh`;
    }

    return `🚚 *ក្រុមហ៊ុនប៊ីអេស អិចប្រេស (BS Express)*
📋 *របាយការណ៍ការងារប្រចាំថ្ងៃតាមសាខា*
${divider}
🏢 *សាខា:* ${branchName || '-'}
📅 *កាលបរិច្ឆេទ:* ${report.dateDisplay || report.date || '-'}
${divider}
🌅 *១. របាយការណ៍ពេលបើកដំណើរការ*
• អ្នករាយការណ៍ពេលបើក: ${(report.openingReporterName || report.reporterName || '-')}${roleSuffix}
• ម៉ោងបើកសាខា: ${report.openingTime || '-'}
• វត្តមានបុគ្គលិក: វត្តមាន ${presNum || '0'} នាក់ | អវត្តមាន: ${absNum > 0 ? absNum + ' នាក់' : 'គ្មាន'}
• អនាម័យសាខា: ${report.cleanlinessStatus || '-'}

📦 *២. របាយការណ៍ប្រតិបត្តិការប្រចាំថ្ងៃ*
• ស្ថានភាពការងារ: 
  👉 ${formatMultiBullet(report.workStatus, '👉')}
• បញ្ហាប្រឈមប្រតិបត្តិការ: 
  ⚠️ ${formatMultiBullet(report.operationChallenges, '⚠️')}

🌙 *៣. របាយការណ៍ពេលបិទដំណើរការ*
• អ្នករាយការណ៍ពេលបិទ: ${(report.closingReporterName || report.reporterName || '-')}${roleSuffix}
• ការងារដែលបានសម្រេច: 
  ✅ ${formatMultiBullet(report.accomplishedTasks, '✅')}
• បញ្ហាមិនទាន់ដោះស្រាយ: 
  ⚠️ ${formatIssuesForTelegram(report.issues, report.unresolvedIssues)}
• សុវត្ថិភាពកញ្ចប់បញ្ញើ: 
  🔒 ${formatMultiBullet(report.packageSecurity, '🔒')}
• ម៉ោងបិទសាខា: ${report.closingTime || '-'}
${divider}
📍 *ទីស្នាក់ការកណ្តាល:* KL Plaza No.131, Bld C11-C12, St 154 x St 13, ភ្នំពេញ`;
  },

  /**
   * Exports list of reports to CSV
   * @param {Array} reports 
   */
  exportToCsv(reports, lang = window.bsApp?.currentLang || 'km') {
    if (!reports || !reports.length) return;

    const headers = lang === 'en' ? [
      'ID', 'Branch', 'Date', 'Reporter', 'Role',
      'Opening Time', 'Staff Present', 'Staff Absent', 'Cleanliness',
      'Work Status', 'Operational Challenges', 'Accomplished Tasks',
      'Unresolved Issues', 'Package Security', 'Closing Time'
    ] : [
      'ID', 'សាខា', 'កាលបរិច្ឆេទ', 'អ្នករាយការណ៍', 'តួនាទី',
      'ម៉ោងបើក', 'វត្តមាន', 'អវត្តមាន', 'អនាម័យ',
      'ស្ថានភាពការងារ', 'បញ្ហាប្រឈម', 'ការងារសម្រេច',
      'បញ្ហាមិនទាន់ដោះស្រាយ', 'សុវត្ថិភាពបញ្ញើ', 'ម៉ោងបិទ'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""').replace(/\n/g, ' ');
      return `"${clean}"`;
    };

    const rows = reports.map(r => [
      escapeCsv(r.id),
      escapeCsv(window.bsApp?.getDisplayBranch ? window.bsApp.getDisplayBranch(r.branch, lang) : r.branch),
      escapeCsv(r.dateDisplay || r.date),
      escapeCsv(r.reporterName),
      escapeCsv(window.bsApp?.getDisplayRole ? window.bsApp.getDisplayRole(r.position, lang) : r.position),
      escapeCsv(r.openingTime),
      escapeCsv(r.presentCount),
      escapeCsv(r.absentCount),
      escapeCsv(r.cleanlinessStatus),
      escapeCsv(r.workStatus),
      escapeCsv(r.operationChallenges),
      escapeCsv(r.accomplishedTasks),
      escapeCsv(r.unresolvedIssues),
      escapeCsv(r.packageSecurity),
      escapeCsv(r.closingTime)
    ].join(','));

    // UTF-8 BOM so Excel opens Khmer characters correctly
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BS_Express_Daily_Reports_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  /**
   * Generates formatted Telegram summary of all incomplete branch issues for operation channels
   * @param {Array} issues 
   * @param {string} lang 
   * @returns {string}
   */
  formatIncompleteIssuesForTelegram(issues, lang = 'km') {
    const divider = '━━━━━━━━━━━━━━━━━━━━━━';
    const pendingIssues = (issues || []).filter(i => i.status === 'incomplete');
    const branchCount = new Set(pendingIssues.map(i => i.branch).filter(Boolean)).size;
    const dateStr = new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'km-KH');

    if (lang === 'en') {
      let text = `🚨 *BS EXPRESS - BRANCH PENDING ISSUES MONITOR*\n`;
      text += `📅 *Date:* ${dateStr} | ⚠️ *Total Incomplete:* ${pendingIssues.length} | 🏢 *Branches:* ${branchCount}\n`;
      text += `${divider}\n\n`;

      if (pendingIssues.length === 0) {
        text += `✅ *All branches are operating normally with zero pending issues!*\n`;
      } else {
        const byBranch = {};
        pendingIssues.forEach(item => {
          const b = item.branch || 'Unknown';
          if (!byBranch[b]) byBranch[b] = [];
          byBranch[b].push(item);
        });

        Object.keys(byBranch).forEach((branch, idx) => {
          text += `🏢 *${idx + 1}. Branch: ${branch}* (${byBranch[branch].length} issue${byBranch[branch].length > 1 ? 's' : ''})\n`;
          byBranch[branch].forEach((iss, iIdx) => {
            text += `   🔴 [${iIdx + 1}] ${iss.issue}\n`;
            if (iss.note) text += `      👉 Plan/Note: ${iss.note}\n`;
            text += `      👤 Reported: ${iss.reporterName || '-'} (${iss.position || '-'})\n`;
          });
          text += `\n`;
        });
      }

      text += `${divider}\n📍 *HQ Operations Center:* KL Plaza, Phnom Penh`;
      return text;
    }

    let text = `🚨 *ក្រុមហ៊ុនប៊ីអេស អិចប្រេស - ផ្ទាំងតាមដានបញ្ហាសេសសល់តាមសាខា*\n`;
    text += `📅 *កាលបរិច្ឆេទ:* ${dateStr} | ⚠️ *បញ្ហាមិនទាន់រួចរាល់:* ${pendingIssues.length} | 🏢 *សាខា:* ${branchCount}\n`;
    text += `${divider}\n\n`;

    if (pendingIssues.length === 0) {
      text += `✅ *គ្រប់សាខាទាំងអស់ដំណើរការរលូន គ្មានបញ្ហាមិនទាន់ដោះស្រាយទេ!*\n`;
    } else {
      const byBranch = {};
      pendingIssues.forEach(item => {
        const b = item.branch || 'មិនស្គាល់';
        if (!byBranch[b]) byBranch[b] = [];
        byBranch[b].push(item);
      });

      Object.keys(byBranch).forEach((branch, idx) => {
        text += `🏢 *${idx + 1}. សាខា៖ ${branch}* (${byBranch[branch].length} បញ្ហា)\n`;
        byBranch[branch].forEach((iss, iIdx) => {
          text += `   🔴 [${iIdx + 1}] ${iss.issue}\n`;
          if (iss.note) text += `      👉 ផែនការដោះស្រាយ៖ ${iss.note}\n`;
          text += `      👤 អ្នករាយការណ៍៖ ${iss.reporterName || '-'} (${iss.position || '-'})\n`;
        });
        text += `\n`;
      });
    }

    text += `${divider}\n📍 *មជ្ឈមណ្ឌលប្រតិបត្តិការកណ្តាល (HQ):* KL Plaza, រាជធានីភ្នំពេញ`;
    return text;
  },

  /**
   * Exports list of issues to CSV
   * @param {Array} issues 
   */
  exportIssuesToCsv(issues) {
    if (!issues || !issues.length) return;

    const headers = [
      'លេខសម្គាល់', 'សាខា', 'កាលបរិច្ឆេទ', 'អ្នករាយការណ៍', 'តួនាទី',
      'បញ្ហាប្រឈម / ការងារសេសសល់', 'ស្ថានភាព', 'កំណត់សម្គាល់ / ផែនការ'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""').replace(/\n/g, ' ');
      return `"${clean}"`;
    };

    const rows = issues.map(iss => [
      escapeCsv(iss.id || iss.reportId),
      escapeCsv(iss.branch),
      escapeCsv(iss.dateDisplay || iss.date),
      escapeCsv(iss.reporterName),
      escapeCsv(iss.position),
      escapeCsv(iss.issue),
      escapeCsv(iss.status === 'complete' ? 'បានដោះស្រាយរួច (Resolved)' : 'មិនទាន់រួចរាល់ (Incomplete)'),
      escapeCsv(iss.note || '')
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BS_Express_Branch_Issues_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  /**
   * Generates formatted Telegram message for a single branch morning shift report
   * @param {Object} data
   * @param {string} lang
   * @returns {string}
   */
  formatSingleMorningReportForTelegram(data, lang = 'km') {
    const divider = '━━━━━━━━━━━━━━━━━━━━━━';
    const b = data.branch || 'ក្រចេះ';
    const d = data.dateDisplay || data.date || new Date().toLocaleDateString('en-GB');
    const name = data.reporterName || 'ប៊ុនតា ភឿន';
    const pos = data.position || 'ប្រធានសាខា';

    let text = `🌅 *ក្រុមហ៊ុនប៊ីអេស អិចប្រេស (BS Express)*\n`;
    text += `📋 *របាយការណ៍ពេលបើកដំណើរការសាខា*\n`;
    text += `${divider}\n`;
    text += `🏢 *សាខា៖* ${b}\n`;
    text += `📅 *កាលបរិច្ឆេទ៖* ${d}\n`;
    text += `👤 *ឈ្មោះ៖* ${name} | *តួនាទី៖* ${pos}\n`;
    text += `${divider}\n\n`;

    text += `១. *របាយការណ៍ពេលបើកដំណើរការ (ម៉ោង 6:00 ព្រឹក)*\n`;
    text += `⏰ *ម៉ោងបើកសាខា៖* ${data.openingTime || '6:00Am'}\n`;
    text += `👥 *វត្តមានបុគ្គលិក៖* វត្តមាន ${data.presentCount || '0'} នាក់`;
    if (data.absentCount && data.absentCount !== '0') {
      text += ` | អវត្តមាន ${data.absentCount}`;
    }
    text += `\n`;
    text += `🧹 *អនាម័យសាខា៖* ${data.cleanlinessStatus || 'ស្ថានភាពអនាម័យ និងភាពរៀបរយក្នុង-ក្រៅសាខា'}\n`;

    if (data.morningChallenges && data.morningChallenges.trim()) {
      text += `⚠️ *បញ្ហាប្រឈមពេលព្រឹក៖* ${data.morningChallenges.trim()}\n`;
    }

    text += `\n${divider}\n`;
    text += `📍 *មជ្ឈមណ្ឌលប្រតិបត្តិការកណ្តាល (HQ):* KL Plaza, រាជធានីភ្នំពេញ`;
    return text;
  },

  /**
   * Generates a Telegram summary for all 27 branches during morning shift
   * @param {Array} morningRows 
   * @param {string} dateStr 
   * @returns {string}
   */
  formatMorningSummaryForTelegram(morningRows, dateStr = '') {
    const divider = '━━━━━━━━━━━━━━━━━━━━━━';
    const totalBranches = morningRows.length;
    const openedBranches = morningRows.filter(r => r.isOpened);
    const totalPresent = morningRows.reduce((acc, r) => acc + (parseInt(r.presentCount, 10) || 0), 0);
    const issues = morningRows.filter(r => r.morningChallenges && r.morningChallenges.trim());

    let text = `🌅 *ក្រុមហ៊ុនប៊ីអេស អិចប្រេស (BS Express)*\n`;
    text += `📋 *របាយការណ៍ពេលបើកដំណើរការសាខាសរុប (Morning Shift)*\n`;
    text += `${divider}\n`;
    text += `📅 *កាលបរិច្ឆេទ:* ${dateStr || new Date().toLocaleDateString('en-GB')}\n`;
    text += `⏰ *ម៉ោងបើកស្តង់ដារ:* 6:00 AM\n`;
    text += `🏢 *សាខាបានបើក:* ${openedBranches.length}/${totalBranches} សាខា\n`;
    text += `👥 *វត្តមានបុគ្គលិកសរុប:* ${totalPresent} នាក់\n`;
    text += `⚠️ *សាខាមានបញ្ហាពេលព្រឹក:* ${issues.length} សាខា\n`;
    text += `${divider}\n\n`;

    text += `📍 *ព័ត៌មានលម្អិតតាមសាខា (Branch Status):*\n`;
    morningRows.forEach((r, idx) => {
      const icon = r.isOpened ? '✅' : '⏳';
      const openTime = r.openingTime || '6:00 AM';
      const pres = r.presentCount || '0';
      const abs = r.absentCount && r.absentCount !== '0' ? ` | អវត្តមាន: ${r.absentCount}` : '';
      text += `${icon} *${idx + 1}. សាខា ${r.branch}* (${openTime})\n`;
      text += `   • វត្តមាន: ${pres} នាក់${abs}\n`;
      if (r.cleanlinessStatus) {
        text += `   • អនាម័យ: ${r.cleanlinessStatus}\n`;
      }
      if (r.morningChallenges && r.morningChallenges.trim()) {
        text += `   • ⚠️ បញ្ហាពេលព្រឹក: ${r.morningChallenges.trim()}\n`;
      }
      if (r.reporterName) {
        text += `   • 👤 អ្នករាយការណ៍: ${r.reporterName}\n`;
      }
      text += `\n`;
    });

    if (issues.length > 0) {
      text += `${divider}\n`;
      text += `🚨 *សង្ខេបបញ្ហាប្រឈមពេលព្រឹកដែលត្រូវតាមដាន:* \n`;
      issues.forEach((iss, i) => {
        text += `${i + 1}. *សាខា ${iss.branch}:* ${iss.morningChallenges}\n`;
      });
      text += `\n`;
    }

    text += `${divider}\n📍 *មជ្ឈមណ្ឌលប្រតិបត្តិការកណ្តាល (HQ):* KL Plaza, រាជធានីភ្នំពេញ`;
    return text;
  },

  /**
   * Exports morning shift matrix to CSV
   * @param {Array} morningRows 
   * @param {string} dateStr 
   */
  exportMorningMatrixToCsv(morningRows, dateStr = '') {
    if (!morningRows || !morningRows.length) return;

    const headers = [
      '#', 'សាខា', 'កាលបរិច្ឆេទ', 'ម៉ោងបើកសាខា', 'វត្តមានបុគ្គលិក', 'អវត្តមាន/ច្បាប់',
      'ស្ថានភាពអនាម័យ', 'បញ្ហាប្រឈមពេលព្រឹក', 'អ្នករាយការណ៍', 'តួនាទី', 'ស្ថានភាព'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""').replace(/\n/g, ' ');
      return `"${clean}"`;
    };

    const rows = morningRows.map((r, idx) => [
      idx + 1,
      escapeCsv(r.branch),
      escapeCsv(r.dateDisplay || dateStr),
      escapeCsv(r.openingTime || '6:00 AM'),
      escapeCsv(r.presentCount || '0'),
      escapeCsv(r.absentCount || '0'),
      escapeCsv(r.cleanlinessStatus || 'ល្អឥតខ្ចោះ'),
      escapeCsv(r.morningChallenges || ''),
      escapeCsv(r.reporterName || ''),
      escapeCsv(r.position || 'ប្រធានសាខា'),
      escapeCsv(r.isOpened ? 'បានបើក' : 'រង់ចាំ')
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BS_Express_Morning_Shift_${(dateStr || new Date().toISOString().split('T')[0]).replace(/\//g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  /**
   * Downloads JSON backup file of reports
   * @param {Array} reports 
   */
  backupJson(reports) {
    if (!reports || !reports.length) return;
    const dataStr = JSON.stringify(reports, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BS_Express_Reports_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  printReport() {
    window.print();
  }
};

if (typeof window !== 'undefined') {
  window.ExportUtil = ExportUtil;
}
