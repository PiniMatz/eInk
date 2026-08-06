const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

// Load fonts
const fontBuffers = [];
const fontsDir = path.join(process.cwd(), 'fonts');
if (fs.existsSync(fontsDir)) {
  fs.readdirSync(fontsDir).forEach(file => {
    if (file.endsWith('.ttf')) {
      fontBuffers.push(fs.readFileSync(path.join(fontsDir, file)));
    }
  });
}

// Destination directory for mockup
const targetDir = path.join('C:', 'Users', 'pini_', '.gemini', 'antigravity', 'brain', 'ccd4a038-253a-4165-8105-413b31cd0b28');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Helper for weather icons in SVG
function getWeatherIconSvg(iconCode) {
  if (!iconCode) iconCode = '01d';
  if (iconCode.startsWith('01')) {
    // Sun
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
    // Clouds / Partly Cloudy
    return `
      <path d="M-15,10 C-22,10 -25,5 -22,-2 C-25,-9 -17,-15 -10,-12 C-6,-18 5,-18 9,-12 C16,-15 22,-8 20,-2 C24,5 18,10 11,10 Z" 
            fill="none" stroke="black" stroke-width="3" stroke-linejoin="round" />
    `;
  } else if (iconCode.startsWith('09') || iconCode.startsWith('10')) {
    // Rain
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
    // Wind / Fog
    return `
      <g stroke="black" stroke-width="3" stroke-linecap="round">
        <line x1="-18" y1="-10" x2="18" y2="-10" />
        <line x1="-12" y1="-3" x2="12" y2="-3" />
        <line x1="-20" y1="4" x2="20" y2="4" />
      </g>
    `;
  }
}

function stripNikud(text) {
  if (!text) return '';
  return text.replace(/[\u0591-\u05C7]/g, '');
}

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

function generateForecastMockupSvg({ date, events, tasks, weather, forecast }) {
  const pad = 12;
  const gap = 12;
  const leftX = pad;
  const leftWidth = 580;
  const rightX = leftX + leftWidth + gap;
  const rightWidth = 184;

  const yesterdayDate = new Date(date);
  yesterdayDate.setDate(date.getDate() - 1);
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(yesterdayDate);
    d.setDate(yesterdayDate.getDate() + i);
    weekDates.push(d);
  }

  const WEEKDAYS_HE_FULL = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const MONTHS_HE = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

  let svg = `<svg width="800" height="480" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg" style="background-color: white; direction: rtl;">`;

  svg += `
    <defs>
      <clipPath id="right-card-clip">
        <rect x="0" y="0" width="${rightWidth}" height="234" rx="12" ry="12" />
      </clipPath>
      <clipPath id="weather-card-clip">
        <rect x="0" y="0" width="${rightWidth}" height="138" rx="12" ry="12" />
      </clipPath>
      <clipPath id="left-card-clip">
        <rect x="0" y="0" width="${leftWidth}" height="450" rx="12" ry="12" />
      </clipPath>
    </defs>
    <style>
      .bold { font-family: 'Rubik Light', sans-serif; font-weight: 700; }
      .regular { font-family: 'Rubik Light', sans-serif; font-weight: 600; }
    </style>
  `;

  // Vertical line separator
  svg += `<line x1="598" y1="12" x2="598" y2="468" stroke="black" stroke-width="1.5" />`;

  // ==========================================
  // SIDEBAR: DATE BANNER
  // ==========================================
  const dayName = WEEKDAYS_HE_FULL[date.getDay()];
  const dateBannerStr = `\u202Bיום ${dayName}\u202C`;
  const dateSubStr = `\u202B${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}\u202C`;

  svg += `
    <g transform="translate(${rightX}, ${pad})">
      <rect x="0" y="0" width="${rightWidth}" height="60" rx="12" ry="12" fill="black" />
      <text x="92" y="24" class="bold" font-size="16.5" text-anchor="middle" fill="white">${dateBannerStr}</text>
      <text x="92" y="45" class="regular" font-size="13" text-anchor="middle" fill="white">${dateSubStr}</text>
    </g>
  `;

  // ==========================================
  // SIDEBAR: WEATHER CARD (TODAY)
  // ==========================================
  const wTemp = weather.temp !== undefined ? `${Math.round(weather.temp)}°C` : '--°C';
  const wTempMin = weather.tempMin !== undefined ? `${Math.round(weather.tempMin)}` : '--';
  const wTempMax = weather.tempMax !== undefined ? `${Math.round(weather.tempMax)}` : '--';
  const wDesc = stripNikud(weather.description || 'בהיר');
  const wIcon = weather.icon || '01d';
  const wSunrise = weather.sunrise || '05:42';
  const wSunset = weather.sunset || '19:48';

  svg += `
    <g transform="translate(${rightX}, ${pad + 60 + gap})">
      <rect x="0" y="0" width="${rightWidth}" height="138" rx="12" ry="12" fill="none" stroke="black" stroke-width="2" />
      <g clip-path="url(#weather-card-clip)">
        <rect x="0" y="0" width="${rightWidth}" height="32" fill="black" />
        <text x="92" y="21" class="bold" font-size="13" text-anchor="middle" fill="white">מזג אוויר</text>
      </g>
      <text x="172" y="72" class="bold" font-size="24" text-anchor="end" fill="black">${wTemp}</text>
      <text x="172" y="92" class="regular" font-size="11.5" text-anchor="end" fill="black">${wTempMin}° - ${wTempMax}°</text>
      <g transform="translate(46, 66) scale(0.85)">
        ${getWeatherIconSvg(wIcon)}
      </g>
      <text x="46" y="98" class="bold" font-size="11" text-anchor="middle" fill="black">\u202B${wDesc}\u202C</text>
      <text x="92" y="122" class="regular" font-size="9.5" text-anchor="middle" fill="black">\u202Bזריחה: ${wSunrise}  •  שקיעה: ${wSunset}\u202C</text>
    </g>
  `;

  // ==========================================
  // SIDEBAR: DAILY SCHEDULE
  // ==========================================
  const scheduleHeight = 234;
  svg += `
    <g transform="translate(${rightX}, ${pad + 60 + gap + 138 + gap})">
      <rect x="0" y="0" width="${rightWidth}" height="${scheduleHeight}" rx="12" ry="12" fill="none" stroke="black" stroke-width="2" />
      <g clip-path="url(#right-card-clip)">
        <rect x="0" y="0" width="${rightWidth}" height="32" fill="black" />
        <text x="92" y="21" class="bold" font-size="13" text-anchor="middle" fill="white">לוז להיום - ${date.getDate()}/${date.getMonth() + 1}</text>
      </g>
  `;

  tasks.slice(0, 5).forEach((task, idx) => {
    const rowY = 56 + idx * 38;
    const cleanDesc = stripNikud(task.description);
    const displayText = truncateText(cleanDesc, 13);
    
    svg += `<rect x="161" y="${rowY - 11}" width="11" height="11" rx="2.5" fill="none" stroke="black" stroke-width="1.5" />`;
    if (idx === 0 || idx === 1) {
      svg += `<path d="M 163.5 ${rowY - 5.5} L 166.5 ${rowY - 2.5} L 169.5 ${rowY - 8.5}" fill="none" stroke="black" stroke-width="1.5" stroke-linecap="round" />`;
    }
    svg += `<text x="150" y="${rowY}" class="bold" font-size="12.5" text-anchor="end" fill="black">${task.time}</text>`;
    svg += `<text x="105" y="${rowY}" class="regular" font-size="12.5" text-anchor="end" fill="black">\u202B${displayText}\u202C</text>`;
  });
  svg += `</g>`;

  // ==========================================
  // MAIN SECTION: WEEKLY HORIZON CALENDAR
  // ==========================================
  const startOfWeek = weekDates[0];
  const endOfWeek = weekDates[6];
  const startMonthName = MONTHS_HE[startOfWeek.getMonth()];
  const endMonthName = MONTHS_HE[endOfWeek.getMonth()];
  let weekRangeStr = `${startOfWeek.getDate()} - ${endOfWeek.getDate()} ${startMonthName} ${startOfWeek.getFullYear()}`;

  svg += `
    <g transform="translate(${leftX}, ${pad})">
      <rect x="0" y="0" width="${leftWidth}" height="450" rx="12" ry="12" fill="none" stroke="black" stroke-width="2" />
      <g clip-path="url(#left-card-clip)">
        <rect x="0" y="0" width="${leftWidth}" height="34" fill="black" />
        <text x="565" y="22" class="bold" font-size="13.5" text-anchor="end" fill="white">\u202Bלוח שבועי: ${weekRangeStr}\u202C</text>
      </g>
  `;

  const rowStartHeight = 34;
  const rowHeight = (446 - 34) / 7;

  for (let i = 0; i < 7; i++) {
    const d = weekDates[i];
    const rowY = rowStartHeight + i * rowHeight;
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isToday = d.getDate() === date.getDate();
    
    if (i < 6) {
      svg += `<line x1="15" y1="${rowY + rowHeight}" x2="565" y2="${rowY + rowHeight}" stroke="black" stroke-dasharray="3,3" stroke-width="1" />`;
    }

    // Day label
    const dayLabelStr = `\u202B${WEEKDAYS_HE_FULL[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}\u202C`;
    if (isToday) {
      svg += `<rect x="458" y="${rowY + 6}" width="100" height="38" rx="6" ry="6" fill="black" />`;
      svg += `<text x="548" y="${rowY + 30}" class="bold" font-size="13" text-anchor="end" fill="white">${dayLabelStr}</text>`;
    } else {
      svg += `<text x="548" y="${rowY + 30}" class="bold" font-size="13" text-anchor="end" fill="black">${dayLabelStr}</text>`;
    }

    svg += `<line x1="458" y1="${rowY + 5}" x2="458" y2="${rowY + rowHeight - 5}" stroke="black" stroke-dasharray="2,2" stroke-width="1" />`;

    // RENDER EVENTS
    const dayEvents = events.filter(e => e.date === dStr);
    const items = [];
    dayEvents.forEach(e => items.push(e));

    const hasWeather = items.length <= 2; // show weather for all days if 2 or fewer events

    if (items.length === 0) {
      svg += `<text x="446" y="${rowY + 30}" class="regular" font-size="12.5" text-anchor="end" fill="black">\u202Bאין אירועים\u202C</text>`;
    } else if (items.length === 1) {
      const maxLen = hasWeather ? 48 : 60;
      svg = renderSingleEventCol(svg, 446, rowY + 30, 12.5, items[0], maxLen);
    } else if (items.length === 2) {
      const maxLen = hasWeather ? 46 : 58;
      svg = renderSingleEventCol(svg, 446, rowY + 18, 11, items[0], maxLen);
      svg = renderSingleEventCol(svg, 446, rowY + 38, 11, items[1], maxLen);
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

    // INTEGRATED WEATHER FORECAST ON THE FAR LEFT (for all 7 days)
    if (hasWeather && forecast[i]) {
      const f = forecast[i];
      svg += `
        <!-- Forecast Widget -->
        <g transform="translate(25, ${rowY + 28}) scale(0.6)">
          ${getWeatherIconSvg(f.icon)}
        </g>
        <text x="54" y="${rowY + 33}" class="bold" font-size="11.5" text-anchor="start" fill="black">${f.tempMin}°-${f.tempMax}°</text>
        <line x1="102" y1="${rowY + 12}" x2="102" y2="${rowY + 46}" stroke="black" stroke-width="0.8" stroke-dasharray="1,2" />
      `;
    }
  }

  svg += `</g>`;
  
  // Footer last sync
  svg += `<text x="20" y="473" class="regular" font-size="9" text-anchor="start" fill="black">סנכרון אחרון: 23:21</text>`;

  svg += `</svg>`;
  return svg;
}

const mockData = {
  date: new Date('2026-08-06T12:00:00'), // Thursday
  events: [
    { date: '2026-08-05', title: 'פגישת פתיחה' },
    { date: '2026-08-06', title: 'פרויקט דיו אלקטרוני', author: 'פיני' },
    { date: '2026-08-06', title: 'סרט - סולטיר', isTimed: true, time: '16:30', author: 'סהר' },
    { date: '2026-08-07', title: 'ערב שבת משפחתי באבן יהודה' },
    { date: '2026-08-08', title: 'טיול משפחתי לשבת' }
  ],
  tasks: [
    { time: '08:30', description: 'ריצה בבוקר בפארק' },
    { time: '10:00', description: 'פגישת צוות שבועית' },
    { time: '14:00', description: 'לעבוד על הדאשבורד' },
    { time: '19:30', description: 'ארוחת ערב משפחתית' }
  ],
  weather: {
    temp: 29,
    tempMin: 22,
    tempMax: 30,
    description: 'מעונן חלקית',
    city: 'פרדסיה',
    icon: '02d',
    sunrise: '05:42',
    sunset: '19:48'
  },
  forecast: [
    { icon: '02d', tempMin: 21, tempMax: 29 }, // Yesterday (Wed)
    { icon: '02d', tempMin: 22, tempMax: 30 }, // Today (Thu)
    { icon: '01d', tempMin: 22, tempMax: 31 }, // Tomorrow (Fri)
    { icon: '09d', tempMin: 20, tempMax: 26 }, // Sat
    { icon: '01d', tempMin: 21, tempMax: 29 }, // Sun
    { icon: '01d', tempMin: 22, tempMax: 30 }, // Mon
    { icon: '02d', tempMin: 22, tempMax: 30 }  // Tue
  ]
};

async function main() {
  const filePath = path.join(targetDir, 'mockup_weather_7day.png');
  const svgString = generateForecastMockupSvg(mockData);
  
  try {
    const resvg = new Resvg(svgString, {
      font: {
        fontBuffers,
        defaultFontFamily: 'Rubik',
        loadSystemFonts: false,
      },
      fitTo: {
        mode: 'width',
        value: 800,
      }
    });
    
    const pngBuffer = resvg.render().asPng();
    fs.writeFileSync(filePath, pngBuffer);
    console.log(`Successfully generated mockup: ${filePath}`);
  } catch (err) {
    console.error(`Error rendering mockup:`, err.message);
  }
}

main();
