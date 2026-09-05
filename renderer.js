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

    let timeStr = item.time || '';
    let hour = 8;
    if (timeStr && timeStr.includes(':')) {
      hour = parseInt(timeStr.split(':')[0], 10);
    }

    const titleLower = cleanTitle.toLowerCase();
    const isAfternoonKeyword = cleanTitle.includes('חוג') || cleanTitle.includes('אימון') || cleanTitle.includes('נגינה') || cleanTitle.includes('ג\'ודו') || cleanTitle.includes('קרמיקה') || cleanTitle.includes('שחייה') || cleanTitle.includes('כדורסל') || cleanTitle.includes('מחול') || cleanTitle.includes('מקהלה');
    const isAfternoon = hour >= 13 || isAfternoonKeyword;

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

  svg += `
    <g transform="translate(12, 10)">
      <rect x="0" y="0" width="156" height="456" rx="10" ry="10" fill="none" stroke="black" stroke-width="2" />
      <g clip-path="url(#weather-sidebar-clip)">
        <rect x="0" y="0" width="156" height="30" fill="black" />
        <text x="78" y="20" class="bold" font-size="12.5" text-anchor="middle" fill="white">מזג אוויר 3 ימים</text>
      </g>
      
      <!-- Current Main Temp Block -->
      <text x="78" y="60" class="bold" font-size="22" text-anchor="middle" fill="black">${wTemp}</text>
      <text x="78" y="78" class="regular" font-size="11" text-anchor="middle" fill="black">\u202B${wDesc}\u202C</text>
      <line x1="12" y1="92" x2="144" y2="92" stroke="black" stroke-width="1" />
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
    const wy = 104 + idx * 114;
    if (idx > 0) {
      svg += `<line x1="12" y1="${wy - 8}" x2="144" y2="${wy - 8}" stroke="black" stroke-dasharray="2,2" stroke-width="1" />`;
    }
    const dayTitle = w.day || (idx === 0 ? `היום (${todayDate.getDate()}.${todayDate.getMonth()+1})` : idx === 1 ? `מחר (${tomorrowDate.getDate()}.${tomorrowDate.getMonth()+1})` : `${day2Name} (${day2Date.getDate()}.${day2Date.getMonth()+1})`);
    const fDesc = stripNikud(w.description || w.desc || '');
    svg += `<text x="78" y="${wy + 14}" class="bold" font-size="11.5" text-anchor="middle" fill="black">${dayTitle}</text>`;
    svg += `<g transform="translate(78, ${wy + 40}) scale(0.65)">${getWeatherIconSvg(w.icon)}</g>`;
    svg += `<text x="78" y="${wy + 72}" class="regular" font-size="10.5" text-anchor="middle" fill="black">${fDesc}</text>`;
    svg += `<text x="78" y="${wy + 92}" class="bold" font-size="12" text-anchor="middle" fill="black">${Math.round(w.tempMin)}° - ${Math.round(w.tempMax)}°</text>`;
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

    // Sahar Column (x: 404 to 606)
    panel += `<text x="${mainW - colW / 2}" y="48" class="bold" font-size="12" text-anchor="middle" fill="black">סהר</text>`;
    panel += `<line x1="${mainW - colW}" y1="30" x2="${mainW - colW}" y2="224" stroke="black" stroke-dasharray="2,2" stroke-width="1" />`;
    if (!dayEvents.saharSchool || dayEvents.saharSchool.length === 0) {
      const msg = getNoSchoolMessage('סהר', panelDate);
      panel += `<text x="${mainW - colW / 2}" y="120" class="regular" font-size="11.5" text-anchor="middle" fill="black">\u202B${msg}\u202C</text>`;
    } else {
      dayEvents.saharSchool.slice(0, 5).forEach((item, idx) => {
        const iy = 68 + idx * 30;
        panel += `<text x="${mainW - 12}" y="${iy}" class="regular" font-size="11.5" text-anchor="end" fill="black">\u202B${item.time} ${truncateText(stripNikud(item.title), 14)}\u202C</text>`;
      });
    }

    // Sol Column (x: 202 to 404)
    panel += `<text x="${colW * 1.5}" y="48" class="bold" font-size="12" text-anchor="middle" fill="black">סול</text>`;
    panel += `<line x1="${colW}" y1="30" x2="${colW}" y2="224" stroke="black" stroke-dasharray="2,2" stroke-width="1" />`;
    if (!dayEvents.solSchool || dayEvents.solSchool.length === 0) {
      const msg = getNoSchoolMessage('סול', panelDate);
      panel += `<text x="${colW * 1.5}" y="120" class="regular" font-size="11.5" text-anchor="middle" fill="black">\u202B${msg}\u202C</text>`;
    } else {
      dayEvents.solSchool.slice(0, 5).forEach((item, idx) => {
        const iy = 68 + idx * 30;
        panel += `<text x="${mainW - colW - 12}" y="${iy}" class="regular" font-size="11.5" text-anchor="end" fill="black">\u202B${item.time} ${truncateText(stripNikud(item.title), 14)}\u202C</text>`;
      });
    }

    // Afternoon Column (x: 0 to 202)
    panel += `<text x="${colW / 2}" y="48" class="bold" font-size="12" text-anchor="middle" fill="black">חוגים אחה"צ</text>`;
    if (!dayEvents.afternoonActivities || dayEvents.afternoonActivities.length === 0) {
      panel += `<text x="${colW / 2}" y="120" class="regular" font-size="12" text-anchor="middle" fill="black">אין חוגים</text>`;
    } else {
      dayEvents.afternoonActivities.slice(0, 5).forEach((item, idx) => {
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
