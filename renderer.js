const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { getJewishHolidays } = require('./holidays');


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

function generateSvg({ date, events, tasks, weather }) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const daysInMonth = getDaysInMonth(year, month);
  
  // Day of the week of the first day of the month (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const firstDayIndex = new Date(year, month - 1, 1).getDay();
  
  // Fetch Jewish Holidays for this month
  const holidays = getJewishHolidays(year, month);

  // Hebrew weekday full and short lists
  const WEEKDAYS_HE_FULL = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const WEEKDAYS_HE_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

  // Calculate current week dates (Sunday to Saturday)
  const currentDayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const sundayDate = new Date(date);
  sundayDate.setDate(date.getDate() - currentDayOfWeek);
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sundayDate);
    d.setDate(sundayDate.getDate() + i);
    weekDates.push(d);
  }

  // Layout Grid Dimensions with 12px outer padding & 12px gap
  const pad = 12;
  const gap = 12;
  
  // Column 1 (Left 1/3): width 250px
  const col1X = pad;
  const col1Width = 250;
  
  // Column 2 (Right 2/3): width 514px
  const col2X = col1X + col1Width + gap; // 12 + 250 + 12 = 274
  const col2Width = 800 - pad - col2X;   // 800 - 12 - 274 = 514
  
  // Height partitions (Top row 76px, Bottom row 368px)
  const weatherY = pad;
  const weatherHeight = 76;
  
  const scheduleY = weatherY + weatherHeight + gap; // 12 + 76 + 12 = 100
  const scheduleHeight = 480 - pad - scheduleY;    // 480 - 12 - 100 = 368
  
  const calendarY = pad;
  const calendarHeight = 368;
  
  // Start constructing SVG string
  let svg = `<svg width="800" height="480" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg" style="background-color: white; direction: rtl;">`;

  // Global styling rules - Using Rubik as primary font
  svg += `
    <style>
      .bold { font-family: 'Rubik', 'Noto Sans Hebrew', sans-serif; font-weight: bold; }
      .regular { font-family: 'Rubik', 'Noto Sans Hebrew', sans-serif; font-weight: normal; }
    </style>
  `;

  // ==========================================
  // CARD 1: WEATHER CARD (Top-Left, 76px Height)
  // ==========================================
  const wTemp = weather.temp !== undefined ? `${Math.round(weather.temp)}°C` : '--°C';
  const wTempMin = weather.tempMin !== undefined ? `${Math.round(weather.tempMin)}` : '--';
  const wTempMax = weather.tempMax !== undefined ? `${Math.round(weather.tempMax)}` : '--';
  const wDesc = stripNikud(weather.description || 'בהיר');
  const wCity = stripNikud(weather.city || 'פרדסיה');
  const wIcon = weather.icon || '01d';
  const wSunrise = weather.sunrise || '05:42';
  const wSunset = weather.sunset || '19:48';

  svg += `
    <!-- Weather Card Container -->
    <g transform="translate(${col1X}, ${weatherY})">
      <rect x="0" y="0" width="${col1Width}" height="${weatherHeight}" rx="12" ry="12" fill="none" stroke="black" stroke-width="2" />
      
      <!-- Weather Icon Placement (scaled and centered) -->
      <g transform="translate(45, 18) scale(0.85)">
        ${getWeatherIconSvg(wIcon)}
      </g>
      <!-- Description under Icon -->
      <text x="45" y="62" class="bold" font-size="11.5" text-anchor="middle" fill="black">${wDesc}</text>
      
      <!-- Temperature -->
      <text x="120" y="38" class="bold" font-size="32" text-anchor="middle" fill="black">${wTemp}</text>
      <!-- Min/Max Temp Range -->
      <text x="120" y="58" class="regular" font-size="12" text-anchor="middle" fill="black">${wTempMin}° - ${wTempMax}°</text>
      
      <!-- Sunrise & Sunset -->
      <text x="235" y="38" class="regular" font-size="11" text-anchor="end" fill="black">זריחה: ${wSunrise}</text>
      <text x="235" y="58" class="regular" font-size="11" text-anchor="end" fill="black">שקיעה: ${wSunset}</text>
    </g>
  `;

  // ==========================================
  // CARD 2: GREGORIAN DATE BANNER (Top-Right, 76px Height)
  // ==========================================
  const dayName = WEEKDAYS_HE_FULL[date.getDay()];
  const dateBannerStr = `יום ${dayName}, ${date.getDate()} ב${MONTHS_HE[month - 1]} ${year}`;

  svg += `
    <!-- Date Banner Container -->
    <g transform="translate(${col2X}, ${weatherY})">
      <rect x="0" y="0" width="${col2Width}" height="${weatherHeight}" rx="12" ry="12" fill="none" stroke="black" stroke-width="2" />
      
      <!-- Gregorian Date Banner -->
      <text x="257" y="46" class="bold" font-size="22" text-anchor="middle" fill="black">${dateBannerStr}</text>
    </g>
  `;

  // ==========================================
  // CARD 3: DAILY SCHEDULE (Bottom-Left, 368px Height)
  // ==========================================
  const displayDateStr = `${date.getDate()}/${month}`;
  svg += `
    <!-- Schedule Card Container -->
    <g transform="translate(${col1X}, ${scheduleY})">
      <rect x="0" y="0" width="${col1Width}" height="${scheduleHeight}" rx="12" ry="12" fill="none" stroke="black" stroke-width="2" />
      
      <!-- Section Title -->
      <text x="235" y="26" class="bold" font-size="16" text-anchor="end" fill="black">לוז יומי - ${displayDateStr}</text>
      <line x1="15" y1="34" x2="235" y2="34" stroke="black" stroke-width="1.5" />
  `;

  if (tasks.length === 0) {
    svg += `<text x="125" y="190" class="bold" font-size="14.5" text-anchor="middle" fill="black">אין משימות מתוכננות להיום</text>`;
  } else {
    // Render up to 7 items
    tasks.slice(0, 7).forEach((task, idx) => {
      const rowY = 64 + idx * 42;
      const authorSuffix = task.author ? ` [${task.author}]` : '';
      const cleanDesc = stripNikud(task.description) + authorSuffix;
      
      // Draw hour
      svg += `<text x="235" y="${rowY}" class="bold" font-size="13" text-anchor="end" fill="black">${task.time}</text>`;
      // Dot separator
      svg += `<circle cx="188" cy="${rowY - 4}" r="2" fill="black" />`;
      // Draw task desc
      svg += `<text x="176" y="${rowY}" class="regular" font-size="13" text-anchor="end" fill="black">${truncateText(cleanDesc, 19)}</text>`;
    });
  }

  svg += `</g>`;

  // ==========================================
  // CARD 4: WEEKLY AGENDA (Bottom-Right, 368px Height, 6 Columns)
  // ==========================================
  const sunday = weekDates[0];
  const saturday = weekDates[6];
  const startMonthName = MONTHS_HE[sunday.getMonth()];
  const endMonthName = MONTHS_HE[saturday.getMonth()];
  let weekRangeStr = "";
  if (sunday.getMonth() === saturday.getMonth()) {
    weekRangeStr = `${sunday.getDate()} - ${saturday.getDate()} ${startMonthName} ${year}`;
  } else {
    weekRangeStr = `${sunday.getDate()} ${startMonthName} - ${saturday.getDate()} ${endMonthName} ${year}`;
  }

  svg += `
    <!-- Weekly Agenda Card Container -->
    <g transform="translate(${col2X}, ${scheduleY})">
      <rect x="0" y="0" width="${col2Width}" height="${calendarHeight}" rx="12" ry="12" fill="none" stroke="black" stroke-width="2" />
      
      <!-- Weekly Range Header -->
      <text x="494" y="26" class="bold" font-size="16" text-anchor="end" fill="black">לוז שבועי: ${weekRangeStr}</text>
      <line x1="15" y1="34" x2="494" y2="34" stroke="black" stroke-width="1.5" />
  `;

  // Weekly columns
  const colWidth = col2Width / 6; // 514 / 6 = 85.66 px
  
  for (let col = 0; col < 6; col++) {
    const cellX = col2Width - (col + 1) * colWidth;
    
    // Vertical dividers
    if (col > 0) {
      svg += `<line x1="${cellX + colWidth}" y1="34" x2="${cellX + colWidth}" y2="${calendarHeight}" stroke="black" stroke-width="1" />`;
    }
    
    if (col < 5) {
      // Weekdays (Sunday to Thursday)
      const d = weekDates[col];
      const dayLetter = WEEKDAYS_HE_SHORT[col];
      const dayNum = d.getDate();
      
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isToday = isSameDay(dStr, date);
      
      // Header
      if (isToday) {
        svg += `<rect x="${cellX + 6}" y="38" width="${colWidth - 12}" height="38" rx="6" ry="6" fill="black" />`;
        svg += `<text x="${cellX + colWidth / 2}" y="53" class="bold" font-size="13" text-anchor="middle" fill="white">${dayLetter}</text>`;
        svg += `<text x="${cellX + colWidth / 2}" y="71" class="bold" font-size="15" text-anchor="middle" fill="white">${dayNum}</text>`;
      } else {
        svg += `<text x="${cellX + colWidth / 2}" y="52" class="bold" font-size="13" text-anchor="middle" fill="black">${dayLetter}</text>`;
        svg += `<text x="${cellX + colWidth / 2}" y="71" class="bold" font-size="17" text-anchor="middle" fill="black">${dayNum}</text>`;
      }
      
      // Divider
      svg += `<line x1="${cellX + 8}" y1="80" x2="${cellX + colWidth - 8}" y2="80" stroke="black" stroke-width="1" />`;
      
      // Events list
      const dayEvents = events.filter(e => e.date === dStr);
      const hol = holidays[dStr];
      const itemsToDraw = [];
      if (hol) itemsToDraw.push({ title: simplifyHoliday(hol), isHoliday: true });
      dayEvents.forEach(e => itemsToDraw.push({ title: e.title, author: e.author }));
      
      for (let i = 0; i < Math.min(itemsToDraw.length, 5); i++) {
        const item = itemsToDraw[i];
        const eventY = 92 + i * 50;
        const authorSuffix = item.author ? ` [${item.author}]` : '';
        const cleanTitle = stripNikud(item.title) + authorSuffix;
        
        svg += `<text x="${cellX + colWidth / 2}" y="${eventY + 14}" class="${item.isHoliday ? 'bold' : 'regular'}" font-size="12" text-anchor="middle" fill="black">${truncateText(cleanTitle, 10)}</text>`;
      }
    } else {
      // Column 6: Weekend (split Friday & Saturday)
      svg += `<line x1="0" y1="224" x2="${colWidth}" y2="224" stroke="black" stroke-width="1" />`;
      
      // Friday
      const dFri = weekDates[5];
      const dFriStr = `${dFri.getFullYear()}-${String(dFri.getMonth() + 1).padStart(2, '0')}-${String(dFri.getDate()).padStart(2, '0')}`;
      const isFriToday = isSameDay(dFriStr, date);
      const friDayNum = dFri.getDate();
      
      if (isFriToday) {
        svg += `<rect x="6" y="84" width="${colWidth - 12}" height="38" rx="6" ry="6" fill="black" />`;
        svg += `<text x="${colWidth / 2}" y="100" class="bold" font-size="13" text-anchor="middle" fill="white">ו׳</text>`;
        svg += `<text x="${colWidth / 2}" y="118" class="bold" font-size="15" text-anchor="middle" fill="white">${friDayNum}</text>`;
      } else {
        svg += `<text x="${colWidth / 2}" y="98" class="bold" font-size="13" text-anchor="middle" fill="black">ו׳</text>`;
        svg += `<text x="${colWidth / 2}" y="116" class="bold" font-size="17" text-anchor="middle" fill="black">${friDayNum}</text>`;
      }
      svg += `<line x1="8" y1="124" x2="${colWidth - 8}" y2="124" stroke="black" stroke-width="1" />`;
      
      const friEvents = events.filter(e => e.date === dFriStr);
      const friHol = holidays[dFriStr];
      const friItems = [];
      if (friHol) friItems.push({ title: simplifyHoliday(friHol), isHoliday: true });
      friEvents.forEach(e => friItems.push({ title: e.title, author: e.author }));
      
      for (let i = 0; i < Math.min(friItems.length, 3); i++) {
        const item = friItems[i];
        const eventY = 132 + i * 40;
        const authorSuffix = item.author ? ` [${item.author}]` : '';
        const cleanTitle = stripNikud(item.title) + authorSuffix;
        svg += `<text x="${colWidth / 2}" y="${eventY + 12}" class="${item.isHoliday ? 'bold' : 'regular'}" font-size="11.5" text-anchor="middle" fill="black">${truncateText(cleanTitle, 10)}</text>`;
      }
      
      // Saturday
      const dSat = weekDates[6];
      const dSatStr = `${dSat.getFullYear()}-${String(dSat.getMonth() + 1).padStart(2, '0')}-${String(dSat.getDate()).padStart(2, '0')}`;
      const isSatToday = isSameDay(dSatStr, date);
      const satDayNum = dSat.getDate();
      
      if (isSatToday) {
        svg += `<rect x="6" y="216" width="${colWidth - 12}" height="38" rx="6" ry="6" fill="black" />`;
        svg += `<text x="${colWidth / 2}" y="232" class="bold" font-size="13" text-anchor="middle" fill="white">ש׳</text>`;
        svg += `<text x="${colWidth / 2}" y="250" class="bold" font-size="15" text-anchor="middle" fill="white">${satDayNum}</text>`;
      } else {
        svg += `<text x="${colWidth / 2}" y="230" class="bold" font-size="13" text-anchor="middle" fill="black">ש׳</text>`;
        svg += `<text x="${colWidth / 2}" y="248" class="bold" font-size="17" text-anchor="middle" fill="black">${satDayNum}</text>`;
      }
      svg += `<line x1="8" y1="256" x2="${colWidth - 8}" y2="256" stroke="black" stroke-width="1" />`;
      
      const satEvents = events.filter(e => e.date === dSatStr);
      const satHol = holidays[dSatStr];
      const satItems = [];
      if (satHol) satItems.push({ title: simplifyHoliday(satHol), isHoliday: true });
      satEvents.forEach(e => satItems.push({ title: e.title, author: e.author }));
      
      for (let i = 0; i < Math.min(satItems.length, 3); i++) {
        const item = satItems[i];
        const eventY = 276 + i * 40;
        const authorSuffix = item.author ? ` [${item.author}]` : '';
        const cleanTitle = stripNikud(item.title) + authorSuffix;
        svg += `<text x="${colWidth / 2}" y="${eventY + 12}" class="${item.isHoliday ? 'bold' : 'regular'}" font-size="11.5" text-anchor="middle" fill="black">${truncateText(cleanTitle, 10)}</text>`;
      }
    }
  }

  svg += `</g>`;
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
        path.join(process.cwd(), 'fonts', 'NotoSansHebrew-Bold.ttf')
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
  generateSvg
};
