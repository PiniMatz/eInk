const { listGoogleCalendarEvents, deleteGoogleCalendarEvent } = require('../google-calendar');

async function cleanupSolGcalDuplicates() {
  console.log('Fetching all Google Calendar events for Sol (Sept 6, 2026 -> June 20, 2027)...');
  const timeMin = '2026-09-01T00:00:00Z';
  const timeMax = '2027-06-25T23:59:59Z';
  
  const allEvents = await listGoogleCalendarEvents({
    calendarId: 'hugim.kid@gmail.com',
    timeMin,
    timeMax
  });

  const solEvents = allEvents.filter(e => e.summary && e.summary.includes('[סול]'));
  console.log(`Found total ${solEvents.length} Sol events in Google Calendar.`);

  const seen = new Map();
  const toDelete = [];

  for (const ev of solEvents) {
    const startStr = ev.start ? (ev.start.dateTime || ev.start.date) : '';
    const key = `${ev.summary.trim()}_${startStr}`;
    
    if (seen.has(key)) {
      toDelete.push(ev);
    } else {
      seen.set(key, ev);
    }
  }

  console.log(`Identified ${toDelete.length} duplicate Sol events to delete from Google Calendar.`);

  for (let i = 0; i < toDelete.length; i++) {
    const ev = toDelete[i];
    try {
      await deleteGoogleCalendarEvent({ calendarId: 'hugim.kid@gmail.com', eventId: ev.id });
      console.log(`[${i+1}/${toDelete.length}] Deleted duplicate ${ev.summary} (${ev.id})`);
    } catch (err) {
      console.error(`Failed to delete event ${ev.id}:`, err.message);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('Google Calendar duplicate cleanup complete!');
}

if (require.main === module) {
  cleanupSolGcalDuplicates().then(() => process.exit(0)).catch(err => {
    console.error('Error cleaning up Google Calendar:', err);
    process.exit(1);
  });
}
