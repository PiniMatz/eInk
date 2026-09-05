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

function extractTimeStr(ev) {
  if (!ev.start) return '';
  if (ev.start.date) return '';
  if (ev.start.dateTime) {
    const dt = new Date(ev.start.dateTime);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jerusalem',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(dt);
    const h = parts.find(p => p.type === 'hour').value;
    const m = parts.find(p => p.type === 'minute').value;
    return `${h}:${m}`;
  }
  return '';
}

async function fixSolFullYear() {
  console.log('=== STEP 1: Fetching ALL Google Calendar pages for Sol (Sept 6, 2026 -> June 20, 2027) ===');
  const gcalEvents = await listGoogleCalendarEvents({
    calendarId: 'hugim.kid@gmail.com',
    timeMin: '2026-09-01T00:00:00Z',
    timeMax: '2027-06-30T23:59:59Z'
  });

  const solGcalSchoolEvents = gcalEvents.filter(e => {
    if (!e.summary || !e.summary.includes('סול')) return false;
    return SCHOOL_TITLES.some(t => e.summary.includes(t)) || e.summary.includes('רובוטיקה');
  });

  console.log(`Fetched total ${gcalEvents.length} events from Google Calendar, including ${solGcalSchoolEvents.length} Sol school events.`);

  const gcalKeptSet = new Set();
  const seenGcalKeys = new Map();
  const gcalToDelete = [];

  for (const ev of solGcalSchoolEvents) {
    const cleanSummary = ev.summary.replace(/[,:\s]+$/, '').trim();
    const startStr = ev.start ? (ev.start.dateTime || ev.start.date) : '';
    const dateStr = startStr.split('T')[0];
    const timeStr = extractTimeStr(ev);
    const key = `${cleanSummary}_${dateStr}_${timeStr}`;

    const d = new Date(dateStr + 'T12:00:00+03:00');
    const holiday = getSchoolHoliday(d);

    if (ev.summary.includes('רובוטיקה') || holiday || seenGcalKeys.has(key)) {
      gcalToDelete.push(ev);
    } else {
      seenGcalKeys.set(key, ev);
      gcalKeptSet.add(key);
    }
  }

  console.log(`Identified ${gcalToDelete.length} duplicate/triplet or holiday Sol GCal events to delete.`);

  for (let i = 0; i < gcalToDelete.length; i++) {
    const ev = gcalToDelete[i];
    try {
      await deleteGoogleCalendarEvent({ calendarId: 'hugim.kid@gmail.com', eventId: ev.id });
    } catch (err) {
      console.error(`Failed deleting GCal event ${ev.id}:`, err.message);
    }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log('Google Calendar deduplication & purge complete.');

  console.log('=== STEP 2: Deduplicating and purging Sol school events in Firestore ===');
  const months = [
    { year: 2026, month: 9 }, { year: 2026, month: 10 }, { year: 2026, month: 11 }, { year: 2026, month: 12 },
    { year: 2027, month: 1 }, { year: 2027, month: 2 }, { year: 2027, month: 3 }, { year: 2027, month: 4 }, { year: 2027, month: 5 }, { year: 2027, month: 6 }
  ];

  let fsDeletedCount = 0;
  for (const { year, month } of months) {
    const evs = await db.getEvents(year, month);
    const solEvs = evs.filter(e => e.author === 'סול' || (e.title && e.title.includes('סול')));
    const schoolEvs = solEvs.filter(e => SCHOOL_TITLES.some(t => e.title.includes(t)));

    const seenFsKeys = new Map();
    const fsToDelete = [];

    for (const e of schoolEvs) {
      const key = `${e.title.trim()}_${e.date}_${e.time || ''}`;
      const d = new Date(e.date + 'T12:00:00+03:00');
      const holiday = getSchoolHoliday(d);

      if (holiday || seenFsKeys.has(key)) {
        fsToDelete.push(e);
      } else {
        seenFsKeys.set(key, e);
      }
    }

    for (let i = 0; i < fsToDelete.length; i += 20) {
      const chunk = fsToDelete.slice(i, i + 20);
      await Promise.all(chunk.map(e => db.deleteEvent(e.id)));
      fsDeletedCount += chunk.length;
    }
  }
  console.log(`Firestore deduplication complete. Deleted ${fsDeletedCount} stale/duplicate Firestore events.`);

  console.log('=== STEP 3: Generating clean Sol schedule & filling missing dates (e.g. Nov 9th) ===');
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

  console.log('=== STEP 4: Ingesting clean missing items into Firestore and Google Calendar ===');
  let addedFsCount = 0;
  let addedGcalCount = 0;
  const monthCache = new Map();

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const formattedTitle = `[${item.kid}] ${item.title}`;
    
    // Check Firestore cache
    const monthKey = item.date.substring(0, 7);
    let monthEvs = monthCache.get(monthKey);
    if (!monthEvs) {
      const [y, m] = item.date.split('-').map(Number);
      monthEvs = await db.getEvents(y, m);
      monthCache.set(monthKey, monthEvs);
    }

    const existsInFs = monthEvs.some(e => e.date === item.date && e.time === item.time && (e.title === formattedTitle || e.title === item.title));

    if (!existsInFs) {
      const eventObj = {
        title: formattedTitle,
        date: item.date,
        author: item.kid,
        time: item.time,
        isTimed: true
      };
      const added = await db.addEvent(eventObj);
      monthEvs.push(added);
      addedFsCount++;
    }

    // Check in-memory Google Calendar set
    const itemGcalKey = `${formattedTitle}_${item.date}_${item.time}`;

    if (!gcalKeptSet.has(itemGcalKey)) {
      try {
        await addGoogleCalendarEvent({
          calendarId: 'hugim.kid@gmail.com',
          kid: item.kid,
          title: item.title,
          date: item.date,
          time: item.time,
          durationMinutes: item.durationMinutes
        });
        gcalKeptSet.add(itemGcalKey);
        addedGcalCount++;
      } catch (gErr) {
        console.error(`GCal insert error for ${formattedTitle}:`, gErr.message);
      }
    }
  }

  console.log(`=== ALL SOL SCHEDULE FIXES COMPLETE! Added ${addedFsCount} missing Firestore events and ${addedGcalCount} missing GCal events. ===`);
}

if (require.main === module) {
  fixSolFullYear().then(() => process.exit(0)).catch(err => {
    console.error('Error fixing Sol schedule:', err);
    process.exit(1);
  });
}
