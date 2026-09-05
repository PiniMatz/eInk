const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { getJewishHolidays, getSchoolHoliday } = require('./holidays');


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
      const colonMatch = rawTitle.match(/^([^:]+):\s*(.*)$/);
      if (colonMatch) {
        const potentialKid = colonMatch[1].trim();
        if (potentialKid === 'סהר' || potentialKid === 'סול' || potentialKid === 'חוגים') {
          if (potentialKid !== 'חוגים') {
            kidName = potentialKid;
          }
          cleanTitle = colonMatch[2].trim();
        }
      }
    }
    cleanTitle = cleanTitle.replace(/[,:\s]+$/, '').trim();

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
    const isAfternoonKeyword = cleanTitle.includes('חוג') || cleanTitle.includes('אימון') || cleanTitle.includes('נגינה') || cleanTitle.includes('ג\'ודו') || cleanTitle.includes('קרמיקה') || cleanTitle.includes('שחייה') || cleanTitle.includes('כדורסל') || cleanTitle.includes('מחול') || cleanTitle.includes('מקהלה') || cleanTitle.includes('קט-סל') || cleanTitle.includes('אתלטיקה');
    const isAfternoon = timeInMinutes >= 930 || isAfternoonKeyword;

    const formattedItem = {
      title: cleanTitle,
      time: timeStr,
      kid: kidName || (titleLower.includes('סול') ? 'סול' : 'סהר'),
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
  const clean = s => s.toLowerCase().replace(/[^\u0590-\u05FFa-z0-9]/g, '').trim();
  return clean(a) === clean(b);
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

  let svg = `<svg width="800" height="480" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg" style="background-color: white; direction: rtl;">`;
  svg += `<style>.bold{font-family:'Rubik Light', sans-serif;font-weight:700;}.regular{font-family:'Rubik Light', sans-serif;font-weight:600;}</style>`;
  svg += `<defs>
    <clipPath id="top-card-clip"><rect x="0" y="0" width="606" height="224" rx="10" ry="10" /></clipPath>
    <clipPath id="bot-card-clip"><rect x="0" y="0" width="606" height="224" rx="10" ry="10" /></clipPath>
    <clipPath id="weather-sidebar-clip"><rect x="0" y="0" width="156" height="456" rx="10" ry="10" /></clipPath>
  </defs>`;

  // ==========================================
  // LEFT SIDEBAR: COMPACT 3-DAY WEATHER (x: 12, width: 156, height: 456)
  // ==========================================
  const wTemp = (weather && weather.temp !== undefined) ? `${Math.round(weather.temp)}°C` : '--°C';
  const wDesc = stripNikud((weather && weather.description) || 'שמש חלקית');
  const wSunrise = (weather && weather.sunrise) || '05:42';
  const wSunset = (weather && weather.sunset) || '19:48';

  svg += `
    <g transform="translate(12, 10)">
      <rect x="0" y="0" width="156" height="456" rx="10" ry="10" fill="none" stroke="black" stroke-width="2" />
      <g clip-path="url(#weather-sidebar-clip)">
        <rect x="0" y="0" width="156" height="30" fill="black" />
        <text x="78" y="20" class="bold" font-size="12.5" text-anchor="middle" fill="white">מזג אוויר 3 ימים</text>
      </g>
      
      <!-- Current Main Temp Block -->
      <text x="78" y="54" class="bold" font-size="21" text-anchor="middle" fill="black">${wTemp}</text>
      <text x="78" y="70" class="regular" font-size="10.5" text-anchor="middle" fill="black">\u202B${wDesc}\u202C</text>
      
      <!-- Sunrise & Sunset Vector Icons + Times -->
      <g transform="translate(36, 88)">${getSunriseIconSvg()}</g>
      <text x="49" y="91" class="regular" font-size="9.5" fill="black">${wSunrise}</text>
      
      <g transform="translate(95, 88)">${getSunsetIconSvg()}</g>
      <text x="108" y="91" class="regular" font-size="9.5" fill="black">${wSunset}</text>

      <line x1="12" y1="102" x2="144" y2="102" stroke="black" stroke-width="1" />
  `;

  // Build 3-Day Forecast Items
  const day2Date = new Date(todayDate);
  day2Date.setDate(todayDate.getDate() + 2);
  const day2Name = WEEKDAYS_HE_FULL[day2Date.getDay()];

  let forecast3Day = [];
  if (weather && Array.isArray(weather.forecast) && weather.forecast.length >= 3) {
    forecast3Day = weather.forecast.slice(0, 3);
  } else {
    forecast3Day = [
      { day: `היום (${todayDate.getDate()}.${todayDate.getMonth()+1})`, icon: weather?.icon || '02d', tempMin: weather?.tempMin || 22, tempMax: weather?.tempMax || 31, description: weather?.description || 'מעונן חלקית' },
      { day: `מחר (${tomorrowDate.getDate()}.${tomorrowDate.getMonth()+1})`, icon: '01d', tempMin: 23, tempMax: 32, description: 'בהיר' },
      { day: `${day2Name} (${day2Date.getDate()}.${day2Date.getMonth()+1})`, icon: '01d', tempMin: 24, tempMax: 33, description: 'נאה' }
    ];
  }

  forecast3Day.forEach((w, idx) => {
    const wy = 108 + idx * 114;
    if (idx > 0) {
      svg += `<line x1="12" y1="${wy - 8}" x2="144" y2="${wy - 8}" stroke="black" stroke-dasharray="2,2" stroke-width="1" />`;
    }
    const dayTitle = w.day || (idx === 0 ? `היום (${todayDate.getDate()}.${todayDate.getMonth()+1})` : idx === 1 ? `מחר (${tomorrowDate.getDate()}.${tomorrowDate.getMonth()+1})` : `${day2Name} (${day2Date.getDate()}.${day2Date.getMonth()+1})`);
    const fDesc = stripNikud(w.description || w.desc || '');
    svg += `<text x="78" y="${wy + 14}" class="bold" font-size="11" text-anchor="middle" fill="black">${dayTitle}</text>`;
    svg += `<g transform="translate(78, ${wy + 40}) scale(0.6)">${getWeatherIconSvg(w.icon)}</g>`;
    svg += `<text x="78" y="${wy + 68}" class="regular" font-size="10" text-anchor="middle" fill="black">${fDesc}</text>`;
    svg += `<text x="78" y="${wy + 88}" class="bold" font-size="11.5" text-anchor="middle" fill="black">${Math.round(w.tempMin)}° - ${Math.round(w.tempMax)}°</text>`;
  });

  svg += `</g>`;

  // ==========================================
  // RIGHT MAIN PANEL: STACKED 2-DAY SCHEDULE (x: 182, width: 606)
  // ==========================================
  const mainX = 182;
  const mainW = 606;
  const colW = mainW / 3;

  const renderDayPanel = (y, titleStr, dayEvents, clipId, panelDate) => {
    let panel = `
      <g transform="translate(${mainX}, ${y})">
        <rect x="0" y="0" width="${mainW}" height="224" rx="10" ry="10" fill="none" stroke="black" stroke-width="2" />
        <g clip-path="url(#${clipId})">
          <rect x="0" y="0" width="${mainW}" height="30" fill="black" />
          <text x="${mainW / 2}" y="20" class="bold" font-size="13.5" text-anchor="middle" fill="white">\u202B${titleStr}\u202C</text>
        </g>
    `;

    // Helper to render No-School graphic & message with empty line space
    const renderNoSchoolBox = (kid, xCenter, panelDate) => {
      const msg = getNoSchoolMessage(kid, panelDate);
      const graphicSvg = getNoSchoolVectorGraphic(msg, panelDate, kid);

      let boxHtml = `<g>`;
      boxHtml += `<g transform="translate(${xCenter}, 82)">${graphicSvg}</g>`;
      boxHtml += `<text x="${xCenter}" y="142" class="bold" font-size="11.5" text-anchor="middle" fill="black">\u202B${msg}\u202C</text>`;
      boxHtml += `</g>`;
      return boxHtml;
    };

    // Sahar Column Header & List (x: 404 to 606)
    const saharTimeRange = getSchoolTimeRange(dayEvents.saharSchool);
    const saharHeader = saharTimeRange ? `סהר ${saharTimeRange}` : 'סהר';
    panel += `<text x="${mainW - colW / 2}" y="48" class="bold" font-size="11.5" text-anchor="middle" fill="black">\u202B${saharHeader}\u202C</text>`;
    panel += `<line x1="${mainW - colW}" y1="30" x2="${mainW - colW}" y2="224" stroke="black" stroke-dasharray="2,2" stroke-width="1" />`;
    if (!dayEvents.saharSchool || dayEvents.saharSchool.length === 0) {
      panel += renderNoSchoolBox('סהר', mainW - colW / 2, panelDate);
    } else {
      const list = dayEvents.saharSchool.slice(0, 7);
      const step = list.length > 5 ? 23 : 30;
      const startY = list.length > 5 ? 65 : 68;
      const fontSz = list.length > 5 ? "10.5" : "11.5";
      list.forEach((item, idx) => {
        const iy = startY + idx * step;
        panel += `<text x="${mainW - 12}" y="${iy}" class="regular" font-size="${fontSz}" text-anchor="end" fill="black">\u202B${item.time} ${truncateText(stripNikud(item.title), 14)}\u202C</text>`;
      });
    }

    // Sol Column Header & List (x: 202 to 404)
    const solTimeRange = getSchoolTimeRange(dayEvents.solSchool);
    const solHeader = solTimeRange ? `סול ${solTimeRange}` : 'סול';
    panel += `<text x="${colW * 1.5}" y="48" class="bold" font-size="11.5" text-anchor="middle" fill="black">\u202B${solHeader}\u202C</text>`;
    panel += `<line x1="${colW}" y1="30" x2="${colW}" y2="224" stroke="black" stroke-dasharray="2,2" stroke-width="1" />`;
    if (!dayEvents.solSchool || dayEvents.solSchool.length === 0) {
      panel += renderNoSchoolBox('סול', colW * 1.5, panelDate);
    } else {
      const list = dayEvents.solSchool.slice(0, 7);
      const step = list.length > 5 ? 23 : 30;
      const startY = list.length > 5 ? 65 : 68;
      const fontSz = list.length > 5 ? "10.5" : "11.5";
      list.forEach((item, idx) => {
        const iy = startY + idx * step;
        panel += `<text x="${mainW - colW - 12}" y="${iy}" class="regular" font-size="${fontSz}" text-anchor="end" fill="black">\u202B${item.time} ${truncateText(stripNikud(item.title), 14)}\u202C</text>`;
      });
    }

    // Afternoon Column (x: 0 to 202)
    panel += `<text x="${colW / 2}" y="48" class="bold" font-size="12" text-anchor="middle" fill="black">פעילות אחה"צ</text>`;
    if (!dayEvents.afternoonActivities || dayEvents.afternoonActivities.length === 0) {
      panel += `<g>
                  <g transform="translate(${colW / 2}, 82)">${getSparkleStarGraphicSvg()}</g>
                  <text x="${colW / 2}" y="142" class="bold" font-size="11.5" text-anchor="middle" fill="black">אין פעילות</text>
                </g>`;
    } else {
      const list = dayEvents.afternoonActivities.slice(0, 5);
      list.forEach((item, idx) => {
        const iy = 68 + idx * 30;
        const kidBadge = item.kid ? `[${item.kid}] ` : '';
        panel += `<text x="${colW - 12}" y="${iy}" class="regular" font-size="11.5" text-anchor="end" fill="black">\u202B${item.time} ${kidBadge}${truncateText(stripNikud(item.title), 12)}\u202C</text>`;
      });
    }

    panel += `</g>`;
    return panel;
  };

  svg += renderDayPanel(10, todayStr, todayEvents, "top-card-clip", todayDate);
  svg += renderDayPanel(242, tomorrowStr, tomorrowEvents, "bot-card-clip", tomorrowDate);

  // Status Footer
  const syncHour = String(date.getHours()).padStart(2, '0');
  const syncMin = String(date.getMinutes()).padStart(2, '0');
  svg += `<text x="20" y="474" class="regular" font-size="8.5" fill="black">סנכרון אחרון: ${syncHour}:${syncMin}</text>`;

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
        path.join(process.cwd(), 'fonts', 'Rubik-Black.ttf')
      ],
      defaultFontFamily: 'Rubik Light',
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
  generateSvg
};
