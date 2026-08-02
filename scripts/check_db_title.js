const db = require('../db');

async function main() {
  const events = await db.getEvents(2026, 7);
  const ev = events.find(e => e.date === '2026-07-20' && e.title.includes('ביקור'));
  console.log('Event in Firestore:', ev);
}

main();
