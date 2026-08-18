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
    if (lang === 'en') {
      return `🚚 *BS Express Co., Ltd.*
📋 *Branch Daily Work Report*
${divider}
🏢 *Branch:* ${report.branch || '-'}
📅 *Date:* ${report.dateDisplay || report.date || '-'}
👤 *Reporter:* ${report.reporterName || '-'}
💼 *Role:* ${report.position || '-'}
${divider}
🌅 *1. Opening Shift Report*
• Opening Time: ${report.openingTime || '-'}
• Attendance: Present ${report.presentCount || '0'} | Absent: ${report.absentCount || '-'}
• Cleanliness: ${report.cleanlinessStatus || '-'}

📦 *2. Daily Operation Report*
• Work Status: 
  👉 ${report.workStatus || '-'}
• Operational Challenges: 
  ⚠️ ${report.operationChallenges || '-'}

🌙 *3. Closing Shift Report*
• Accomplished Tasks: 
  ✅ ${report.accomplishedTasks || '-'}
• Unresolved Issues: 
  ⏳ ${report.unresolvedIssues || '-'}
• Security & Storage: 
  🔒 ${report.packageSecurity || '-'}
• Closing Time: ${report.closingTime || '-'}
${divider}
📍 *HQ:* KL Plaza No.131, Bld C11-C12, St 154 x St 13, Phnom Penh`;
    }

    return `🚚 *ក្រុមហ៊ុន ប៊ីអេស អ៊ិចប្រេស (BS Express)*
📋 *របាយការណ៍ការងារប្រចាំថ្ងៃតាមសាខា*
${divider}
🏢 *សាខា:* ${report.branch || '-'}
📅 *កាលបរិច្ឆេទ:* ${report.dateDisplay || report.date || '-'}
👤 *អ្នករាយការណ៍:* ${report.reporterName || '-'}
💼 *តួនាទី:* ${report.position || '-'}
${divider}
🌅 *១. របាយការណ៍ពេលបើកដំណើរការ (Opening Shift)*
• ម៉ោងបើកសាខា: ${report.openingTime || '-'}
• វត្តមានបុគ្គលិក: វត្តមាន ${report.presentCount || '0'} | អវត្តមាន: ${report.absentCount || '-'}
• អនាម័យសាខា: ${report.cleanlinessStatus || '-'}

📦 *២. របាយការណ៍ប្រតិបត្តិការប្រចាំថ្ងៃ (Daily Operation)*
• ស្ថានភាពការងារ: 
  👉 ${report.workStatus || '-'}
• បញ្ហាប្រឈមប្រតិបត្តិការ: 
  ⚠️ ${report.operationChallenges || '-'}

🌙 *៣. របាយការណ៍ពេលបិទដំណើរការ (Closing Shift)*
• ការងារដែលបានសម្រេច: 
  ✅ ${report.accomplishedTasks || '-'}
• បញ្ហាមិនទាន់ដោះស្រាយ: 
  ⏳ ${report.unresolvedIssues || '-'}
• សុវត្ថិភាពការញ៉ាប់បញ្ញើ: 
  🔒 ${report.packageSecurity || '-'}
• ម៉ោងបិទសាខា: ${report.closingTime || '-'}
${divider}
📍 *ទីស្នាក់ការកណ្តាល:* KL Plaza No.131, Bld C11-C12, St 154 x St 13, ភ្នំពេញ`;
  },

  /**
   * Exports list of reports to CSV
   * @param {Array} reports 
   */
  exportToCsv(reports) {
    if (!reports || !reports.length) return;

    const headers = [
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
      escapeCsv(r.branch),
      escapeCsv(r.dateDisplay || r.date),
      escapeCsv(r.reporterName),
      escapeCsv(r.position),
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

  printReport() {
    window.print();
  }
};

if (typeof window !== 'undefined') {
  window.ExportUtil = ExportUtil;
}
