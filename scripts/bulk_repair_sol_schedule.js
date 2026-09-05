const path = require('path');
const rootDir = path.join(__dirname, '..');
const { listGoogleCalendarEvents, bulkPatchGoogleCalendarEvents, deleteGoogleCalendarEvent, getJerusalemIsoString } = require(path.join(rootDir, 'google-calendar.js'));
const db = require(path.join(rootDir, 'db.js'));

async function main() {
  console.log('=== STARTING BULK REPAIR OF SOL SCHEDULE ===');

  // 1. Fetch ALL Google Calendar events for the full school year
  const allEvents = await listGoogleCalendarEvents({
    calendarId: 'hugim.kid@gmail.com',
    timeMin: '2026-09-06T00:00:00Z',
    timeMax: '2027-06-21T23:59:59Z'
  });
  console.log(`Fetched total ${allEvents.length} events from Google Calendar.`);

  const solEvents = allEvents.filter(ev => (ev.summary || '').includes('[סול]') || (ev.summary || '').includes('סול'));
  console.log(`Found ${solEvents.length} Sol calendar events.`);

  const patchQueue = [];
  const deleteQueue = [];
  const slotsMap = new Map(); // Key: "YYYY-MM-DD|HH:MM|cleanTitle" -> Array of event objects

  for (const ev of solEvents) {
    const rawSummary = ev.summary || '';
    const cleanSummary = rawSummary.replace(/[,:\s]+$/, '').trim();

    // Determine local date and time in Asia/Jerusalem
    let dateStr = '';
    let timeStr = '';

    if (ev.start && ev.start.dateTime) {
      const dt = new Date(ev.start.dateTime);
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jerusalem',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(dt);
      const y = parts.find(p => p.type === 'year').value;
      const m = parts.find(p => p.type === 'month').value;
      const d = parts.find(p => p.type === 'day').value;
      const h = parts.find(p => p.type === 'hour').value;
      const min = parts.find(p => p.type === 'minute').value;
      dateStr = `${y}-${m}-${d}`;
      timeStr = `${h}:${min}`;
    } else if (ev.start && ev.start.date) {
      dateStr = ev.start.date;
    }

    // Check if title has a trailing comma/colon that needs patching
    const needsTitlePatch = rawSummary !== cleanSummary;

    // Check if time offset shifted event by 1 hour due to DST (e.g. 07:30 instead of 08:30)
    let needsTimePatch = false;
    let targetTimeStr = timeStr;

    if (timeStr === '07:30' && cleanSummary.includes('מתמטיקה')) {
      needsTimePatch = true;
      targetTimeStr = '08:30';
    } else if (timeStr === '08:15' && cleanSummary.includes('מתמטיקה')) {
      needsTimePatch = true;
      targetTimeStr = '09:15';
    } else if (timeStr === '09:45' && cleanSummary.includes('חינוך גופני')) {
      needsTimePatch = true;
      targetTimeStr = '10:45';
    } else if (timeStr === '10:15' && cleanSummary.includes('מדע וטכנולוגיה')) {
      needsTimePatch = true;
      targetTimeStr = '11:15';
    } else if (timeStr === '11:15' && cleanSummary.includes('מדע וטכנולוגיה')) {
      needsTimePatch = true;
      targetTimeStr = '12:15';
    } else if (timeStr === '12:00' && cleanSummary.includes('מפתח לסביבה')) {
      needsTimePatch = true;
      targetTimeStr = '13:00';
    }

    if (needsTitlePatch || needsTimePatch) {
      const patchObj = { calendarId: 'hugim.kid@gmail.com', eventId: ev.id, summary: cleanSummary };
      if (needsTimePatch) {
        const startIso = getJerusalemIsoString(dateStr, targetTimeStr);
        const startDt = new Date(startIso);
        const endDt = new Date(startDt.getTime() + 45 * 60 * 1000);
        patchObj.start = { dateTime: startIso, timeZone: 'Asia/Jerusalem' };
        patchObj.end = { dateTime: endDt.toISOString(), timeZone: 'Asia/Jerusalem' };
      }
      patchQueue.push(patchObj);
    }

    // Deduplication grouping key
    const slotKey = `${dateStr}|${targetTimeStr}|${cleanSummary}`;
    if (!slotsMap.has(slotKey)) {
      slotsMap.set(slotKey, []);
    }
    slotsMap.get(slotKey).push(ev);
  }

  // Deduplicate extra copies in GCal
  for (const [key, evList] of slotsMap.entries()) {
    if (evList.length > 1) {
      // Keep first event, delete remaining duplicate IDs
      for (let i = 1; i < evList.length; i++) {
        deleteQueue.push(evList[i].id);
      }
    }
  }

  console.log(`Patch Queue: ${patchQueue.length} events to update in-place.`);
  console.log(`Delete Queue: ${deleteQueue.length} duplicate event IDs to delete.`);

  // 2. Execute Bulk In-Place Patching in Google Calendar
  if (patchQueue.length > 0) {
    console.log('Executing in-place bulk patch in Google Calendar...');
    const patchedResults = await bulkPatchGoogleCalendarEvents(patchQueue, 1);
    console.log(`Successfully bulk-patched ${patchedResults.length} Google Calendar events.`);
  }

  // 3. Delete extra duplicate event IDs
  if (deleteQueue.length > 0) {
    console.log(`Deleting ${deleteQueue.length} duplicate event IDs from Google Calendar...`);
    for (let i = 0; i < deleteQueue.length; i++) {
      const id = deleteQueue[i];
      try {
        await deleteGoogleCalendarEvent({ calendarId: 'hugim.kid@gmail.com', eventId: id });
      } catch (e) {
        console.warn(`Delete failed for ${id}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 350));
    }
    console.log('Duplicate deletion complete.');
  }

  // 4. Clean & Deduplicate Firestore
  console.log('Synchronizing clean Google Calendar data with Firestore...');
  await db.syncCalendars();
  const dedupResult = await db.deduplicateAll();
  console.log(`Firestore deduplication complete (deleted ${dedupResult.count || 0} duplicate Firestore entries).`);

  console.log('=== BULK REPAIR COMPLETE ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Bulk repair failed:', err);
  process.exit(1);
});
