const path = require('path');
const db = require('../db');
const { getSchoolHoliday } = require('../holidays');
const { ingestSchedule } = require('./ingest_schedule');

const SOL_WEEKLY_TEMPLATE = {
  // Sunday (0)
  0: [
    { title: 'מתמטיקה', time: '08:30', durationMinutes: 45 },
    { title: 'מתמטיקה', time: '09:15', durationMinutes: 45 },
    { title: 'חינוך גופני', time: '10:45', durationMinutes: 30 },
    { title: 'מדע וטכנולוגיה', time: '11:15', durationMinutes: 45 },
    { title: 'מדע וטכנולוגיה', time: '12:15', durationMinutes: 45 },
    { title: 'מפתח לסביבה', time: '13:00', durationMinutes: 45 }
  ],
  // Monday (1)
  1: [
    { title: 'מפגש בוקר', time: '08:15', durationMinutes: 15 },
    { title: 'אנגלית', time: '08:30', durationMinutes: 45 },
    { title: 'אנגלית', time: '09:15', durationMinutes: 45 },
    { title: 'לשון', time: '10:45', durationMinutes: 30 },
    { title: 'ערבית', time: '11:15', durationMinutes: 45 },
    { title: 'מדע וטכנולוגיה', time: '12:15', durationMinutes: 45 }
  ],
  // Tuesday (2)
  2: [
    { title: 'מפגש בוקר', time: '08:15', durationMinutes: 15 },
    { title: 'מתמטיקה', time: '08:30', durationMinutes: 45 },
    { title: 'מתמטיקה', time: '09:15', durationMinutes: 45 },
    { title: 'לשון', time: '10:45', durationMinutes: 30 },
    { title: 'מפתח לרוח', time: '11:15', durationMinutes: 45 },
    { title: 'מפתח לרוח', time: '12:15', durationMinutes: 45 }
  ],
  // Wednesday (3)
  3: [
    { title: 'מפגש בוקר', time: '08:15', durationMinutes: 15 },
    { title: 'מדע וטכנולוגיה', time: '08:30', durationMinutes: 45 },
    { title: 'מדע וטכנולוגיה', time: '09:15', durationMinutes: 45 },
    { title: 'חינוך גופני', time: '10:45', durationMinutes: 30 },
    { title: 'מפתח לרוח', time: '11:15', durationMinutes: 45 },
    { title: 'לשון', time: '12:15', durationMinutes: 45 },
    { title: 'תל"ת רובוטיקה', time: '13:00', durationMinutes: 45 }
  ],
  // Thursday (4)
  4: [
    { title: 'מתמטיקה', time: '08:30', durationMinutes: 45 },
    { title: 'מפתח לסביבה', time: '09:15', durationMinutes: 45 },
    { title: 'חינוך', time: '10:45', durationMinutes: 30 },
    { title: 'ערבית', time: '11:15', durationMinutes: 45 },
    { title: 'אנגלית', time: '12:15', durationMinutes: 45 },
    { title: 'אנגלית', time: '13:00', durationMinutes: 45 }
  ]
};

async function generateSolFullYearSchedule() {
  console.log('Generating Sol\'s full year schedule (Sept 6, 2026 -> June 20, 2027)...');

  const startDate = new Date('2026-09-06T12:00:00+03:00');
  const endDate = new Date('2027-06-20T12:00:00+03:00');

  const allItems = [];
  let curr = new Date(startDate);
  let skippedHolidaysCount = 0;

  while (curr <= endDate) {
    const dayOfWeek = curr.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

    // Skip Fridays and Saturdays
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      curr.setDate(curr.getDate() + 1);
      continue;
    }

    // Check if Jewish School Holiday
    const holiday = getSchoolHoliday(curr);
    const dateStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;

    if (holiday) {
      console.log(`Skipping holiday date ${dateStr} (${holiday}) for Sol school schedule.`);
      skippedHolidaysCount++;
      curr.setDate(curr.getDate() + 1);
      continue;
    }

    const templateItems = SOL_WEEKLY_TEMPLATE[dayOfWeek];
    if (templateItems) {
      templateItems.forEach(t => {
        allItems.push({
          kid: 'סול',
          title: t.title,
          date: dateStr,
          time: t.time,
          durationMinutes: t.durationMinutes
        });
      });
    }

    curr.setDate(curr.getDate() + 1);
  }

  console.log(`Generated ${allItems.length} class items across ${skippedHolidaysCount} holiday dates skipped.`);

  // Ingest items
  console.log('Starting ingestion into database and Google Calendar...');
  const res = await ingestSchedule(allItems);
  console.log(`Full year schedule ingestion complete! Ingested ${res.length} items.`);
}

if (require.main === module) {
  generateSolFullYearSchedule().then(() => process.exit(0)).catch(err => {
    console.error('Error generating Sol schedule:', err);
    process.exit(1);
  });
}

module.exports = { generateSolFullYearSchedule };
