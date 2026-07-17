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

function renderSingleEventCol(svg, textX, textY, fontSize, item, maxLen) {
  if (item.isHoliday) {
    return svg + `<text x="${textX}" y="${textY}" class="bold" font-size="${fontSize}" text-anchor="end" fill="black">${truncateText(stripNikud(item.title), maxLen)}</text>`;
  }
  
  const authorSuffix = item.author ? ` [${item.author}]` : '';
  const cleanTitle = stripNikud(item.title);
  const truncatedTitle = truncateText(cleanTitle, maxLen);
  const displayText = truncatedTitle + authorSuffix;
  
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
    lineSvg += `<text x="${titleX}" y="${textY}" class="regular" font-size="${fontSize}" text-anchor="end" fill="black">${displayText}</text>`;
    return svg + lineSvg;
  } else {
    return svg + `<text x="${textX}" y="${textY}" class="bold" font-size="${fontSize}" text-anchor="end" fill="black">${displayText}</text>`;
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

function generateSvg({ date, events, tasks, weather }) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  // Fetch Jewish Holidays for this month
  const holidays = getJewishHolidays(year, month);

  // Hebrew weekday full and short lists
  const WEEKDAYS_HE_FULL = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

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

  // Layout Grid Dimensions (Option 1: Main Left 70%, Sidebar Right 30%)
  const pad = 12;
  const gap = 12;
  
  // Left Section (Weekly Horizon): X: 12, Width: 580px
  const leftX = pad;
  const leftWidth = 580;
  
  // Right Section (Sidebar): X: 604, Width: 184px
  const rightX = leftX + leftWidth + gap; // 12 + 580 + 12 = 604
  const rightWidth = 184;
  
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
  // SIDEBAR: CARD 1: WEATHER CARD (Top-Right, 100px Height)
  // ==========================================
  const wTemp = weather.temp !== undefined ? `${Math.round(weather.temp)}°C` : '--°C';
  const wTempMin = weather.tempMin !== undefined ? `${Math.round(weather.tempMin)}` : '--';
  const wTempMax = weather.tempMax !== undefined ? `${Math.round(weather.tempMax)}` : '--';
  const wDesc = stripNikud(weather.description || 'בהיר');
  const wIcon = weather.icon || '01d';
  const wSunrise = weather.sunrise || '05:42';
  const wSunset = weather.sunset || '19:48';

  svg += `
    <!-- Weather Card Container -->
    <g transform="translate(${rightX}, ${pad})">
      <rect x="0" y="0" width="${rightWidth}" height="100" rx="12" ry="12" fill="none" stroke="black" stroke-width="2" />
      
      <!-- Weather Icon Placement -->
      <g transform="translate(32, 22) scale(0.85)">
        ${getWeatherIconSvg(wIcon)}
      </g>
      <!-- Description under Icon -->
      <text x="32" y="76" class="bold" font-size="10" text-anchor="middle" fill="black">${wDesc}</text>
      
      <!-- Temperature -->
      <text x="92" y="44" class="bold" font-size="25" text-anchor="middle" fill="black">${wTemp}</text>
      <!-- Min/Max Temp Range -->
      <text x="92" y="68" class="regular" font-size="11.5" text-anchor="middle" fill="black">${wTempMin}° - ${wTempMax}°</text>
      
      <!-- Sunrise & Sunset -->
      <text x="172" y="44" class="regular" font-size="9" text-anchor="end" fill="black">זריחה: ${wSunrise}</text>
      <text x="172" y="68" class="regular" font-size="9" text-anchor="end" fill="black">שקיעה: ${wSunset}</text>
    </g>
  `;

  // ==========================================
  // SIDEBAR: CARD 2: GREGORIAN DATE BANNER (Middle-Right, 60px Height)
  // ==========================================
  const dayName = WEEKDAYS_HE_FULL[date.getDay()];
  const dateBannerStr = `יום ${dayName}`;
  const dateSubStr = `${date.getDate()}.${month}.${year}`;

  svg += `
    <!-- Date Banner Container -->
    <g transform="translate(${rightX}, ${pad + 100 + gap})">
      <rect x="0" y="0" width="${rightWidth}" height="60" rx="12" ry="12" fill="none" stroke="black" stroke-width="2" />
      
      <!-- Gregorian Date Banner -->
      <text x="92" y="24" class="bold" font-size="16" text-anchor="middle" fill="black">${dateBannerStr}</text>
      <text x="92" y="45" class="regular" font-size="13" text-anchor="middle" fill="black">${dateSubStr}</text>
    </g>
  `;

  // ==========================================
  // SIDEBAR: CARD 3: DAILY SCHEDULE (Bottom-Right, 284px Height)
  // ==========================================
  const displayDateStr = `${date.getDate()}/${month}`;
  const scheduleHeight = 480 - pad - (pad + 100 + gap + 60 + gap); // 480 - 12 - 184 = 284
  
  svg += `
    <!-- Schedule Card Container -->
    <g transform="translate(${rightX}, ${pad + 100 + gap + 60 + gap})">
      <rect x="0" y="0" width="${rightWidth}" height="${scheduleHeight}" rx="12" ry="12" fill="none" stroke="black" stroke-width="2" />
      
      <!-- Section Title -->
      <text x="172" y="26" class="bold" font-size="15" text-anchor="end" fill="black">לוז להיום - ${displayDateStr}</text>
      <line x1="12" y1="34" x2="172" y2="34" stroke="black" stroke-width="1.5" />
  `;

  if (tasks.length === 0) {
    svg += `<text x="92" y="140" class="bold" font-size="14.5" text-anchor="middle" fill="black">אין משימות להיום</text>`;
  } else {
    // Render up to 5 items
    tasks.slice(0, 5).forEach((task, idx) => {
      const rowY = 58 + idx * 40;
      const authorSuffix = task.author ? ` [${task.author}]` : '';
      const cleanDesc = stripNikud(task.description);
      const truncatedDesc = truncateText(cleanDesc, 11);
      const displayText = truncatedDesc + authorSuffix;
      
      // Draw hour
      svg += `<text x="172" y="${rowY}" class="bold" font-size="12.5" text-anchor="end" fill="black">${task.time}</text>`;
      // Dot separator
      svg += `<circle cx="130" cy="${rowY - 4}" r="2" fill="black" />`;
      // Draw task desc
      svg += `<text x="120" y="${rowY}" class="regular" font-size="12.5" text-anchor="end" fill="black">${displayText}</text>`;
    });
  }

  svg += `</g>`;

  // ==========================================
  // MAIN SECTION: CARD 4: WEEKLY AGENDA HORIZON (Left Section, 7 Rows)
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
    <g transform="translate(${leftX}, ${pad})">
      <rect x="0" y="0" width="${leftWidth}" height="456" rx="12" ry="12" fill="none" stroke="black" stroke-width="2" />
      
      <!-- Weekly Range Header -->
      <text x="565" y="26" class="bold" font-size="16" text-anchor="end" fill="black">לוח שבועי: ${weekRangeStr}</text>
      <line x1="15" y1="34" x2="565" y2="34" stroke="black" stroke-width="1.5" />
  `;

  // Draw 7 horizontal rows
  const rowStartHeight = 36;
  const rowHeight = 410 / 7; // 58.5px per row
  
  for (let i = 0; i < 7; i++) {
    const d = weekDates[i];
    const rowY = rowStartHeight + i * rowHeight;
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isToday = isSameDay(dStr, date);
    
    // Draw row bottom divider (except last)
    if (i < 6) {
      svg += `<line x1="15" y1="${rowY + rowHeight}" x2="565" y2="${rowY + rowHeight}" stroke="black" stroke-dasharray="3,3" stroke-width="1" />`;
    }
    
    // Day Label (RTL) - Right part of the row
    const dayLabelStr = `${WEEKDAYS_HE_FULL[i]} ${d.getDate()}/${d.getMonth() + 1}`;
    if (isToday) {
      // Draw highlighted black pill for today
      svg += `<rect x="468" y="${rowY + 8}" width="90" height="42" rx="6" ry="6" fill="black" />`;
      svg += `<text x="513" y="${rowY + 33}" class="bold" font-size="13.5" text-anchor="middle" fill="white">${dayLabelStr}</text>`;
    } else {
      svg += `<text x="558" y="${rowY + 33}" class="bold" font-size="13.5" text-anchor="end" fill="black">${dayLabelStr}</text>`;
    }
    
    // Day column divider
    svg += `<line x1="458" y1="${rowY + 6}" x2="458" y2="${rowY + rowHeight - 6}" stroke="black" stroke-dasharray="2,2" stroke-width="1" />`;
    
    // Fetch and sort events for this day
    const dayEvents = events.filter(e => e.date === dStr).sort((a, b) => {
      if (!a.isTimed && b.isTimed) return -1;
      if (a.isTimed && !b.isTimed) return 1;
      if (a.isTimed && b.isTimed) return (a.time || '').localeCompare(b.time || '');
      return 0;
    });
    
    const hol = holidays[dStr];
    const items = [];
    if (hol) items.push({ title: simplifyHoliday(hol), isHoliday: true, isTimed: false });
    dayEvents.forEach(e => items.push(e));
    
    if (items.length === 0) {
      svg += `<text x="446" y="${rowY + 33}" class="regular" font-size="13" text-anchor="end" fill="#888888">אין אירועים</text>`;
    } else if (items.length === 1) {
      svg = renderSingleEventCol(svg, 446, rowY + 33, 13, items[0], 46);
    } else if (items.length === 2) {
      svg = renderSingleEventCol(svg, 446, rowY + 22, 11, items[0], 54);
      svg = renderSingleEventCol(svg, 446, rowY + 42, 11, items[1], 54);
    } else if (items.length === 3) {
      svg = renderSingleEventCol(svg, 446, rowY + 16, 10, items[0], 60);
      svg = renderSingleEventCol(svg, 446, rowY + 31, 10, items[1], 60);
      svg = renderSingleEventCol(svg, 446, rowY + 46, 10, items[2], 60);
    } else if (items.length === 4) {
      svg = renderSingleEventCol(svg, 446, rowY + 22, 11, items[0], 20);
      svg = renderSingleEventCol(svg, 210, rowY + 22, 11, items[1], 17);
      svg = renderSingleEventCol(svg, 446, rowY + 42, 11, items[2], 20);
      svg = renderSingleEventCol(svg, 210, rowY + 42, 11, items[3], 17);
    } else {
      svg = renderSingleEventCol(svg, 446, rowY + 16, 10, items[0], 22);
      svg = renderSingleEventCol(svg, 210, rowY + 16, 10, items[1], 19);
      svg = renderSingleEventCol(svg, 446, rowY + 31, 10, items[2], 22);
      svg = renderSingleEventCol(svg, 210, rowY + 31, 10, items[3], 19);
      svg = renderSingleEventCol(svg, 446, rowY + 46, 10, items[4], 22);
      if (items.length >= 6) {
        svg = renderSingleEventCol(svg, 210, rowY + 46, 10, items[5], 19);
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
