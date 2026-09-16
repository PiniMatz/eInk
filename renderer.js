const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { getJewishHolidays, getSchoolHoliday, getNextUpcomingHoliday } = require('./holidays');


const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

const WEEKDAYS_HE = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

// Helper to remove Hebrew vowel points (nikud) and accents
function stripNikud(text) {
  if (!text) return '';
  return text.replace(/[\u0591-\u05C7]/g, '');
}

// Helper to get number of days in a month
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// Helper to check if two dates represent the same day
function isSameDay(date1Str, date2) {
  const d1 = new Date(date1Str);
  return d1.getFullYear() === date2.getFullYear() &&
         d1.getMonth() === date2.getMonth() &&
         d1.getDate() === date2.getDate();
}

/**
 * Truncate Hebrew text if it exceeds a certain length to fit inside calendar cells
 */
function truncateText(text, maxLength = 10) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength - 1) + '..' : text;
}

function renderSingleEventCol(svg, textX, textY, fontSize, item, maxLen) {
  if (item.isHoliday) {
    const cleanTitle = truncateText(stripNikud(item.title), maxLen);
    const rleHoliday = `\u202B${cleanTitle}\u202C`;
    return svg + `<text x="${textX}" y="${textY}" class="bold" font-size="${fontSize}" text-anchor="end" fill="black">${rleHoliday}</text>`;
  }
  
  const showAuthor = item.author && (item.author === 'סול' || item.author === 'סהר');
  const authorSuffix = showAuthor ? ` [${item.author}]` : '';
  const cleanTitle = stripNikud(item.title);
  const truncatedTitle = truncateText(cleanTitle, maxLen);
  const displayText = truncatedTitle + authorSuffix;
  const rleText = `\u202B${displayText}\u202C`;
  
  if (item.isTimed) {
    let timeOffset = 42;
    let titleOffset = 50;
    if (fontSize <= 10) {
      timeOffset = 34;
      titleOffset = 40;
    } else if (fontSize <= 11) {
      timeOffset = 38;
      titleOffset = 45;
    }
    
    const timeX = textX;
    const dotX = textX - timeOffset;
    const titleX = textX - titleOffset;
    
    let lineSvg = '';
    lineSvg += `<text x="${timeX}" y="${textY}" class="bold" font-size="${fontSize}" text-anchor="end" fill="black">${item.time}</text>`;
    lineSvg += `<circle cx="${dotX}" cy="${textY - 3.5}" r="1.5" fill="black" />`;
    lineSvg += `<text x="${titleX}" y="${textY}" class="regular" font-size="${fontSize}" text-anchor="end" fill="black">${rleText}</text>`;
    return svg + lineSvg;
  } else {
    return svg + `<text x="${textX}" y="${textY}" class="bold" font-size="${fontSize}" text-anchor="end" fill="black">${rleText}</text>`;
  }
}

/**
 * Clean and simplify holiday names for tiny display cells (stripped of Nikud)
 */
function simplifyHoliday(name) {
  if (!name) return '';
  const plainName = stripNikud(name);
  return plainName
    .replace('ערב ', 'ע׳ ')
    .replace('שבועות', 'שבועות')
    .replace('ראש השנה', 'ר׳ השנה')
    .replace('יום הכיפורים', 'כיפור')
    .replace('סוכות', 'סוכות')
    .replace('שמיני עצרת', 'שמ׳ עצרת')
    .replace('שמחת תורה', 'שמ׳ תורה')
    .replace('חנוכה', 'חנוכה')
    .replace('פורים', 'פורים')
    .replace('פסח', 'פסח')
    .replace('יום העצמאות', 'עצמאות')
    .replace('יום הזיכרון', 'זיכרון');
}

/**
 * Render weather icon path based on OpenWeatherMap icon code
 */
function getWeatherIconSvg(iconCode) {
  let iconSvg = '';
  
  if (!iconCode) {
    iconCode = '01d';
  }

  // Clear sky (sun)
  if (iconCode.startsWith('01')) {
    iconSvg = `
      <circle cx="0" cy="0" r="14" fill="none" stroke="black" stroke-width="3" />
      <g stroke="black" stroke-width="3" stroke-linecap="round">
        <line x1="0" y1="-18" x2="0" y2="-24" />
        <line x1="0" y1="18" x2="0" y2="24" />
        <line x1="-18" y1="0" x2="-24" y2="0" />
        <line x1="18" y1="0" x2="24" y2="0" />
        <line x1="-13" y1="-13" x2="-17" y2="-17" />
        <line x1="13" y1="13" x2="17" y2="17" />
        <line x1="13" y1="-13" x2="17" y2="-17" />
        <line x1="-13" y1="13" x2="17" y2="-17" />
      </g>
    `;
  }
  // Clouds
  else if (iconCode.startsWith('02') || iconCode.startsWith('03') || iconCode.startsWith('04')) {
    iconSvg = `
      <path d="M-15,10 C-22,10 -25,5 -22,-2 C-25,-9 -17,-15 -10,-12 C-6,-18 5,-18 9,-12 C16,-15 22,-8 20,-2 C24,5 18,10 11,10 Z" 
            fill="none" stroke="black" stroke-width="3" stroke-linejoin="round" />
    `;
    if (iconCode.startsWith('02')) {
      iconSvg = `
        <g transform="translate(-8, -6)">
          <circle cx="0" cy="0" r="8" fill="none" stroke="black" stroke-width="2" />
          <line x1="0" y1="-11" x2="0" y2="-14" stroke="black" stroke-width="2" />
          <line x1="11" y1="0" x2="14" y2="0" stroke="black" stroke-width="2" stroke-linecap="round" />
          <line x1="8" y1="-8" x2="10" y2="-10" stroke="black" stroke-width="2" />
        </g>
        <path d="M-10,12 C-16,12 -19,8 -16,2 C-19,-4 -12,-9 -6,-7 C-3,-12 6,-12 9,-7 C15,-9 20,-4 18,2 C21,8 16,12 10,12 Z" 
              fill="white" stroke="black" stroke-width="3" stroke-linejoin="round" />
      `;
    }
  }
  // Rain
  else if (iconCode.startsWith('09') || iconCode.startsWith('10')) {
    iconSvg = `
      <path d="M-12,4 C-18,4 -21,0 -18,-5 C-21,-11 -15,-16 -9,-14 C-6,-19 4,-19 7,-14 C13,-16 18,-11 16,-5 C19,0 15,4 10,4 Z" 
            fill="none" stroke="black" stroke-width="3" stroke-linejoin="round" />
      <g stroke="black" stroke-width="2" stroke-linecap="round">
        <line x1="-8" y1="10" x2="-11" y2="16" />
        <line x1="0" y1="10" x2="-3" y2="16" />
        <line x1="8" y1="10" x2="5" y2="16" />
      </g>
    `;
  }
  // Thunderstorm
  else if (iconCode.startsWith('11')) {
    iconSvg = `
      <path d="M-12,4 C-18,4 -21,0 -18,-5 C-21,-11 -15,-16 -9,-14 C-6,-19 4,-19 7,-14 C13,-16 18,-11 16,-5 C19,0 15,4 10,4 Z" 
            fill="none" stroke="black" stroke-width="3" stroke-linejoin="round" />
      <path d="M-2,8 L4,12 L1,14 L5,19 L-1,15 L2,13 Z" fill="black" stroke="black" stroke-width="1" />
    `;
  }
  // Snow
  else if (iconCode.startsWith('13')) {
    iconSvg = `
      <path d="M-12,4 C-18,4 -21,0 -18,-5 C-21,-11 -15,-16 -9,-14 C-6,-19 4,-19 7,-14 C13,-16 18,-11 16,-5 C19,0 15,4 10,4 Z" 
            fill="none" stroke="black" stroke-width="3" stroke-linejoin="round" />
      <g stroke="black" stroke-width="2" stroke-linecap="round">
        <circle cx="-6" cy="12" r="1" fill="black" />
        <circle cx="0" cy="14" r="1" fill="black" />
        <circle cx="6" cy="12" r="1" fill="black" />
      </g>
    `;
  }
  // Fog
  else {
    iconSvg = `
      <g stroke="black" stroke-width="3" stroke-linecap="round">
        <line x1="-18" y1="-10" x2="18" y2="-10" />
        <line x1="-12" y1="-3" x2="12" y2="-3" />
        <line x1="-20" y1="4" x2="20" y2="4" />
        <line x1="-10" y1="11" x2="10" y2="11" />
      </g>
    `;
  }

  return iconSvg;
}

function parseKidEvents(events, tasks, reqDateStr) {
  const saharSchool = [];
  const solSchool = [];
  const afternoonActivities = [];

  const dayItems = [];

  if (Array.isArray(events)) {
    events.forEach(e => {
      if (e.date === reqDateStr) {
        dayItems.push(e);
      }
    });
  }

  if (Array.isArray(tasks)) {
    tasks.forEach(t => {
      if (t.date === reqDateStr) {
        dayItems.push(t);
      }
    });
  }

  dayItems.forEach(item => {
    let rawTitle = item.title || item.summary || item.description || '';
    let author = item.author || '';
    let kidName = author;
    let cleanTitle = rawTitle;

    const bracketMatch = rawTitle.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (bracketMatch) {
      kidName = bracketMatch[1].trim();
      cleanTitle = bracketMatch[2].trim();
    } else {
      const prefixMatch = rawTitle.match(/^([^:-]+)\s*[:-]\s*(.*)$/);
      if (prefixMatch) {
        const potentialKid = prefixMatch[1].trim();
        if (potentialKid === 'סהר' || potentialKid === 'סול' || potentialKid === 'חוגים') {
          if (potentialKid !== 'חוגים') {
            kidName = potentialKid;
          }
          cleanTitle = prefixMatch[2].trim();
        }
      }
    }
    cleanTitle = cleanTitle.replace(/[,:\s]+$/, '').trim();

    // Strip a trailing author signature some synced calendar events carry
    // (e.g. "...ים פיני מצנר" where author === "פיני"). Only strips when the
    // author's name appears near the very end of the title, to avoid
    // accidentally truncating legitimate text that happens to contain it.
    if (author) {
      const idx = cleanTitle.lastIndexOf(author);
      if (idx !== -1 && idx >= cleanTitle.length - (author.length + 12)) {
        cleanTitle = cleanTitle.slice(0, idx).replace(/[,:\-\s]+$/, '').trim();
      }
    }

    let timeStr = item.time || '';
    let hour = 8;
    let minute = 0;
    if (timeStr && timeStr.includes(':')) {
      const parts = timeStr.split(':').map(Number);
      hour = parts[0];
      minute = parts[1] || 0;
    }
    const timeInMinutes = hour * 60 + minute;

    const titleLower = cleanTitle.toLowerCase();
    const isAfternoonKeyword = cleanTitle.includes('חוג') || cleanTitle.includes('אימון') || cleanTitle.includes('נגינה') || cleanTitle.includes('ג\'ודו') || cleanTitle.includes('קרמיקה') || cleanTitle.includes('שחייה') || cleanTitle.includes('כדורסל') || cleanTitle.includes('מחול') || cleanTitle.includes('מקהלה') || cleanTitle.includes('חזרה') || cleanTitle.includes('קט-סל') || cleanTitle.includes('אתלטיקה');
    
    const kidNameResolved = kidName || (titleLower.includes('סול') ? 'סול' : (titleLower.includes('סהר') ? 'סהר' : ''));
    const panelDateObj = new Date(reqDateStr + 'T12:00:00');
    const dayOfWeek = panelDateObj.getDay();
    
    // School ends at 13:30 (Sun-Thu) or 12:00 (Fri). Anything at or after cutoff is Afternoon.
    const afternoonCutoff = (dayOfWeek === 5) ? 720 : 810; // 12:00 on Fri, 13:30 on Sun-Thu
    const isAfternoon = isAfternoonKeyword || timeInMinutes >= afternoonCutoff;

    const formattedItem = {
      title: cleanTitle,
      time: timeStr,
      kid: kidNameResolved || (author ? author : ''),
      rawItem: item
    };

    if (isAfternoon) {
      afternoonActivities.push(formattedItem);
    } else {
      if (formattedItem.kid === 'סול') {
        solSchool.push(formattedItem);
      } else {
        saharSchool.push(formattedItem);
      }
    }
  });

  const dedupList = (list) => {
    const unique = [];
    list.forEach(item => {
      const exists = unique.some(u => {
        const titleMatch = u.title.trim().toLowerCase() === item.title.trim().toLowerCase() || areTitlesSimilar(u.title, item.title);
        const timeMatch = (u.time || '') === (item.time || '');
        const kidMatch = u.kid === item.kid;
        return titleMatch && timeMatch && kidMatch;
      });
      if (!exists) {
        unique.push(item);
      }
    });
    return unique;
  };

  const dedupSahar = dedupList(saharSchool);
  const dedupSol = dedupList(solSchool);
  const dedupAfternoon = dedupList(afternoonActivities);

  const sortByTime = (a, b) => (a.time || '').localeCompare(b.time || '');
  dedupSahar.sort(sortByTime);
  dedupSol.sort(sortByTime);
  dedupAfternoon.sort(sortByTime);

  return { saharSchool: dedupSahar, solSchool: dedupSol, afternoonActivities: dedupAfternoon };
}

function areTitlesSimilar(a, b) {
  if (!a || !b) return false;
  const normalize = (s) => s.toLowerCase()
    .replace(/^\[.*?\]\s*/, '')
    .replace(/^(סול|סהר|אמא|אבא|פיני)\s*[:-]\s*/, '')
    .replace(/\b(חזרה|אימון|שיעור|חוג)\b/g, '')
    .replace(/[^\u0590-\u05FFa-z0-9]/g, '')
    .trim();
  const c1 = normalize(a);
  const c2 = normalize(b);
  if (!c1 || !c2) return false;
  return c1 === c2 || c1.includes(c2) || c2.includes(c1);
}

function getNoSchoolMessage(kid, panelDate) {
  // Check 1: Jewish Holiday with no school (First item wins)
  const holiday = getSchoolHoliday(panelDate);
  if (holiday) {
    return `${holiday} — אין לימודים`;
  }

  // Check 2: Saturday
  const dayOfWeek = panelDate.getDay();
  if (dayOfWeek === 6) {
    return 'יום שבת — אין לימודים';
  }

  // Check 3: Friday for Sol only
  if (kid === 'סול' && dayOfWeek === 5) {
    return 'יום שישי — אין לימודים';
  }

  // Fallback
  return 'אין לימודים';
}

function addMinutesToTime(timeStr, mins) {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  const [h, m] = timeStr.split(':').map(Number);
  const totalMins = h * 60 + m + mins;
  const endH = Math.floor(totalMins / 60);
  const endM = totalMins % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function getSchoolTimeRange(eventsList) {
  if (!eventsList || eventsList.length === 0) return '';
  const sorted = [...eventsList].filter(e => e.time).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  if (sorted.length === 0) return '';
  const firstTime = sorted[0].time;
  const lastEvent = sorted[sorted.length - 1];
  let endTimeStr = '';
  if (lastEvent.endTime) {
    endTimeStr = lastEvent.endTime;
  } else if (lastEvent.durationMinutes) {
    endTimeStr = addMinutesToTime(lastEvent.time, lastEvent.durationMinutes);
  } else if (lastEvent.rawItem && lastEvent.rawItem.durationMinutes) {
    endTimeStr = addMinutesToTime(lastEvent.time, lastEvent.rawItem.durationMinutes);
  } else {
    endTimeStr = addMinutesToTime(lastEvent.time, 45);
  }
  return `(${firstTime}-${endTimeStr})`;
}

function getSunriseIconSvg() {
  return `
    <g stroke="black" stroke-width="1.5" stroke-linecap="round" fill="none">
      <line x1="-9" y1="3" x2="9" y2="3" stroke-width="1.8" />
      <path d="M-6,3 A6,6 0 0,1 6,3" stroke-width="1.5" />
      <line x1="0" y1="-2" x2="0" y2="-6" stroke-width="1.5" />
      <line x1="-4" y1="-1" x2="-6" y2="-4" />
      <line x1="4" y1="-1" x2="6" y2="-4" />
    </g>
  `;
}

function getSunsetIconSvg() {
  return `
    <g stroke="black" stroke-width="1.5" stroke-linecap="round" fill="none">
      <line x1="-9" y1="3" x2="9" y2="3" stroke-width="1.8" />
      <path d="M-6,3 A6,6 0 0,1 6,3" stroke-width="1.5" stroke-dasharray="2,1" />
      <line x1="0" y1="-1" x2="0" y2="3" stroke-width="1.5" />
      <polyline points="-2.5,1 0,3.5 2.5,1" stroke-width="1.3" />
      <line x1="-4" y1="-1" x2="-6" y2="-4" />
      <line x1="4" y1="-1" x2="6" y2="-4" />
    </g>
  `;
}

function getMoonZzzGraphicSvg() {
  return `
    <g transform="translate(-4, 0)">
      <path d="M-6,-12 A12,12 0 1,0 10,6 A14,14 0 1,1 -6,-12 Z" fill="black" />
      <text x="7" y="-2" class="bold" font-size="10" fill="black">z</text>
      <text x="13" y="-8" class="bold" font-size="8" fill="black">z</text>
    </g>
  `;
}

function getSmilingSunGraphicSvg() {
  return `
    <g transform="translate(0, 0)">
      <circle cx="0" cy="0" r="11" fill="none" stroke="black" stroke-width="2" />
      <line x1="0" y1="-15" x2="0" y2="-18" stroke="black" stroke-width="2" stroke-linecap="round" />
      <line x1="0" y1="15" x2="0" y2="18" stroke="black" stroke-width="2" stroke-linecap="round" />
      <line x1="-15" y1="0" x2="-18" y2="0" stroke="black" stroke-width="2" stroke-linecap="round" />
      <line x1="15" y1="0" x2="18" y2="0" stroke="black" stroke-width="2" stroke-linecap="round" />
      <line x1="-11" y1="-11" x2="-13" y2="-13" stroke="black" stroke-width="2" stroke-linecap="round" />
      <line x1="11" y1="-11" x2="13" y2="-13" stroke="black" stroke-width="2" stroke-linecap="round" />
      <line x1="-11" y1="11" x2="-13" y2="13" stroke="black" stroke-width="2" stroke-linecap="round" />
      <line x1="11" y1="11" x2="13" y2="13" stroke="black" stroke-width="2" stroke-linecap="round" />
      <circle cx="-4" cy="-3" r="1.5" fill="black" />
      <circle cx="4" cy="-3" r="1.5" fill="black" />
      <path d="M-5,2 Q0,7 5,2" fill="none" stroke="black" stroke-width="1.8" stroke-linecap="round" />
    </g>
  `;
}

function getSparkleStarGraphicSvg() {
  return `
    <g transform="translate(0, 0)">
      <polygon points="0,-14 4,-4 14,-4 6,2 9,12 0,6 -9,12 -6,2 -14,-4 -4,-4" fill="none" stroke="black" stroke-width="2" stroke-linejoin="round" />
    </g>
  `;
}

function getCozyMugGraphicSvg() {
  return `
    <g transform="translate(-2, 0)">
      <rect x="-8" y="-4" width="16" height="16" rx="3" fill="none" stroke="black" stroke-width="2" />
      <path d="M8,-1 C12,-1 12,11 8,11" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" />
      <path d="M-4,-9 Q-2,-7 -4,-5 M0,-10 Q2,-8 0,-6 M4,-9 Q6,-7 4,-5" fill="none" stroke="black" stroke-width="1.5" stroke-linecap="round" />
    </g>
  `;
}

function getRoshHashanaGraphicSvg(dayNum) {
  if (dayNum === 1) {
    return `
      <g transform="translate(0, 0)">
        <path d="M0,-8 C-8,-14 -16,-5 -16,3 C-16,11 -5,15 0,10 C5,15 16,11 16,3 C16,-5 8,-14 0,-8 Z" fill="none" stroke="black" stroke-width="2.2" stroke-linejoin="round" />
        <path d="M0,-8 C0,-12 3,-15 5,-15" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" />
        <path d="M2,-12 C7,-15 12,-12 9,-8 Z" fill="black" />
      </g>
    `;
  } else {
    return `
      <g transform="translate(0, 0)">
        <path d="M-14,9 C-9,9 -5,4 -1,-2 C3,-8 9,-13 16,-11 C18,-10 16,-5 9,-1 C3,3 -3,14 -12,12 Z" fill="none" stroke="black" stroke-width="2.2" stroke-linejoin="round" />
        <line x1="-14" y1="9" x2="-12" y2="12" stroke="black" stroke-width="2" stroke-linecap="round" />
      </g>
    `;
  }
}

function getSukkotGraphicSvg() {
  return `
    <g transform="translate(0, 0)">
      <polygon points="0,-14 -15,12 15,12" fill="none" stroke="black" stroke-width="2.2" stroke-linejoin="round" />
      <line x1="0" y1="-14" x2="0" y2="12" stroke="black" stroke-width="1.8" />
      <path d="M-11,-9 L-4,-14 M-2,-14 L4,-11 M2,-14 L9,-9" stroke="black" stroke-width="2" stroke-linecap="round" />
    </g>
  `;
}

function getTorahScrollGraphicSvg() {
  return `
    <g transform="translate(0, 0)">
      <rect x="-10" y="-11" width="20" height="22" rx="2" ry="2" fill="none" stroke="black" stroke-width="2.2" />
      <line x1="-15" y1="-11" x2="-15" y2="11" stroke="black" stroke-width="2.8" stroke-linecap="round" />
      <line x1="15" y1="-11" x2="15" y2="11" stroke="black" stroke-width="2.8" stroke-linecap="round" />
      <line x1="-5" y1="-4" x2="5" y2="-4" stroke="black" stroke-width="1.8" stroke-linecap="round" />
      <line x1="-5" y1="3" x2="5" y2="3" stroke="black" stroke-width="1.8" stroke-linecap="round" />
    </g>
  `;
}

function getStarOfDavidGraphicSvg() {
  return `
    <g transform="translate(0, 0)">
      <polygon points="0,-14 13,8 -13,8" fill="none" stroke="black" stroke-width="2.2" stroke-linejoin="round" />
      <polygon points="0,14 13,-8 -13,-8" fill="none" stroke="black" stroke-width="2.2" stroke-linejoin="round" />
    </g>
  `;
}

function getNoSchoolVectorGraphic(msg, panelDate, kid) {
  if (!msg) msg = '';

  // 1. Rosh Hashana
  if (msg.includes('ראש השנה')) {
    const dayNum = panelDate.getDate() % 2;
    return getRoshHashanaGraphicSvg(dayNum);
  }

  // 2. Yom Kippur
  if (msg.includes('כיפור')) {
    return getRoshHashanaGraphicSvg(0);
  }

  // 3. Sukkot
  if (msg.includes('סוכות')) {
    return getSukkotGraphicSvg();
  }

  // 4. Hanukkah / Purim / Simchat Torah / Shmini Atzeret
  if (msg.includes('חנוכה') || msg.includes('פורים') || msg.includes('תורה') || msg.includes('עצרת')) {
    return getTorahScrollGraphicSvg();
  }

  // 5. Independence Day
  if (msg.includes('עצמאות')) {
    return getStarOfDavidGraphicSvg();
  }

  // 6. Generic Weekend & Rest Days Pool (Moon & ZZZ, Smiling Sun, Cozy Mug, Sparkle Star)
  const weekendPool = [
    getMoonZzzGraphicSvg(),
    getSmilingSunGraphicSvg(),
    getCozyMugGraphicSvg(),
    getSparkleStarGraphicSvg()
  ];

  const idx = (panelDate.getDate() + (kid === 'סול' ? 1 : 0)) % weekendPool.length;
  return weekendPool[idx];
}

function splitTextIntoLines(text, maxChars = 18) {
  if (!text) return [];
  if (text.length <= maxChars) return [text];
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  words.forEach(w => {
    const test = (cur + ' ' + w).trim();
    if (test.length <= maxChars) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  });
  if (cur) lines.push(cur);
  if (lines.length > 2) {
    let line2 = lines.slice(1).join(' ');
    if (line2.length > maxChars + 2) line2 = line2.substring(0, maxChars) + '..';
    return [lines[0], line2];
  }
  return lines;
}

function generateSvg({ date, events, tasks, weather }) {
  const todayDate = date;
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(todayDate.getDate() + 1);

  const WEEKDAYS_HE_FULL = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const MONTHS_HE_NAMES = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

  const todayName = WEEKDAYS_HE_FULL[todayDate.getDay()];
  const tomorrowName = WEEKDAYS_HE_FULL[tomorrowDate.getDay()];

  const todayStr = `היום — יום ${todayName}, ${todayDate.getDate()} ב${MONTHS_HE_NAMES[todayDate.getMonth()]}`;
  const tomorrowStr = `מחר — יום ${tomorrowName}, ${tomorrowDate.getDate()} ב${MONTHS_HE_NAMES[tomorrowDate.getMonth()]}`;

  const todayDateStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
  const tomorrowDateStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;

  const todayEvents = parseKidEvents(events, tasks, todayDateStr);
  const tomorrowEvents = parseKidEvents(events, tasks, tomorrowDateStr);

  const wTemp = (weather && weather.temp !== undefined) ? Math.round(weather.temp) : 28;
  const wDesc = stripNikud((weather && weather.description) || 'בהיר ונוח');
  const wMin = (weather && weather.tempMin !== undefined) ? Math.round(weather.tempMin) : 22;
  const wMax = (weather && weather.tempMax !== undefined) ? Math.round(weather.tempMax) : 32;
  const wCity = (weather && weather.city) || 'פרדסיה';
  const wIcon = (weather && weather.icon) || '01d';

  let svg = `<svg width="800" height="480" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg" style="background-color: white; direction: rtl;">`;
  svg += `<style>
    .bold { font-family: 'Rubik', 'Heebo', sans-serif; font-weight: 700; }
    .regular { font-family: 'Rubik', 'Heebo', sans-serif; font-weight: 400; }
    .white-text { fill: #ffffff; }
  </style>`;

  // ==========================================
  // LEFT STATION: WEATHER & CALENDAR (w: 240, h: 460, x: 10, y: 10)
  // ==========================================
  svg += `
    <!-- Station Card Container -->
    <rect x="10" y="10" width="240" height="460" rx="10" ry="10" fill="none" stroke="black" stroke-width="2" />
    
    <!-- Station Header Tab -->
    <path d="M 10 20 A 10 10 0 0 1 20 10 L 240 10 A 10 10 0 0 1 250 20 L 250 42 L 10 42 Z" fill="black" />
    <text x="130" y="31" class="bold white-text" font-size="13" text-anchor="middle">תחנת בית ומזג אוויר</text>

    <!-- Hero Weather Section -->
    <text x="85" y="98" class="bold" font-size="52" text-anchor="middle" fill="black">${wTemp}°</text>
    
    <!-- Weather Vector Icon -->
    <g transform="translate(170, 75) scale(1.15)">
      ${getWeatherIconSvg(wIcon)}
    </g>

    <text x="130" y="125" class="bold" font-size="13" text-anchor="middle" fill="black">\u202B${wCity}: ${wDesc}\u202C</text>
    <text x="130" y="145" class="regular" font-size="11.5" text-anchor="middle" fill="black">\u202Bטווח: ${wMin}° עד ${wMax}°\u202C</text>

    <!-- 4-Day Mini Forecast Bars -->
    <line x1="25" y1="158" x2="235" y2="158" stroke="black" stroke-width="1" />
    <text x="130" y="176" class="bold" font-size="11.5" text-anchor="middle" fill="black">תחזית לימים הקרובים</text>
  `;

  // Build 4-Day mini bars
  const forecastItems = [];
  const forecastStartIdx = (weather && Array.isArray(weather.forecast) && weather.forecast.length >= 5) ? 1 : 0;
  if (weather && Array.isArray(weather.forecast) && weather.forecast.length > forecastStartIdx) {
    for (let i = 0; i < 4; i++) {
      const fDate = new Date(todayDate);
      fDate.setDate(todayDate.getDate() + i);
      const dayLabel = (i === 0) ? 'היום' : (i === 1) ? 'מחר' : WEEKDAYS_HE_FULL[fDate.getDay()];
      const item = weather.forecast[forecastStartIdx + i] || {};
      forecastItems.push({
        label: dayLabel,
        tempMax: Math.round(item.tempMax || (wMax - i)),
        tempMin: Math.round(item.tempMin || (wMin - i))
      });
    }
  } else {
    forecastItems.push(
      { label: 'היום', tempMax: wMax, tempMin: wMin },
      { label: 'מחר', tempMax: wMax, tempMin: wMin },
      { label: WEEKDAYS_HE_FULL[(todayDate.getDay() + 2) % 7], tempMax: wMax - 1, tempMin: wMin },
      { label: WEEKDAYS_HE_FULL[(todayDate.getDay() + 3) % 7], tempMax: wMax - 2, tempMin: wMin - 1 }
    );
  }

  forecastItems.forEach((f, idx) => {
    const fy = 200 + idx * 22;
    const clampedMax = Math.max(18, Math.min(38, f.tempMax));
    const barWidth = Math.round(30 + ((clampedMax - 18) / 20) * 50);

    svg += `
      <text x="220" y="${fy}" class="regular" font-size="10.5" text-anchor="end" fill="black">${f.label}</text>
      <rect x="75" y="${fy - 10}" width="${barWidth}" height="12" fill="black" rx="3" />
      <text x="45" y="${fy}" class="bold" font-size="10.5" text-anchor="middle" fill="black">${f.tempMax}°</text>
    `;
  });

  // Upcoming Jewish Holiday Countdown Box
  const todayHoliday = getSchoolHoliday(todayDate);
  const nextHoliday = getNextUpcomingHoliday(todayDate, 30);
  svg += `<line x1="25" y1="288" x2="235" y2="288" stroke="black" stroke-width="1" />`;

  if (todayHoliday) {
    svg += `
      <rect x="25" y="298" width="210" height="66" rx="6" ry="6" fill="#f4f4f4" stroke="black" stroke-width="1.5" />
      <text x="130" y="318" class="bold" font-size="11.5" text-anchor="middle" fill="black">אירוע בלוח השנה</text>
      <text x="130" y="338" class="bold" font-size="12.5" text-anchor="middle" fill="black">\u202Bהיום: ${todayHoliday}!\u202C</text>
      <text x="130" y="354" class="regular" font-size="10" text-anchor="middle" fill="black">חופשת חג — אין לימודים</text>
    `;
  } else if (nextHoliday) {
    const daysAwayStr = nextHoliday.daysAway === 1 ? 'בעוד יום אחד' : nextHoliday.daysAway === 2 ? 'בעוד יומיים' : `בעוד ${nextHoliday.daysAway} ימים`;
    const hDate = nextHoliday.date;
    const hDayName = WEEKDAYS_HE_FULL[hDate.getDay()];
    const hFormatted = `${hDate.getDate()}.${hDate.getMonth() + 1}`;

    svg += `
      <rect x="25" y="298" width="210" height="66" rx="6" ry="6" fill="#f4f4f4" stroke="black" stroke-width="1.5" />
      <text x="130" y="318" class="bold" font-size="11.5" text-anchor="middle" fill="black">אירוע קרוב בלוח השנה</text>
      <text x="130" y="338" class="bold" font-size="12" text-anchor="middle" fill="black">\u202B${nextHoliday.name} (${daysAwayStr})\u202C</text>
      <text x="130" y="354" class="regular" font-size="9.5" text-anchor="middle" fill="black">\u202Bיום ${hDayName} ${hFormatted} — אין לימודים\u202C</text>
    `;
  } else {
    svg += `
      <rect x="25" y="298" width="210" height="66" rx="6" ry="6" fill="#f4f4f4" stroke="black" stroke-width="1.5" />
      <text x="130" y="325" class="bold" font-size="11.5" text-anchor="middle" fill="black">שגרה ברוכה</text>
      <text x="130" y="348" class="regular" font-size="10" text-anchor="middle" fill="black">אין חגים או חופשות קרובות</text>
    `;
  }

  // System Footer (Clean status - NO battery voltage as explicitly requested)
  const syncHour = String(date.getHours()).padStart(2, '0');
  const syncMin = String(date.getMinutes()).padStart(2, '0');

  svg += `
    <line x1="25" y1="384" x2="235" y2="384" stroke="black" stroke-width="1" />
    
    <!-- Wi-Fi vector icon & status centered as a unit at x=130 -->
    <g transform="translate(91, 408)">
      <path d="M-10,-4 A14,14 0 0,1 10,-4" fill="none" stroke="black" stroke-width="1.8" stroke-linecap="round" />
      <path d="M-6,0 A8,8 0 0,1 6,0" fill="none" stroke="black" stroke-width="1.8" stroke-linecap="round" />
      <circle cx="0" cy="4" r="1.8" fill="black" />
    </g>
    <text x="109" y="412" class="bold" font-size="11" text-anchor="start" fill="black">\u202Bמחובר לרשת\u202C</text>
    
    <text x="130" y="434" class="regular" font-size="10" text-anchor="middle" fill="black">\u202Bסנכרון: ${syncHour}:${syncMin} | רענון שעתי\u202C</text>
    <text x="130" y="450" class="regular" font-size="9.5" text-anchor="middle" fill="black">\u202B00:00 - 06:00 שינה עמוקה\u202C</text>
  `;

  // ==========================================
  // RIGHT MAIN AGENDA: TODAY & TOMORROW (w: 530, x: 260)
  // ==========================================
  const renderDayPanel = (y, titleStr, dayEvents, panelDate) => {
    let panel = `
      <!-- Day Container Box -->
      <rect x="260" y="${y}" width="530" height="224" rx="10" ry="10" fill="none" stroke="black" stroke-width="2" />
      
      <!-- Inverted Header Tab -->
      <path d="M 260 ${y + 10} A 10 10 0 0 1 270 ${y} L 780 ${y} A 10 10 0 0 1 790 ${y + 10} L 790 ${y + 30} L 260 ${y + 30} Z" fill="black" />
      <text x="525" y="${y + 20}" class="bold white-text" font-size="13.5" text-anchor="middle">\u202B${titleStr}\u202C</text>
      
      <!-- Column Dividers (Sahar: 620-790, Sol: 440-620, Afternoon: 260-440) -->
      <line x1="620" y1="${y + 30}" x2="620" y2="${y + 224}" stroke="black" stroke-dasharray="2,2" stroke-width="1" />
      <line x1="440" y1="${y + 30}" x2="440" y2="${y + 224}" stroke="black" stroke-width="1.5" />
    `;

    const holidayName = getSchoolHoliday(panelDate);

    function isHolidayTitle(title) {
      if (!title) return false;
      const clean = title.toLowerCase();
      return clean.includes('ראש השנה') || clean.includes('כיפור') || clean.includes('סוכות') || clean.includes('פסח') || clean.includes('חנוכה') || clean.includes('פורים') || clean.includes('חג') || clean.includes('אין לימודים');
    }

    const renderNoSchoolBox = (kid, xCenter) => {
      const msg = getNoSchoolMessage(kid, panelDate);
      const graphicSvg = getNoSchoolVectorGraphic(msg, panelDate, kid);
      return `
        <g transform="translate(${xCenter}, ${y + 86})">${graphicSvg}</g>
        <text x="${xCenter}" y="${y + 144}" class="bold" font-size="11.5" text-anchor="middle" fill="black">\u202B${msg}\u202C</text>
      `;
    };

    // Sahar Column (Right: x: 620 to 790)
    const saharTimeRange = getSchoolTimeRange(dayEvents.saharSchool);
    const saharHeader = saharTimeRange ? `סהר ${saharTimeRange}` : 'סהר (08:00 - 13:30)';
    panel += `<text x="705" y="${y + 48}" class="bold" font-size="11.5" text-anchor="middle" fill="black">\u202B${saharHeader}\u202C</text>`;

    const isSaharNoSchool = holidayName || !dayEvents.saharSchool || dayEvents.saharSchool.length === 0 || dayEvents.saharSchool.every(e => isHolidayTitle(e.title));
    if (isSaharNoSchool) {
      panel += renderNoSchoolBox('סהר', 705);
    } else {
      const list = dayEvents.saharSchool.slice(0, 7);
      const step = list.length > 5 ? 22 : 26;
      const startY = y + 68;
      list.forEach((item, idx) => {
        const iy = startY + idx * step;
        const timePrefix = item.time ? `${item.time}  ` : '';
        panel += `<text x="780" y="${iy}" class="regular" font-size="10.5" text-anchor="end" fill="black">\u202B${timePrefix}${truncateText(stripNikud(item.title), 14)}\u202C</text>`;
      });
    }

    // Sol Column (Center: x: 440 to 620)
    const solTimeRange = getSchoolTimeRange(dayEvents.solSchool);
    const solHeader = solTimeRange ? `סול ${solTimeRange}` : 'סול (08:15 - 13:00)';
    panel += `<text x="530" y="${y + 48}" class="bold" font-size="11.5" text-anchor="middle" fill="black">\u202B${solHeader}\u202C</text>`;

    const isSolNoSchool = holidayName || !dayEvents.solSchool || dayEvents.solSchool.length === 0 || dayEvents.solSchool.every(e => isHolidayTitle(e.title));
    if (isSolNoSchool) {
      panel += renderNoSchoolBox('סול', 530);
    } else {
      const list = dayEvents.solSchool.slice(0, 7);
      const step = list.length > 5 ? 22 : 26;
      const startY = y + 68;
      list.forEach((item, idx) => {
        const iy = startY + idx * step;
        const timePrefix = item.time ? `${item.time}  ` : '';
        panel += `<text x="608" y="${iy}" class="regular" font-size="10.5" text-anchor="end" fill="black">\u202B${timePrefix}${truncateText(stripNikud(item.title), 14)}\u202C</text>`;
      });
    }

    // Afternoon Column (Left: x: 260 to 440)
    panel += `
      <rect x="272" y="${y + 36}" width="156" height="20" rx="4" ry="4" fill="black" />
      <text x="350" y="${y + 50}" class="bold white-text" font-size="11" text-anchor="middle">פעילות אחה"צ</text>
    `;

    if (!dayEvents.afternoonActivities || dayEvents.afternoonActivities.length === 0) {
      panel += `
        <g transform="translate(350, ${y + 95})">
          <polygon points="0,-12 3,-3 12,-3 5,2 8,10 0,5 -8,10 -5,2 -12,-3 -3,-3" fill="none" stroke="black" stroke-width="1.8" />
        </g>
        <text x="350" y="${y + 140}" class="bold" font-size="11.5" text-anchor="middle" fill="black">אין פעילות</text>
      `;
    } else {
      const activities = dayEvents.afternoonActivities.slice(0, 3);
      if (activities.length === 1) {
        const act = activities[0];
        const cleanTitle = stripNikud(act.title).replace(/^\[.*?\]\s*/, '').trim();
        const kidBadge = act.kid ? `[${act.kid}] ` : '';
        const titleLines = splitTextIntoLines(cleanTitle, 16);
        const timeDisplay = act.time || '17:00';
        const pillWidth = timeDisplay.length > 6 ? 84 : 54;
        const pillX = 418 - pillWidth;

        panel += `
          <rect x="272" y="${y + 64}" width="156" height="74" rx="6" ry="6" fill="#f8f8f8" stroke="black" stroke-width="1.5" />
          <rect x="${pillX}" y="${y + 72}" width="${pillWidth}" height="18" rx="4" ry="4" fill="black" />
          <text x="${pillX + pillWidth / 2}" y="${y + 85}" class="bold white-text" font-size="10" text-anchor="middle">${timeDisplay}</text>
          
          <text x="418" y="${y + 108}" class="bold" font-size="12" text-anchor="end" fill="black">\u202B${kidBadge}${titleLines[0] || ''}\u202C</text>
        `;
        if (titleLines[1]) {
          panel += `<text x="418" y="${y + 126}" class="regular" font-size="10.5" text-anchor="end" fill="black">\u202B${titleLines[1]}\u202C</text>`;
        }
      } else {
        let actY = y + 62;
        activities.forEach((act) => {
          if (actY > y + 175) return;
          const cleanTitle = stripNikud(act.title).replace(/^\[.*?\]\s*/, '').trim();
          const kidBadge = act.kid ? `[${act.kid}] ` : '';
          const boxHeight = activities.length === 2 ? 50 : 44;

          panel += `
            <rect x="272" y="${actY}" width="156" height="${boxHeight}" rx="5" ry="5" fill="#f8f8f8" stroke="black" stroke-width="1.2" />
            <text x="418" y="${actY + 18}" class="bold" font-size="10.5" text-anchor="end" fill="black">\u202B${act.time} ${kidBadge}${truncateText(cleanTitle, 13)}\u202C</text>
          `;
          actY += boxHeight + 6;
        });
      }
    }

    return panel;
  };

  svg += renderDayPanel(10, todayStr, todayEvents, todayDate);
  svg += renderDayPanel(246, tomorrowStr, tomorrowEvents, tomorrowDate);

  svg += `</svg>`;
  return svg;
}

/**
 * Renders the dashboard data as a 1-bit monochrome BMP buffer
 */
function renderBmp(data) {
  const svgString = generateSvg(data);

  const resvg = new Resvg(svgString, {
    font: {
      fontFiles: [
        path.join(process.cwd(), 'fonts', 'Rubik-Bold.ttf'),
        path.join(process.cwd(), 'fonts', 'Rubik-Regular.ttf'),
        path.join(process.cwd(), 'fonts', 'Rubik-Black.ttf'),
        path.join(process.cwd(), 'fonts', 'Heebo-Bold.ttf'),
        path.join(process.cwd(), 'fonts', 'Heebo-Regular.ttf')
      ],
      defaultFontFamily: 'Rubik',
      loadSystemFonts: false,
    },
    fitTo: {
      mode: 'width',
      value: 800,
    }
  });

  const renderResult = resvg.render();
  const width = renderResult.width;
  const height = renderResult.height;
  const pixels = renderResult.pixels;

  const pixelDataSize = width * height / 8;
  const headerSize = 62;
  const fileSize = headerSize + pixelDataSize;

  const bmpBuffer = Buffer.alloc(fileSize);

  // File Header
  bmpBuffer.write('BM', 0);
  bmpBuffer.writeUInt32LE(fileSize, 2);
  bmpBuffer.writeUInt16LE(0, 6);
  bmpBuffer.writeUInt16LE(0, 8);
  bmpBuffer.writeUInt32LE(headerSize, 10);

  // DIB Header
  bmpBuffer.writeUInt32LE(40, 14);
  bmpBuffer.writeInt32LE(width, 18);
  bmpBuffer.writeInt32LE(height, 22); // Positive height for bottom-to-top layout
  bmpBuffer.writeUInt16LE(1, 26);
  bmpBuffer.writeUInt16LE(1, 28);
  bmpBuffer.writeUInt32LE(0, 30);
  bmpBuffer.writeUInt32LE(pixelDataSize, 34);
  bmpBuffer.writeInt32LE(2835, 38);
  bmpBuffer.writeInt32LE(2835, 42);
  bmpBuffer.writeUInt32LE(2, 46);
  bmpBuffer.writeUInt32LE(2, 50);

  // Palette
  bmpBuffer.writeUInt32LE(0x00000000, 54);
  bmpBuffer.writeUInt32LE(0x00FFFFFF, 58);

  const destOffset = headerSize;
  for (let y = height - 1; y >= 0; y--) {
    const rowOffset = y * width;
    const destRowIdx = height - 1 - y;
    const destRowOffset = destOffset + destRowIdx * (width / 8);
    for (let byteIdx = 0; byteIdx < width / 8; byteIdx++) {
      let currentByte = 0;
      for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
        const pixelIdx = rowOffset + byteIdx * 8 + bitIdx;
        const r = pixels[pixelIdx * 4];
        const g = pixels[pixelIdx * 4 + 1];
        const b = pixels[pixelIdx * 4 + 2];
        const a = pixels[pixelIdx * 4 + 3];
        
        const val = (a < 128 || (r + g + b) / 3 > 127) ? 0 : 1;
        currentByte |= (val << (7 - bitIdx));
      }
      bmpBuffer[destRowOffset + byteIdx] = currentByte;
    }
  }

  return bmpBuffer;
}

module.exports = {
  renderBmp,
  generateSvg,
  parseKidEvents
};
