const ical = require('node-ical');
const db = require('../db');

async function main() {
  const cals = await db.getCalendars();
  console.log('Calendars count:', cals.length);
  for (const cal of cals) {
    console.log(`Fetching feed for ${cal.name}: ${cal.url}`);
    const data = await ical.async.fromURL(cal.url);
    for (const k in data) {
      const item = data[k];
      if (item.type === 'VEVENT') {
        const start = item.start ? new Date(item.start) : null;
        if (start) {
          const dateStr = start.toISOString().split('T')[0];
          if (dateStr.includes('2026-07-20') || (item.summary && item.summary.includes('ביקור'))) {
            console.log(`[RAW VEVENT] Date: ${dateStr} | Summary: "${item.summary}"`);
          }
        }
      }
    }
  }
}

main();
