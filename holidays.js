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

/**
 * Detects Ministry of Education (משרד החינוך) Jewish school holidays for a given Date object or date string.
 * Returns the short Hebrew name of the holiday (e.g. "ראש השנה", "סוכות", "פסח", "חנוכה", "פורים", "שבועות", "יום העצמאות", "ל"ג בעומר", "יום כיפור") or null if regular school day.
 */
function getSchoolHoliday(dateInput) {
  try {
    const d = new Date(dateInput);
    const hd = new HDate(d);
    const monthName = hd.getMonthName();
    const day = hd.getDate();
    const evs = HebrewCalendar.getHolidaysOnDate(hd, true) || [];

    for (const ev of evs) {
      const desc = ev.getDesc();
      if (desc.includes('Rosh Hashana') || desc === 'Erev Rosh Hashana') return 'ראש השנה';
      if (desc.includes('Yom Kippur') || desc === 'Erev Yom Kippur') return 'יום כיפור';
      if (desc.includes('Sukkot') || desc.includes('Shmini Atzeret') || desc === 'Erev Sukkot' || desc === 'Hoshana Raba') return 'סוכות';
      if (desc.includes('Chanukah')) {
        // 1st candle is a regular school day; vacation starts 2nd candle (26 Kislev)
        if (monthName === 'Kislev' && day === 25) continue;
        return 'חנוכה';
      }
      if (desc.includes('Purim') || desc === "Ta'anit Esther") return 'פורים';
      if (desc.includes('Pesach') || desc === 'Erev Pesach' || desc === "Ta'anit Bechorot") return 'פסח';
      if (desc === "Yom HaAtzma'ut") return 'יום העצמאות';
      if (desc === 'Yom HaZikaron') return 'יום הזיכרון';
      if (desc === 'Lag BaOmer') return 'ל"ג בעומר';
      if (desc.includes('Shavuot') || desc === 'Erev Shavuot') return 'שבועות';
    }

    // Pesach vacation (Nisan 6 through Nisan 22 Isru Chag)
    if (monthName === 'Nisan' && day >= 6 && day <= 22) return 'פסח';

    // Isru Chag Sukkot (23 Tishrei) and Isru Chag Shavuot (7 Sivan)
    if (monthName === 'Tishrei' && day === 23) return 'סוכות';
    if (monthName === 'Sivan' && day === 7) return 'שבועות';

    return null;
  } catch (err) {
    console.error('getSchoolHoliday error:', err);
    return null;
  }
}

module.exports = { getJewishHolidays, getSchoolHoliday };
