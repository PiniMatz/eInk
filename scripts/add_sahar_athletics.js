const db = require('../db');
const { addGoogleCalendarEvent, deleteGoogleCalendarEvent, listGoogleCalendarEvents } = require('../google-calendar');

async function main() {
  console.log('=== ADDING SAHAR ATHLETICS PRACTICE SESSIONS ===');

  // 1. Tuesday 22/09/2026: 12:30 - 13:15
  console.log('\n--- 1. Tuesday 22/09/2026 (12:30-13:15) ---');
  const event1 = {
    title: '[סהר] אתלטיקה',
    date: '2026-09-22',
    time: '12:30',
    author: 'סהר',
    isTimed: true,
    source: 'user_request'
  };

  const added1 = await db.addEvent(event1);
  console.log(`[+] Added to Firestore: ${event1.title} on ${event1.date} at ${event1.time} (ID: ${added1.id})`);

  try {
    const gcal1 = await addGoogleCalendarEvent({
      calendarId: 'hugim.kid@gmail.com',
      kid: 'סהר',
      title: 'אתלטיקה',
      date: '2026-09-22',
      time: '12:30',
      durationMinutes: 45
    });
    console.log(`[+] Added to Google Calendar: (ID: ${gcal1.id})`);
  } catch (err) {
    console.error('[-] Failed adding to GCal 22/9:', err.message);
  }

  // 2. Monday 28/09/2026: 13:45 - 14:30
  console.log('\n--- 2. Monday 28/09/2026 (13:45-14:30) ---');
  
  // Remove old 15:30 event on 28/09/2026 from Firestore
  const eventsSep = await db.getEvents(2026, 9);
  const oldAthletics = eventsSep.filter(e => e.date === '2026-09-28' && (e.title.includes('אתלטיקה')));
  for (const oldEv of oldAthletics) {
    console.log(`[-] Removing old athletics from Firestore: ${oldEv.id} (${oldEv.time} ${oldEv.title})`);
    await db.deleteEvent(oldEv.id);
  }

  // Remove old 15:30 occurrence from Google Calendar
  try {
    const gcalEvents = await listGoogleCalendarEvents({
      timeMin: '2026-09-28T00:00:00Z',
      timeMax: '2026-09-28T23:59:59Z'
    });
    const oldGcal = gcalEvents.filter(e => e.summary && e.summary.includes('אתלטיקה'));
    for (const gEv of oldGcal) {
      console.log(`[-] Deleting old GCal occurrence: ${gEv.id} (${gEv.summary})`);
      await deleteGoogleCalendarEvent({ eventId: gEv.id });
    }
  } catch (err) {
    console.warn('Warning removing old GCal occurrence:', err.message);
  }

  // Add new 13:45 event to Firestore
  const event2 = {
    title: '[סהר] אתלטיקה',
    date: '2026-09-28',
    time: '13:45',
    author: 'סהר',
    isTimed: true,
    source: 'user_request'
  };
  const added2 = await db.addEvent(event2);
  console.log(`[+] Added to Firestore: ${event2.title} on ${event2.date} at ${event2.time} (ID: ${added2.id})`);

  // Add new 13:45 event to Google Calendar
  try {
    const gcal2 = await addGoogleCalendarEvent({
      calendarId: 'hugim.kid@gmail.com',
      kid: 'סהר',
      title: 'אתלטיקה',
      date: '2026-09-28',
      time: '13:45',
      durationMinutes: 45
    });
    console.log(`[+] Added to Google Calendar: (ID: ${gcal2.id})`);
  } catch (err) {
    console.error('[-] Failed adding to GCal 28/9:', err.message);
  }

  console.log('\n=== COMPLETED SUCCESSFULLY ===');
}

main().catch(console.error);
