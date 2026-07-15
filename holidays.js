const { HebrewCalendar, HDate } = require('@hebcal/core');

/**
 * Fetch Jewish Holidays for a given month and year in Hebrew (Israel schedule).
 * Returns a map of Gregorian date string "YYYY-MM-DD" to holiday name (Hebrew string).
 */
function getJewishHolidays(year, month) {
  const holidayMap = {};
  
  try {
    const options = {
      year: parseInt(year),
      month: parseInt(month),
      isHebrewYear: false,
      locale: 'he', // Return Hebrew names
      il: true,     // Israel holiday schedule
    };

    const events = HebrewCalendar.calendar(options);

    for (const ev of events) {
      const desc = ev.getDesc();
      // Filter out Rosh Chodesh and special Shabbat designations (which don't appear on standard Google Calendars)
      if (desc.startsWith('Rosh Chodesh') || desc.startsWith('Shabbat ')) {
        continue;
      }

      const gDate = ev.getDate().greg();
      const dateStr = gDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
      
      // Get the holiday name in Hebrew
      const holidayName = ev.render('he');
      
      // Clean up common prefixes or suffixes if necessary (like "ערב ...", "יום ...")
      // But usually the rendered Hebrew name is exactly what we want to display in a calendar cell.
      
      // Store in map (if multiple holidays on the same day, join them)
      if (holidayMap[dateStr]) {
        holidayMap[dateStr] += ' / ' + holidayName;
      } else {
        holidayMap[dateStr] = holidayName;
      }
    }
  } catch (err) {
    console.error('Error fetching Jewish holidays:', err);
  }

  return holidayMap;
}

module.exports = { getJewishHolidays };
