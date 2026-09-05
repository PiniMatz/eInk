const fs = require('fs');
const path = require('path');
const db = require('../db');

/**
 * Ingests a list of schedule items for a kid.
 * Each item format:
 * {
 *   kid: 'סהר' | 'סול',
 *   title: 'מתמטיקה',
 *   date: '2026-09-06', // YYYY-MM-DD
 *   time: '08:00',      // HH:MM
 *   isAfternoon: false
 * }
 */
async function ingestSchedule(scheduleItems, options = {}) {
  if (!Array.isArray(scheduleItems) || scheduleItems.length === 0) {
    console.log('No schedule items to ingest.');
    return [];
  }

  let googleCalApi = null;
  try {
    googleCalApi = require('../google-calendar');
  } catch (err) {
    // googleapis module or credentials optional
  }

  const added = [];
  const chunkSize = 10;
  for (let i = 0; i < scheduleItems.length; i += chunkSize) {
    const chunk = scheduleItems.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (item) => {
      const kidPrefix = item.kid ? `[${item.kid}] ` : '';
      const formattedTitle = item.title.startsWith('[') ? item.title : `${kidPrefix}${item.title}`;
      
      const eventObj = {
        title: formattedTitle,
        date: item.date,
        author: item.kid || 'Kid',
        time: item.time || '',
        isTimed: !!item.time
      };

      try {
        // 1. Add to database (Firestore / db.json)
        const res = await db.addEvent(eventObj);
        added.push(res);

        // 2. Add to Google Calendar directly if API is configured & calendarId provided
        if (googleCalApi) {
          try {
            const calId = options.calendarId || process.env.GOOGLE_CALENDAR_ID || 'hugim.kid@gmail.com';
            await googleCalApi.addGoogleCalendarEvent({
              calendarId: calId,
              kid: item.kid,
              title: item.title,
              date: item.date,
              time: item.time,
              durationMinutes: item.durationMinutes
            });
          } catch (gErr) {
            // silent retry/ignore
          }
        }
      } catch (err) {
        console.error(`Failed to add event ${formattedTitle}:`, err.message);
      }
    }));
  }

  return added;
}

// CLI usage: node scripts/ingest_schedule.js schedule_data.json
if (require.main === module) {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.log('Usage: node scripts/ingest_schedule.js <path-to-json-file>');
    process.exit(1);
  }

  const fullPath = path.resolve(fileArg);
  if (!fs.existsSync(fullPath)) {
    console.error('File not found:', fullPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(fullPath, 'utf8');
  const items = JSON.parse(rawData);
  
  ingestSchedule(items).then(res => {
    console.log(`Ingestion complete! Successfully ingested ${res.length} events.`);
    process.exit(0);
  }).catch(err => {
    console.error('Ingestion error:', err);
    process.exit(1);
  });
}

module.exports = { ingestSchedule };
