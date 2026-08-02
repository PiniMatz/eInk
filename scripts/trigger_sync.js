const db = require('../db');

async function main() {
  console.log('--- Triggering db.syncCalendars() ---');
  await db.syncCalendars();
  console.log('--- Fetching updated events for today ---');
  const events = await getEvents();
  const todayEvents = events.filter(e => e.date === '2026-07-20' || e.date === '2026-07-15');
  console.log('Events on 2026-07-20 / 2026-07-15:', todayEvents);
}

main();
