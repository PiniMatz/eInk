const { getJewishHolidays } = require('../holidays');
const { getEvents } = require('../db');

async function debug25() {
  const dateStr = '2026-07-25';
  const holidays = getJewishHolidays(2026, 7);
  const events = await getEvents();
  
  console.log(`--- Checking 2026-07-25 ---`);
  console.log('Holiday on 2026-07-25:', holidays[dateStr] || 'None');
  
  const dayEvents = events.filter(e => e.date === dateStr);
  console.log('Events on 2026-07-25:', dayEvents);
}

debug25();
