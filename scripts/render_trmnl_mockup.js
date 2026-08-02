const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { getJewishHolidays } = require('../holidays');

const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

const WEEKDAYS_HE_FULL = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function stripNikud(text) {
  if (!text) return '';
  return text.replace(/[\u0591-\u05C7]/g, '');
}

function truncateText(text, maxLength = 10) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength - 1) + '..' : text;
}

function simplifyHoliday(name) {
  if (!name) return '';
  const plainName = stripNikud(name);
  return plainName
    .replace('ערב ', 'ע׳ ')
    .replace('ראש השנה', 'ר׳ השנה')
    .replace('יום הכיפורים', 'כיפור')
    .replace('שמיני עצרת', 'שמ׳ עצרת')
    .replace('שמחת תורה', 'שמ׳ תורה')
    .replace('יום העצמאות', 'עצמאות')
    .replace('יום הזיכרון', 'זיכרון');
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

function getWeatherIconSvg(iconCode) {
  if (!iconCode) iconCode = '01d';
  if (iconCode.startsWith('01')) {
    return `
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
  } else if (iconCode.startsWith('02') || iconCode.startsWith('03') || iconCode.startsWith('04')) {
    return `
      <path d="M-15,10 C-22,10 -25,5 -22,-2 C-25,-9 -17,-15 -10,-12 C-6,-18 5,-18 9,-12 C16,-15 22,-8 20,-2 C24,5 18,10 11,10 Z" 
            fill="none" stroke="black" stroke-width="3" stroke-linejoin="round" />
    `;
  } else if (iconCode.startsWith('09') || iconCode.startsWith('10')) {
    return `
      <path d="M-12,4 C-18,4 -21,0 -18,-5 C-21,-11 -15,-16 -9,-14 C-6,-19 4,-19 7,-14 C13,-16 18,-11 16,-5 C19,0 15,4 10,4 Z" 
            fill="none" stroke="black" stroke-width="3" stroke-linejoin="round" />
      <g stroke="black" stroke-width="2" stroke-linecap="round">
        <line x1="-8" y1="10" x2="-11" y2="16" />
        <line x1="0" y1="10" x2="-3" y2="16" />
        <line x1="8" y1="10" x2="5" y2="16" />
      </g>
    `;
  } else {
    return `
      <g stroke="black" stroke-width="3" stroke-linecap="round">
        <line x1="-18" y1="-10" x2="18" y2="-10" />
        <line x1="-12" y1="-3" x2="12" y2="-3" />
        <line x1="-20" y1="4" x2="20" y2="4" />
      </g>
    `;
  }
}

function generateTRMNLSvg({ date, events, tasks, weather }) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  const yesterdayDate = new Date(date);
  yesterdayDate.setDate(date.getDate() - 1);
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(yesterdayDate);
    d.setDate(yesterdayDate.getDate() + i);
    weekDates.push(d);
  }

  const startWeek = weekDates[0];
  const endWeek = weekDates[6];

  let holidays = {};
  if (startWeek.getMonth() === endWeek.getMonth()) {
    holidays = getJewishHolidays(startWeek.getFullYear(), startWeek.getMonth() + 1);
  } else {
    const h1 = getJewishHolidays(startWeek.getFullYear(), startWeek.getMonth() + 1);
    const h2 = getJewishHolidays(endWeek.getFullYear(), endWeek.getMonth() + 1);
    holidays = { ...h1, ...h2 };
  }

  const pad = 12;
  const gap = 12;
  
  const leftX = pad;
  const leftWidth = 580;
  
  const rightX = leftX + leftWidth + gap;
  const rightWidth = 184;
  
  let svg = `<svg width="800" height="480" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg" style="background-color: white; direction: rtl;">`;

  svg += `
    <defs>
      <!-- Clip paths for card headers -->
      <clipPath id="right-card-clip">
        <rect x="0" y="0" width="${rightWidth}" height="252" rx="12" ry="12" />
      </clipPath>
      <clipPath id="left-card-clip">
        <rect x="0" y="0" width="${leftWidth}" height="456" rx="12" ry="12" />
      </clipPath>
    </defs>
    <style>
      .bold { font-family: 'Rubik Light', sans-serif; font-weight: 700; }
      .regular { font-family: 'Rubik Light', sans-serif; font-weight: 600; }
    </style>
  `;

  // ==========================================
  // SIDEBAR: CARD 1: GREGORIAN DATE BANNER (TRMNL High Contrast Black Fill)
  // ==========================================
  const dayName = WEEKDAYS_HE_FULL[date.getDay()];
  const dateBannerStr = `\u202Bיום ${dayName}\u202C`;
  const dateSubStr = `\u202B${date.getDate()}.${month}.${year}\u202C`;

  svg += `
    <!-- Date Banner Container -->
    <g transform="translate(${rightX}, ${pad})">
      <rect x="0" y="0" width="${rightWidth}" height="60" rx="12" ry="12" fill="black" />
      <text x="92" y="24" class="bold" font-size="16.5" text-anchor="middle" fill="white">${dateBannerStr}</text>
      <text x="92" y="45" class="regular" font-size="13" text-anchor="middle" fill="white">${dateSubStr}</text>
    </g>
  `;

  // ==========================================
  // SIDEBAR: CARD 2: WEATHER CARD
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
    <g transform="translate(${rightX}, ${pad + 60 + gap})">
      <rect x="0" y="0" width="${rightWidth}" height="120" rx="12" ry="12" fill="none" stroke="black" stroke-width="2" />
      <text x="172" y="42" class="bold" font-size="24" text-anchor="end" fill="black">${wTemp}</text>
      <text x="172" y="64" class="regular" font-size="11.5" text-anchor="end" fill="black">${wTempMin}° - ${wTempMax}°</text>
      <g transform="translate(46, 40) scale(0.9)">
        ${getWeatherIconSvg(wIcon)}
      </g>
      <text x="46" y="80" class="bold" font-size="10.5" text-anchor="middle" fill="black">\u202B${wDesc}\u202C</text>
      <text x="92" y="104" class="regular" font-size="9" text-anchor="middle" fill="black">\u202Bזריחה: ${wSunrise}  •  שקיעה: ${wSunset}\u202C</text>
    </g>
  `;

  // ==========================================
  // SIDEBAR: CARD 3: DAILY SCHEDULE (TRMNL Black Title Band & Checklist Checkboxes)
  // ==========================================
  const displayDateStr = `${date.getDate()}/${month}`;
  const scheduleHeight = 252;
  
  svg += `
    <!-- Schedule Card Container -->
    <g transform="translate(${rightX}, ${pad + 60 + gap + 120 + gap})">
      <rect x="0" y="0" width="${rightWidth}" height="${scheduleHeight}" rx="12" ry="12" fill="none" stroke="black" stroke-width="2" />
      
      <!-- Section Title Header Band -->
      <g clip-path="url(#right-card-clip)">
        <rect x="0" y="0" width="${rightWidth}" height="34" fill="black" />
        <text x="92" y="22" class="bold" font-size="13.5" text-anchor="middle" fill="white">לוז להיום - ${displayDateStr}</text>
      </g>
  `;

  if (tasks.length === 0) {
    svg += `<text x="92" y="140" class="bold" font-size="14.5" text-anchor="middle" fill="black">\u202Bאין משימות להיום\u202C</text>`;
  } else {
    tasks.slice(0, 5).forEach((task, idx) => {
      const rowY = 62 + idx * 40;
      const cleanDesc = stripNikud(task.description);
      const displayText = truncateText(cleanDesc, 16);
      const rleText = `\u202B${displayText}\u202C`;
      
      svg += `<text x="172" y="${rowY}" class="bold" font-size="12.5" text-anchor="end" fill="black">${task.time}</text>`;
      // Checkbox Border instead of dot
      svg += `<rect x="126" y="${rowY - 11}" width="11" height="11" rx="2.5" fill="none" stroke="black" stroke-width="1.5" />`;
      svg += `<text x="116" y="${rowY}" class="regular" font-size="12.5" text-anchor="end" fill="black">${rleText}</text>`;
    });
  }

  svg += `</g>`;

  // ==========================================
  // MAIN SECTION: CARD 4: WEEKLY AGENDA HORIZON (TRMNL Black Title Band & Day Progress Bar)
  // ==========================================
  const startOfWeek = weekDates[0];
  const endOfWeek = weekDates[6];
  const startMonthName = MONTHS_HE[startOfWeek.getMonth()];
  const endMonthName = MONTHS_HE[endOfWeek.getMonth()];
  let weekRangeStr = "";
  if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
    weekRangeStr = `${startOfWeek.getDate()} - ${endOfWeek.getDate()} ${startMonthName} ${startOfWeek.getFullYear()}`;
  } else {
    const startYear = startOfWeek.getFullYear();
    const endYear = endOfWeek.getFullYear();
    if (startYear === endYear) {
      weekRangeStr = `${startOfWeek.getDate()} ${startMonthName} - ${endOfWeek.getDate()} ${endMonthName} ${endYear}`;
    } else {
      weekRangeStr = `${startOfWeek.getDate()} ${startMonthName} ${startYear} - ${endOfWeek.getDate()} ${endMonthName} ${endYear}`;
    }
  }

  svg += `
    <!-- Weekly Agenda Card Container -->
    <g transform="translate(${leftX}, ${pad})">
      <rect x="0" y="0" width="${leftWidth}" height="456" rx="12" ry="12" fill="none" stroke="black" stroke-width="2" />
      
      <!-- Section Title Header Band with Day Progress Bar -->
      <g clip-path="url(#left-card-clip)">
        <rect x="0" y="0" width="${leftWidth}" height="34" fill="black" />
        <text x="565" y="22" class="bold" font-size="13.5" text-anchor="end" fill="white">\u202Bלוח שבועי: ${weekRangeStr}\u202C</text>
        
        <!-- Day Progress Bar (Simulating 45% of day elapsed) -->
        <text x="15" y="21" class="regular" font-size="9" text-anchor="start" fill="white">התקדמות יומית:</text>
        <rect x="90" y="13" width="70" height="7" rx="2" fill="none" stroke="white" stroke-width="1" />
        <rect x="92" y="15" width="31" height="3" rx="1" fill="white" />
      </g>
  `;

  const rowStartHeight = 34;
  const rowHeight = (452 - 34) / 7;
  
  for (let i = 0; i < 7; i++) {
    const d = weekDates[i];
    const rowY = rowStartHeight + i * rowHeight;
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isToday = d.getDate() === date.getDate(); // Custom mock date matching
    
    if (i < 6) {
      svg += `<line x1="15" y1="${rowY + rowHeight}" x2="565" y2="${rowY + rowHeight}" stroke="black" stroke-dasharray="3,3" stroke-width="1" />`;
    }
    
    const dayLabelStr = `\u202B${WEEKDAYS_HE_FULL[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}\u202C`;
    if (isToday) {
      svg += `<rect x="468" y="${rowY + 6}" width="90" height="38" rx="6" ry="6" fill="black" />`;
      svg += `<text x="513" y="${rowY + 30}" class="bold" font-size="13" text-anchor="middle" fill="white">${dayLabelStr}</text>`;
    } else {
      svg += `<text x="558" y="${rowY + 30}" class="bold" font-size="13" text-anchor="end" fill="black">${dayLabelStr}</text>`;
    }
    
    svg += `<line x1="458" y1="${rowY + 5}" x2="458" y2="${rowY + rowHeight - 5}" stroke="black" stroke-dasharray="2,2" stroke-width="1" />`;
    
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
      svg += `<text x="446" y="${rowY + 30}" class="regular" font-size="12.5" text-anchor="end" fill="black">\u202Bאין אירועים\u202C</text>`;
    } else if (items.length === 1) {
      svg = renderSingleEventCol(svg, 446, rowY + 30, 12.5, items[0], 60);
    } else if (items.length === 2) {
      svg = renderSingleEventCol(svg, 446, rowY + 18, 11, items[0], 58);
      svg = renderSingleEventCol(svg, 446, rowY + 38, 11, items[1], 58);
    } else if (items.length === 3) {
      svg = renderSingleEventCol(svg, 446, rowY + 18, 11, items[0], 26);
      svg = renderSingleEventCol(svg, 210, rowY + 18, 11, items[1], 23);
      svg = renderSingleEventCol(svg, 446, rowY + 38, 11, items[2], 26);
    } else if (items.length === 4) {
      svg = renderSingleEventCol(svg, 446, rowY + 18, 11, items[0], 26);
      svg = renderSingleEventCol(svg, 210, rowY + 18, 11, items[1], 23);
      svg = renderSingleEventCol(svg, 446, rowY + 38, 11, items[2], 26);
      svg = renderSingleEventCol(svg, 210, rowY + 38, 11, items[3], 23);
    } else {
      svg = renderSingleEventCol(svg, 446, rowY + 14, 10, items[0], 24);
      svg = renderSingleEventCol(svg, 210, rowY + 14, 10, items[1], 22);
      svg = renderSingleEventCol(svg, 446, rowY + 27, 10, items[2], 24);
      svg = renderSingleEventCol(svg, 210, rowY + 27, 10, items[3], 22);
      svg = renderSingleEventCol(svg, 446, rowY + 40, 10, items[4], 24);
      if (items.length >= 6) {
        svg = renderSingleEventCol(svg, 210, rowY + 40, 10, items[5], 22);
      }
    }
  }

  svg += `</g>`;
  svg += `</svg>`;
  return svg;
}

const mockData = {
  date: new Date('2026-07-15T12:00:00'),
  events: [
    { id: '1', date: '2026-07-01', title: 'פגישת פתיחה' },
    { id: '2', date: '2026-07-15', title: 'פרויקט דיו אלקטרוני אבן יהודה', author: 'פיני' },
    { id: '2b', date: '2026-07-15', title: 'סרט - סולטיר', isTimed: true, time: '16:30', author: 'סהר' },
    { id: '2c', date: '2026-07-15', title: 'תור לרופא עיניים', isTimed: true, time: '18:00' },
    { id: '3', date: '2026-07-28', title: 'יום הולדת' }
  ],
  tasks: [
    { id: 't1', date: '2026-07-15', time: '08:30', description: 'ריצה בבוקר בפארק' },
    { id: 't2', date: '2026-07-15', time: '10:00', description: 'פגישת צוות שבועית' },
    { id: 't3', date: '2026-07-15', time: '14:00', description: 'לעבוד על הדאשבורד' },
    { id: 't4', date: '2026-07-15', time: '19:30', description: 'ארוחת ערב משפחתית' }
  ],
  weather: {
    temp: 24,
    tempMin: 21,
    tempMax: 28,
    description: 'מעונן חלקית',
    city: 'פרדסיה',
    icon: '02d',
    sunrise: '05:42',
    sunset: '19:48'
  }
};

async function main() {
  const fontsDir = path.join(process.cwd(), 'fonts');
  const fontBuffers = [];
  if (fs.existsSync(fontsDir)) {
    fs.readdirSync(fontsDir).forEach(file => {
      if (file.endsWith('.ttf')) {
        fontBuffers.push(fs.readFileSync(path.join(fontsDir, file)));
      }
    });
  }

  const outPath = path.join('C:', 'Users', 'pini_', '.gemini', 'antigravity', 'brain', '914ca031-02a6-4823-8a9e-f54ff7ea71f5', 'trmnl_mockup.png');
  
  try {
    const svgString = generateTRMNLSvg(mockData);
    const resvg = new Resvg(svgString, {
      font: {
        fontBuffers,
        defaultFontFamily: 'Rubik Light',
        loadSystemFonts: false,
      },
      fitTo: {
        mode: 'width',
        value: 800,
      }
    });

    const pngBuffer = resvg.render().asPng();
    fs.writeFileSync(outPath, pngBuffer);
    console.log('Successfully saved TRMNL mockup to:', outPath);
  } catch (err) {
    console.error('Error rendering:', err);
  }
}

main();
