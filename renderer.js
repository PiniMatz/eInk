const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { getJewishHolidays } = require('./holidays');

// Lazy-load fonts to ensure process.cwd() is resolved correctly during serverless execution
let fontBuffersCache = null;
function getFontBuffers() {
  if (fontBuffersCache) return fontBuffersCache;
  fontBuffersCache = [];
  const heeboBoldPath = path.join(process.cwd(), 'fonts', 'Heebo-Bold.ttf');
  const notoBoldPath = path.join(process.cwd(), 'fonts', 'NotoSansHebrew-Bold.ttf');
  if (fs.existsSync(heeboBoldPath)) {
    fontBuffersCache.push(fs.readFileSync(heeboBoldPath));
  }
  if (fs.existsSync(notoBoldPath)) {
    fontBuffersCache.push(fs.readFileSync(notoBoldPath));
  }
  return fontBuffersCache;
}

const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

const WEEKDAYS_HE = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];

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

/**
 * Generate the SVG markup for the 800x480 dashboard
 */
function generateSvg({ date, events, tasks, weather }) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const daysInMonth = getDaysInMonth(year, month);
  
  // Day of the week of the first day of the month (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const firstDayIndex = new Date(year, month - 1, 1).getDay();
  
  // Fetch Jewish Holidays for this month
  const holidays = getJewishHolidays(year, month);

  // Layout Grid Dimensions with 12px outer padding & 12px gap
  const pad = 12;
  const gap = 12;
  
  // Column 1 (Left 1/3): width 250px
  const col1X = pad;
  const col1Width = 250;
  
  // Column 2 (Right 2/3): width 514px
  const col2X = col1X + col1Width + gap; // 12 + 250 + 12 = 274
  const col2Width = 800 - pad - col2X;   // 800 - 12 - 274 = 514
  
  // Height partitions
  // Left side has two cards: Weather Card (height 140px) and Schedule Card (height 304px)
  const weatherY = pad;
  const weatherHeight = 140;
  
  const scheduleY = weatherY + weatherHeight + gap; // 12 + 140 + 12 = 164
  const scheduleHeight = 480 - pad - scheduleY;    // 480 - 12 - 164 = 304
  
  // Right side has one big Calendar Card (height 456px)
  const calendarY = pad;
  const calendarHeight = 480 - 2 * pad; // 480 - 24 = 456
  
  const cellWidth = col2Width / 7;      // 514 / 7 = 73.43 px
  const cellHeight = (calendarHeight - 82) / 6; // (456 - 82) / 6 = 62.33 px

  // Start constructing SVG string
  let svg = `<svg width="800" height="480" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg" style="background-color: white; direction: rtl;">`;

  // Global styling rules
  svg += `
    <style>
      .bold { font-family: 'Heebo', sans-serif; font-weight: bold; }
      .regular { font-family: 'Heebo', sans-serif; font-weight: normal; }
    </style>
  `;

  // ==========================================
  // CARD 1: WEATHER CARD (Top-Left, Rounded)
  // ==========================================
  const wTemp = weather.temp !== undefined ? `${Math.round(weather.temp)}°C` : '--°C';
  const wTempMin = weather.tempMin !== undefined ? `${Math.round(weather.tempMin)}` : '--';
  const wTempMax = weather.tempMax !== undefined ? `${Math.round(weather.tempMax)}` : '--';
  const wDesc = stripNikud(weather.description || 'בהיר');
  const wCity = stripNikud(weather.city || 'פרדסיה');
  const wIcon = weather.icon || '01d';
  const wSunrise = weather.sunrise || '05:42';
  const wSunset = weather.sunset || '19:48';

  // Left center is at x=68. Right center is at x=175.
  svg += `
    <!-- Weather Card Container -->
    <g transform="translate(${col1X}, ${weatherY})">
      <rect x="0" y="0" width="${col1Width}" height="${weatherHeight}" rx="12" ry="12" fill="none" stroke="black" stroke-width="2" />
      
      <!-- Weather Icon Placement (Centered at x=68, y=44) -->
      <g transform="translate(68, 44)">
        ${getWeatherIconSvg(wIcon)}
      </g>
      <!-- Description under Icon -->
      <text x="68" y="94" class="bold" font-size="13.5" text-anchor="middle" fill="black">${wDesc}</text>
      <!-- Location under Description -->
      <text x="68" y="112" class="bold" font-size="13.5" text-anchor="middle" fill="black">${wCity}</text>
      
      <!-- Temperature (Centered at x=175, y=52) -->
      <text x="175" y="52" class="bold" font-size="40" text-anchor="middle" fill="black">${wTemp}</text>
      <!-- Min/Max Temp Range under Temp (Centered at x=175, y=74) -->
      <text x="175" y="74" class="regular" font-size="13" text-anchor="middle" fill="black">${wTempMin}° - ${wTempMax}°</text>
      
      <!-- Sunrise & Sunset on Bottom Right (x=230, relative) -->
      <text x="230" y="104" class="regular" font-size="10.5" text-anchor="end" fill="black">זריחה: ${wSunrise}</text>
      <text x="230" y="122" class="regular" font-size="10.5" text-anchor="end" fill="black">שקיעה: ${wSunset}</text>
    </g>
  `;

  // ==========================================
  // CARD 2: DAILY SCHEDULE (Bottom-Left, Rounded)
  // ==========================================
  const displayDateStr = `${date.getDate()}/${month}`;
  svg += `
    <!-- Schedule Card Container -->
    <g transform="translate(${col1X}, ${scheduleY})">
      <rect x="0" y="0" width="${col1Width}" height="${scheduleHeight}" rx="12" ry="12" fill="none" stroke="black" stroke-width="2" />
      
      <!-- Section Title -->
      <text x="235" y="24" class="bold" font-size="15" text-anchor="end" fill="black">לוז יומי - ${displayDateStr}</text>
      <line x1="15" y1="32" x2="235" y2="32" stroke="black" stroke-width="1.5" />
  `;

  // Generate hourly slots
  const scheduleHours = [];
  for (let h = 6; h <= 23; h++) {
    scheduleHours.push(String(h).padStart(2, '0') + ':00');
  }

  const rowSpacing = 14.5;
  
  scheduleHours.forEach((hour, idx) => {
    const rowY = 46 + idx * rowSpacing;
    
    // Draw hour text
    svg += `<text x="235" y="${rowY}" class="bold" font-size="10.5" text-anchor="end" fill="black">${hour}</text>`;
    // Draw tiny dashed division lines
    svg += `<line x1="202" y1="${rowY + 3}" x2="235" y2="${rowY + 3}" stroke="black" stroke-width="0.5" stroke-dasharray="1,1" />`;

    // Find task
    const hourPrefix = hour.substring(0, 3);
    const task = tasks.find(t => t.time.startsWith(hourPrefix));
    if (task) {
      const cleanDesc = stripNikud(task.description);
      svg += `<text x="195" y="${rowY}" class="regular" font-size="10.5" text-anchor="end" fill="black">${truncateText(cleanDesc, 23)}</text>`;
    }
  });

  svg += `</g>`;

  // ==========================================
  // CARD 3: MONTHLY CALENDAR (Right, Rounded)
  // ==========================================
  const monthName = stripNikud(MONTHS_HE[month - 1]);
  const calCenter = col2Width / 2; // relative center of calendar card

  svg += `
    <!-- Calendar Card Container -->
    <g transform="translate(${col2X}, ${calendarY})">
      <rect x="0" y="0" width="${col2Width}" height="${calendarHeight}" rx="12" ry="12" fill="none" stroke="black" stroke-width="2" />
      
      <!-- Month Header -->
      <text x="${calCenter}" y="38" class="bold" font-size="26" text-anchor="middle" fill="black">${monthName} ${year}</text>
  `;

  // Weekday Headers
  WEEKDAYS_HE.forEach((day, idx) => {
    const cx = col2Width - (idx + 0.5) * cellWidth;
    svg += `<text x="${cx}" y="68" class="bold" font-size="15" text-anchor="middle" fill="black">${day}</text>`;
  });

  // Weekday bottom border line
  svg += `<line x1="0" y1="76" x2="${col2Width}" y2="76" stroke="black" stroke-width="2" />`;

  // Days Grid
  let dayCounter = 1;

  for (let row = 0; row < 6; row++) {
    const cellY = 76 + row * cellHeight;

    // Draw horizontal grid lines inside the card boundaries
    if (row > 0) {
      svg += `<line x1="0" y1="${cellY}" x2="${col2Width}" y2="${cellY}" stroke="black" stroke-width="1" />`;
    }

    for (let col = 0; col < 7; col++) {
      const cellX = col2Width - (col + 1) * cellWidth;

      // Draw vertical grid lines inside the card boundaries
      if (col > 0) {
        svg += `<line x1="${cellX + cellWidth}" y1="76" x2="${cellX + cellWidth}" y2="${calendarHeight}" stroke="black" stroke-width="1" />`;
      }

      const flatIndex = row * 7 + col;
      if (flatIndex >= firstDayIndex && dayCounter <= daysInMonth) {
        const currentDayVal = dayCounter;
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(currentDayVal).padStart(2, '0')}`;
        
        // Highlight current day
        const isCurrentDay = isSameDay(dateStr, date);

        if (isCurrentDay) {
          svg += `<circle cx="${cellX + cellWidth - 17}" cy="${cellY + 16}" r="10.5" fill="black" />`;
          svg += `<text x="${cellX + cellWidth - 17}" y="${cellY + 22}" class="bold" font-size="14" text-anchor="middle" fill="white">${currentDayVal}</text>`;
        } else {
          svg += `<text x="${cellX + cellWidth - 8}" y="${cellY + 20}" class="bold" font-size="14" text-anchor="end" fill="black">${currentDayVal}</text>`;
        }

        // Check for Jewish Holiday (clean Nikud)
        const holiday = holidays[dateStr];
        if (holiday) {
          const cleanHoliday = simplifyHoliday(holiday);
          svg += `<text x="${cellX + cellWidth / 2}" y="${cellY + 38}" class="bold" font-size="8.5" text-anchor="middle" fill="black">${truncateText(cleanHoliday, 11)}</text>`;
        }

        // Check for Calendar Event (clean Nikud)
        const dayEvent = events.find(e => e.date === dateStr);
        if (dayEvent) {
          const cleanEventTitle = stripNikud(dayEvent.title);
          const eventY = holiday ? cellY + 50 : cellY + 41;
          svg += `<text x="${cellX + cellWidth / 2}" y="${eventY}" class="regular" font-size="9" text-anchor="middle" fill="black">${truncateText(cleanEventTitle, 11)}</text>`;
        }

        dayCounter++;
      }
    }
  }

  svg += `</g></svg>`;
  return svg;
}

/**
 * Renders the dashboard data as a 1-bit monochrome BMP buffer
 */
function renderBmp(data) {
  const svgString = generateSvg(data);

  const resvg = new Resvg(svgString, {
    font: {
      fontBuffers: getFontBuffers(),
      defaultFontFamily: 'Heebo',
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
