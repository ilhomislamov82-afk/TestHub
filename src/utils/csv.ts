import { TestResult } from '../types';

export function exportResultsToExcelCSV(results: TestResult[], filename = 'test_natijalari.csv') {
  if (!results || results.length === 0) {
    return false;
  }

  // Headers in Uzbek Latin
  const headers = [
    'O\'quvchi ismi',
    'Familiyasi',
    'Telefon raqami',
    'Guruhi',
    'Test nomi',
    'Topshirilgan sana',
    'To\'plangan ball',
    'Maksimal ball',
    'Natija (%)',
    'Holati',
    'Sarflangan vaqt',
    'Oynadan chiqishlar soni',
    'Urinish raqami'
  ];

  const escapeCSV = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const formatSeconds = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins} daq ${remainder} soniya`;
  };

  const rows = results.map(r => {
    const dateFormatted = new Date(r.submittedAt).toLocaleString('uz-UZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    return [
      escapeCSV(r.studentFirstName),
      escapeCSV(r.studentLastName),
      escapeCSV(r.studentPhone),
      escapeCSV(r.groupName),
      escapeCSV(r.testTitle),
      escapeCSV(dateFormatted),
      escapeCSV(r.score),
      escapeCSV(r.maxScore),
      escapeCSV(`${r.percentage}%`),
      escapeCSV(r.passed ? "O'tdi" : "O'tmadi"),
      escapeCSV(formatSeconds(r.timeSpentSeconds)),
      escapeCSV(r.tabExitCount),
      escapeCSV(r.attemptNumber || 1)
    ].join(',');
  });

  // Prepend UTF-8 BOM (\uFEFF) so Excel on Windows & Mac renders Uzbek Latin letters correctly
  const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
