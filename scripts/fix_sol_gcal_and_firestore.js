const db = require('../db');
const { getSchoolHoliday } = require('../holidays');
const { listGoogleCalendarEvents, deleteGoogleCalendarEvent, addGoogleCalendarEvent } = require('../google-calendar');

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
    { title: 'לימודי העשרה', time: '13:00', durationMinutes: 45 }
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

const SCHOOL_TITLES = [
  'מתמטיקה', 'חינוך גופני', 'מדע וטכנולוגיה', 'מפתח לסביבה',
  'מפגש בוקר', 'אנגלית', 'לשון', 'ערבית', 'מפתח לרוח',
  'חינוך', 'תל"ת רובוטיקה', 'לימודי העשרה'
];

async function fixSolFullYear() {
  console.log('=== STEP 1: Fetching all Google Calendar events for Sol ===');
  const gcalEvents = await listGoogleCalendarEvents({
    calendarId: 'hugim.kid@gmail.com',
    timeMin: '2026-09-01T00:00:00Z',
    timeMax: '2027-06-30T23:59:59Z'
  });

  const solGcalSchoolEvents = gcalEvents.filter(e => {
    if (!e.summary || !e.summary.includes('סול')) return false;
    // Match any school subject item
    return SCHOOL_TITLES.some(t => e.summary.includes(t));
  });

  console.log(`Found ${solGcalSchoolEvents.length} Sol school events in Google Calendar to delete.`);

  // Delete all Sol school events from Google Calendar
  for (let i = 0; i < solGcalSchoolEvents.length; i++) {
    const ev = solGcalSchoolEvents[i];
    try {
      await deleteGoogleCalendarEvent({ calendarId: 'hugim.kid@gmail.com', eventId: ev.id });
      console.log(`[${i+1}/${solGcalSchoolEvents.length}] Deleted GCal event: ${ev.summary} on ${ev.start.dateTime || ev.start.date}`);
    } catch (err) {
      console.error(`Failed deleting GCal event ${ev.id}:`, err.message);
    }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log('Google Calendar purge of old Sol school events complete.');

  console.log('=== STEP 2: Purging Sol school events from Firestore ===');
  const months = [
    { year: 2026, month: 9 }, { year: 2026, month: 10 }, { year: 2026, month: 11 }, { year: 2026, month: 12 },
    { year: 2027, month: 1 }, { year: 2027, month: 2 }, { year: 2027, month: 3 }, { year: 2027, month: 4 }, { year: 2027, month: 5 }, { year: 2027, month: 6 }
  ];
  for (const { year, month } of months) {
    const evs = await db.getEvents(year, month);
    const solEvs = evs.filter(e => e.author === 'סול' || (e.title && e.title.includes('סול')));
    const schoolEvs = solEvs.filter(e => SCHOOL_TITLES.some(t => e.title.includes(t)));
    for (let i = 0; i < schoolEvs.length; i += 20) {
      const chunk = schoolEvs.slice(i, i + 20);
      await Promise.all(chunk.map(e => db.deleteEvent(e.id)));
    }
  }
  console.log('Firestore purge of old Sol school events complete.');

  console.log('=== STEP 3: Generating clean Sol schedule (Sept 6, 2026 -> June 20, 2027) ===');
  const startDate = new Date('2026-09-06T12:00:00+03:00');
  const endDate = new Date('2027-06-20T12:00:00+03:00');

  const allItems = [];
  let curr = new Date(startDate);
  let skippedHolidaysCount = 0;

  while (curr <= endDate) {
    const dayOfWeek = curr.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

    if (dayOfWeek === 5 || dayOfWeek === 6) {
      curr.setDate(curr.getDate() + 1);
      continue;
    }

    const holiday = getSchoolHoliday(curr);
    const dateStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;

    if (holiday) {
      console.log(`Skipping holiday date ${dateStr} (${holiday})`);
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

  console.log('=== STEP 4: Ingesting clean items into Firestore and Google Calendar ===');
  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const formattedTitle = `[${item.kid}] ${item.title}`;
    const eventObj = {
      title: formattedTitle,
      date: item.date,
      author: item.kid,
      time: item.time,
      isTimed: true
    };

    try {
      await db.addEvent(eventObj);
      let retries = 3;
      while (retries > 0) {
        try {
          await addGoogleCalendarEvent({
            calendarId: 'hugim.kid@gmail.com',
            kid: item.kid,
            title: item.title,
            date: item.date,
            time: item.time,
            durationMinutes: item.durationMinutes
          });
          break;
        } catch (gErr) {
          retries--;
          if (retries === 0) console.error(`GCal insert note for ${formattedTitle}:`, gErr.message);
          else await new Promise(r => setTimeout(r, 1000));
        }
      }
    } catch (err) {
      console.error(`Error adding event ${formattedTitle} on ${item.date}:`, err.message);
    }
    if ((i + 1) % 50 === 0 || i === allItems.length - 1) {
      console.log(`Ingested ${i + 1} / ${allItems.length} items.`);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('=== ALL SOL SCHEDULE FIXES COMPLETE! ===');
}

if (require.main === module) {
  fixSolFullYear().then(() => process.exit(0)).catch(err => {
    console.error('Error fixing Sol schedule:', err);
    process.exit(1);
  });
}
