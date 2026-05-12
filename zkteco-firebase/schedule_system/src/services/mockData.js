export let mockSpecialists = [
  { id: 's1', name: 'أحمد محمود', specialization: 'تخاطب', workingDays: [0, 1, 2, 3, 4], startHour: '09:00', endHour: '14:00' },
  { id: 's2', name: 'مريم علي', specialization: 'تعديل سلوك', workingDays: [0, 1, 2, 3, 4], startHour: '10:00', endHour: '16:00' },
  { id: 's3', name: 'سارة خالد', specialization: 'علاج وظيفي', workingDays: [0, 2, 4], startHour: '08:00', endHour: '15:00' }
];

export let mockChildren = [
  { id: 'c1', name: 'ياسين محمد', age: 6, diagnosis: 'توحد', iqScore: 90, notes: '', assessments: [], progressLogs: [] },
  { id: 'c2', name: 'ليان حسن', age: 5, diagnosis: 'تأخر لغوي', iqScore: 100, notes: '', assessments: [], progressLogs: [] },
  { id: 'c3', name: 'عمر طارق', age: 8, diagnosis: 'فرط حركة وتشتت انتباه', iqScore: 105, notes: '', assessments: [], progressLogs: [] }
];

export let mockSessions = [];

// Helper to simulate delay
export const delay = (ms = 500) => new Promise(res => setTimeout(res, ms));
