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

// Destination directory for mockups
const targetDir = path.join('C:', 'Users', 'pini_', '.gemini', 'antigravity', 'brain', 'ccd4a038-253a-4165-8105-413b31cd0b28');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Global SVG styling
const SVG_STYLE = `
  <style>
    .bold { font-family: 'Rubik', 'Rubik Light', 'Assistant', sans-serif; font-weight: 700; }
    .regular { font-family: 'Rubik', 'Rubik Light', 'Assistant', sans-serif; font-weight: 500; }
    .light { font-family: 'Rubik', 'Rubik Light', 'Assistant', sans-serif; font-weight: 300; }
    .border-card { fill: none; stroke: black; stroke-width: 2; }
    .header-pill { fill: black; }
    .header-text { fill: white; font-family: 'Rubik', sans-serif; font-weight: 700; font-size: 13px; text-anchor: middle; }
    .divider { stroke: black; stroke-width: 1; stroke-dasharray: 3,3; }
    .solid-divider { stroke: black; stroke-width: 1.5; }
  </style>
`;

// Helper for weather icons in SVG
function getWeatherIcon(iconCode, cx, cy, scale) {
  let inner = '';
  if (iconCode === 'sun') {
    inner = `
      <circle cx="0" cy="0" r="14" fill="none" stroke="black" stroke-width="2.5" />
      <g stroke="black" stroke-width="2.5" stroke-linecap="round">
        <line x1="0" y1="-18" x2="0" y2="-23" />
        <line x1="0" y1="18" x2="0" y2="23" />
        <line x1="-18" y1="0" x2="-23" y2="0" />
        <line x1="18" y1="0" x2="23" y2="0" />
        <line x1="-12" y1="-12" x2="-16" y2="-16" />
        <line x1="12" y1="12" x2="16" y2="16" />
        <line x1="12" y1="-12" x2="16" y2="-16" />
        <line x1="-12" y1="12" x2="-16" y2="16" />
      </g>
    `;
  } else if (iconCode === 'cloud') {
    inner = `
      <path d="M-12,8 C-17,8 -19,4 -17,-1 C-19,-6 -14,-10 -9,-8 C-6,-13 2,-13 5,-8 C10,-10 14,-6 13,-1 C16,4 12,8 7,8 Z" 
            fill="none" stroke="black" stroke-width="2.5" stroke-linejoin="round" />
    `;
  } else if (iconCode === 'rain') {
    inner = `
      <path d="M-10,4 C-15,4 -17,0 -15,-5 C-17,-10 -12,-14 -7,-12 C-4,-17 4,-17 7,-12 C12,-14 16,-10 15,-5 C18,0 14,4 9,4 Z" 
            fill="none" stroke="black" stroke-width="2.5" stroke-linejoin="round" />
      <g stroke="black" stroke-width="2" stroke-linecap="round">
        <line x1="-6" y1="9" x2="-8" y2="14" />
        <line x1="0" y1="9" x2="-2" y2="14" />
        <line x1="6" y1="9" x2="4" y2="14" />
      </g>
    `;
  } else if (iconCode === 'partly-cloudy') {
    inner = `
      <g transform="translate(-6, -4)">
        <circle cx="0" cy="0" r="8" fill="none" stroke="black" stroke-width="1.8" />
        <line x1="0" y1="-10" x2="0" y2="-12" stroke="black" stroke-width="1.8" />
        <line x1="10" y1="0" x2="12" y2="0" stroke="black" stroke-width="1.8" />
        <line x1="7" y1="-7" x2="9" y2="-9" stroke="black" stroke-width="1.8" />
      </g>
      <path d="M-10,8 C-15,8 -17,4 -14,0 C-17,-5 -11,-9 -6,-7 C-3,-11 5,-11 7,-7 C12,-9 16,-5 14,0 C17,4 13,8 8,8 Z" 
            fill="white" stroke="black" stroke-width="2.5" stroke-linejoin="round" />
    `;
  } else {
    // default/wind
    inner = `
      <line x1="-15" y1="-5" x2="10" y2="-5" stroke="black" stroke-width="2.5" stroke-linecap="round" />
      <path d="M10,-5 C13,-5 15,-3 15,-1 C15,1 13,3 10,3" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" />
      <line x1="-18" y1="3" x2="5" y2="3" stroke="black" stroke-width="2.5" stroke-linecap="round" />
      <path d="M5,3 C8,3 10,5 10,7 C10,9 8,11 5,11" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" />
    `;
  }
  return `<g transform="translate(${cx}, ${cy}) scale(${scale})">${inner}</g>`;
}

// ----------------------------------------------------
// MOCKUP 1: Quadrant Layout (Mashup Dashboard)
// ----------------------------------------------------
function getMockup1Svg() {
  const pad = 12;
  const gap = 12;
  const cw = 382; // (800 - 24 - 12)/2
  const ch = 222; // (480 - 24 - 12)/2

  let svg = `<svg width="800" height="480" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg" style="background-color: white; direction: rtl;">`;
  svg += SVG_STYLE;

  // Outer border & Grid separator lines
  svg += `<rect x="0" y="0" width="800" height="480" fill="none" stroke="black" stroke-width="3" />`;
  svg += `<line x1="400" y1="12" x2="400" y2="468" stroke="black" stroke-width="1.5" />`;
  svg += `<line x1="12" y1="240" x2="788" y2="240" stroke="black" stroke-width="1.5" />`;

  // Quadrant 1: Top-Right (Today's Gregorian & Hebrew Date Banner)
  svg += `
    <g transform="translate(406, 12)">
      <rect x="0" y="0" width="${cw}" height="${ch}" rx="12" ry="12" class="border-card" />
      <rect x="0" y="0" width="${cw}" height="34" rx="12" ry="12" class="header-pill" />
      <rect x="0" y="10" width="${cw}" height="24" fill="black" />
      <text x="${cw/2}" y="22" class="header-text">תאריך היום ושבת קרובה</text>
      
      <!-- Content -->
      <text x="${cw/2}" y="75" class="bold" font-size="28" text-anchor="middle" fill="black">יום חמישי</text>
      <text x="${cw/2}" y="108" class="regular" font-size="18" text-anchor="middle" fill="black">6 באוגוסט 2026</text>
      <text x="${cw/2}" y="135" class="regular" font-size="15" text-anchor="middle" fill="black">כ״ג באב ה׳תשפ״ו</text>
      
      <!-- Week Progress Bar -->
      <text x="50" y="180" class="regular" font-size="12" text-anchor="start" fill="black">התקדמות השבוע:</text>
      <rect x="160" y="170" width="170" height="12" rx="3" fill="none" stroke="black" stroke-width="1.5" />
      <rect x="162" y="172" width="120" height="8" rx="1.5" fill="black" />
      <text x="340" y="181" class="bold" font-size="12" text-anchor="start" fill="black">75%</text>
    </g>
  `;

  // Quadrant 2: Top-Left (Weather & Mini Forecast)
  svg += `
    <g transform="translate(12, 12)">
      <rect x="0" y="0" width="${cw}" height="${ch}" rx="12" ry="12" class="border-card" />
      <rect x="0" y="0" width="${cw}" height="34" rx="12" ry="12" class="header-pill" />
      <rect x="0" y="10" width="${cw}" height="24" fill="black" />
      <text x="${cw/2}" y="22" class="header-text">מזג אוויר וסביבה</text>
      
      <!-- Current weather -->
      ${getWeatherIcon('partly-cloudy', 60, 95, 1.2)}
      <text x="130" y="95" class="bold" font-size="34" text-anchor="start" fill="black">29°C</text>
      <text x="130" y="125" class="regular" font-size="13" text-anchor="start" fill="black">פרדסיה • מעונן חלקית</text>
      <text x="130" y="142" class="regular" font-size="11" text-anchor="start" fill="black">לחות: 65% • רוח: 14 קמ"ש</text>
      
      <line x1="20" y1="158" x2="${cw-20}" y2="158" class="divider" />
      
      <!-- Mini Forecast -->
      <!-- Tomorrow -->
      ${getWeatherIcon('sun', 50, 192, 0.65)}
      <text x="85" y="195" class="regular" font-size="11" text-anchor="start" fill="black">מחר: 30° / 22°</text>
      
      <!-- Friday -->
      ${getWeatherIcon('cloud', 190, 192, 0.65)}
      <text x="225" y="195" class="regular" font-size="11" text-anchor="start" fill="black">שישי: 29° / 21°</text>
      
      <!-- Saturday -->
      ${getWeatherIcon('rain', 315, 192, 0.65)}
      <text x="350" y="195" class="regular" font-size="11" text-anchor="start" fill="black">שבת: גשם</text>
    </g>
  `;

  // Quadrant 3: Bottom-Right (Checklist Checklist / Tasks)
  svg += `
    <g transform="translate(406, 246)">
      <rect x="0" y="0" width="${cw}" height="${ch}" rx="12" ry="12" class="border-card" />
      <rect x="0" y="0" width="${cw}" height="34" rx="12" ry="12" class="header-pill" />
      <rect x="0" y="10" width="${cw}" height="24" fill="black" />
      <text x="${cw/2}" y="22" class="header-text">משימות להיום</text>
      
      <!-- Task items -->
      <g transform="translate(20, 50)">
        <!-- Task 1 -->
        <rect x="${cw-40}" y="8" width="13" height="13" rx="2" fill="none" stroke="black" stroke-width="2" />
        <path d="M ${cw-38} 14 L ${cw-35} 17 L ${cw-30} 10" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" />
        <text x="${cw-55}" y="20" class="regular" font-size="14.5" text-anchor="end" fill="black">קניית מצרכים לשבת</text>
        <text x="20" y="20" class="bold" font-size="13" text-anchor="start" fill="black">09:00</text>
        
        <!-- Task 2 -->
        <rect x="${cw-40}" y="48" width="13" height="13" rx="2" fill="none" stroke="black" stroke-width="2" />
        <text x="${cw-55}" y="60" class="regular" font-size="14.5" text-anchor="end" fill="black">איסוף ילדים מחוגים</text>
        <text x="20" y="60" class="bold" font-size="13" text-anchor="start" fill="black">16:00</text>
        
        <!-- Task 3 -->
        <rect x="${cw-40}" y="88" width="13" height="13" rx="2" fill="none" stroke="black" stroke-width="2" />
        <text x="${cw-55}" y="100" class="regular" font-size="14.5" text-anchor="end" fill="black">אימון ערב משפחתי</text>
        <text x="20" y="100" class="bold" font-size="13" text-anchor="start" fill="black">18:30</text>
        
        <!-- Task 4 -->
        <rect x="${cw-40}" y="128" width="13" height="13" rx="2" fill="none" stroke="black" stroke-width="2" />
        <text x="${cw-55}" y="140" class="regular" font-size="14.5" text-anchor="end" fill="black">סידור המחסן והגינה</text>
        <text x="20" y="140" class="bold" font-size="13" text-anchor="start" fill="black">20:00</text>
      </g>
    </g>
  `;

  // Quadrant 4: Bottom-Left (Family Bulletin Board)
  svg += `
    <g transform="translate(12, 246)">
      <rect x="0" y="0" width="${cw}" height="${ch}" rx="12" ry="12" class="border-card" />
      <rect x="0" y="0" width="${cw}" height="34" rx="12" ry="12" class="header-pill" />
      <rect x="0" y="10" width="${cw}" height="24" fill="black" />
      <text x="${cw/2}" y="22" class="header-text">לוח מודעות משפחתי</text>
      
      <!-- Bulletins -->
      <g transform="translate(20, 55)">
        <circle cx="${cw-35}" cy="15" r="4.5" fill="black" />
        <text x="${cw-50}" y="20" class="bold" font-size="14.5" text-anchor="end" fill="black">נדיה:</text>
        <text x="${cw-100}" y="20" class="regular" font-size="14" text-anchor="end" fill="black">לקחת מפתח מפיני</text>
        
        <circle cx="${cw-35}" cy="55" r="4.5" fill="black" />
        <text x="${cw-50}" y="60" class="bold" font-size="14.5" text-anchor="end" fill="black">סהר:</text>
        <text x="${cw-100}" y="60" class="regular" font-size="14" text-anchor="end" fill="black">איבדתי את האוזניות</text>
        
        <circle cx="${cw-35}" cy="95" r="4.5" fill="black" />
        <text x="${cw-50}" y="100" class="bold" font-size="14.5" text-anchor="end" fill="black">סול:</text>
        <text x="${cw-100}" y="100" class="regular" font-size="14" text-anchor="end" fill="black">חזרתי מוקדם מבית הספר</text>
        
        <circle cx="${cw-35}" cy="135" r="4.5" fill="black" />
        <text x="${cw-50}" y="140" class="bold" font-size="14.5" text-anchor="end" fill="black">פיני:</text>
        <text x="${cw-100}" y="140" class="regular" font-size="14" text-anchor="end" fill="black">העליתי גרסה חדשה למסך!</text>
      </g>
    </g>
  `;

  svg += `</svg>`;
  return svg;
}

// ----------------------------------------------------
// MOCKUP 2: Weekly Habit Tracker & Activity Log Screen
// ----------------------------------------------------
function getMockup2Svg() {
  const pad = 12;
  const gap = 12;
  const leftWidth = 580;
  const rightX = 604;
  const rightWidth = 184;

  let svg = `<svg width="800" height="480" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg" style="background-color: white; direction: rtl;">`;
  svg += SVG_STYLE;

  // Divider
  svg += `<line x1="598" y1="12" x2="598" y2="468" stroke="black" stroke-width="1.5" />`;

  // Left Section: Horizon Calendar (Standard Layout)
  svg += `
    <g transform="translate(${pad}, ${pad})">
      <rect x="0" y="0" width="${leftWidth}" height="450" rx="12" ry="12" class="border-card" />
      <rect x="0" y="0" width="${leftWidth}" height="34" fill="black" />
      <text x="${leftWidth - 20}" y="22" class="header-text" text-anchor="end">לוח שבועי מורחב</text>
  `;

  const days = ["רביעי 5/8", "חמישי 6/8", "שישי 7/8", "שבת 8/8", "ראשון 9/8", "שני 10/8", "שלישי 11/8"];
  const events = ["פרויקט דיו אלקטרוני [פיני]", "סרט - סולטיר [סהר]", "אין אירועים", "ארוחת ערב משפחתית", "אין אירועים", "אימון בוקר קבוצתי", "תור לרופא שיניים"];
  
  for (let i = 0; i < 7; i++) {
    const rowY = 34 + i * 59.4;
    if (i < 6) {
      svg += `<line x1="15" y1="${rowY + 59.4}" x2="${leftWidth - 15}" y2="${rowY + 59.4}" class="divider" />`;
    }
    
    // Highlight today (Thursday, index 1)
    if (i === 1) {
      svg += `<rect x="${leftWidth - 110}" y="${rowY + 8}" width="95" height="43" rx="6" ry="6" fill="black" />`;
      svg += `<text x="${leftWidth - 20}" y="${rowY + 34}" class="bold" font-size="13.5" text-anchor="end" fill="white">${days[i]}</text>`;
    } else {
      svg += `<text x="${leftWidth - 20}" y="${rowY + 34}" class="bold" font-size="13.5" text-anchor="end" fill="black">${days[i]}</text>`;
    }

    svg += `<line x1="${leftWidth - 120}" y1="${rowY + 5}" x2="${leftWidth - 120}" y2="${rowY + 54}" class="divider" />`;
    svg += `<text x="${leftWidth - 140}" y="${rowY + 34}" class="regular" font-size="14.5" text-anchor="end" fill="black">${events[i]}</text>`;
  }
  svg += `</g>`;

  // Right Column: Habit Tracker Card
  svg += `
    <g transform="translate(${rightX}, ${pad})">
      <rect x="0" y="0" width="${rightWidth}" height="450" rx="12" ry="12" class="border-card" />
      <rect x="0" y="0" width="${rightWidth}" height="34" rx="12" ry="12" class="header-pill" />
      <rect x="0" y="10" width="${rightWidth}" height="24" fill="black" />
      <text x="${rightWidth/2}" y="22" class="header-text">מעקב הרגלים שבועי</text>
      
      <!-- Column Headers for days (S, M, T, W, T, F, S) -->
      <g transform="translate(15, 60)">
        <text x="135" y="0" class="bold" font-size="11.5" text-anchor="middle" fill="black">הרגלים</text>
        <text x="105" y="0" class="bold" font-size="10.5" text-anchor="middle" fill="black">א</text>
        <text x="90" y="0" class="bold" font-size="10.5" text-anchor="middle" fill="black">ב</text>
        <text x="75" y="0" class="bold" font-size="10.5" text-anchor="middle" fill="black">ג</text>
        <text x="60" y="0" class="bold" font-size="10.5" text-anchor="middle" fill="black">ד</text>
        <text x="45" y="0" class="bold" font-size="10.5" text-anchor="middle" fill="black">ה</text>
        <text x="30" y="0" class="bold" font-size="10.5" text-anchor="middle" fill="black">ו</text>
        <text x="15" y="0" class="bold" font-size="10.5" text-anchor="middle" fill="black">ש</text>
        
        <line x1="0" y1="8" x2="155" y2="8" stroke="black" stroke-width="1" />
      </g>
  `;

  // Draw Habits Grid
  const habits = [
    { name: "ריצה/ספורט", status: [1, 0, 1, 0, 1, 0, 0] },
    { name: "קריאת ספר", status: [1, 1, 1, 1, 1, 0, 0] },
    { name: "שתיית מים", status: [1, 1, 0, 1, 1, 1, 0] },
    { name: "שינה 8ש׳", status: [0, 1, 1, 0, 1, 0, 1] },
    { name: "סדר וניקיון", status: [1, 0, 0, 1, 0, 1, 0] },
    { name: "למידה 30ד׳", status: [1, 1, 1, 1, 0, 0, 0] }
  ];

  habits.forEach((h, idx) => {
    const rowY = 95 + idx * 45;
    svg += `
      <g transform="translate(15, ${rowY})">
        <!-- Habit Name -->
        <text x="155" y="10" class="regular" font-size="12" text-anchor="end" fill="black">${h.name}</text>
    `;
    
    // Draw dots
    h.status.forEach((st, dIdx) => {
      const dotX = 105 - dIdx * 15;
      if (st === 1) {
        // Filled circle for completed habit
        svg += `<circle cx="${dotX}" cy="6" r="4.5" fill="black" />`;
      } else {
        // Empty circle for uncompleted habit
        svg += `<circle cx="${dotX}" cy="6" r="4.5" fill="none" stroke="black" stroke-width="1.2" />`;
      }
    });

    if (idx < habits.length - 1) {
      svg += `<line x1="0" y1="23" x2="155" y2="23" class="divider" />`;
    }
    svg += `</g>`;
  });

  // Footer / Streak summary
  svg += `
      <rect x="15" y="380" width="154" height="42" rx="6" ry="6" fill="none" stroke="black" stroke-width="1.5" />
      <text x="145" y="405" class="bold" font-size="12" text-anchor="end" fill="black">רצף קבוצתי:</text>
      <text x="25" y="407" class="bold" font-size="18" text-anchor="start" fill="black">5 ימים</text>
    </g>
  `;

  svg += `</svg>`;
  return svg;
}

// ----------------------------------------------------
// MOCKUP 3: Shabbat & Hebrew Calendar Screen
// ----------------------------------------------------
function getMockup3Svg() {
  const pad = 12;
  const gap = 12;
  const leftWidth = 580;
  const rightX = 604;
  const rightWidth = 184;

  let svg = `<svg width="800" height="480" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg" style="background-color: white; direction: rtl;">`;
  svg += SVG_STYLE;

  // Gutter Line
  svg += `<line x1="598" y1="12" x2="598" y2="468" stroke="black" stroke-width="1.5" />`;

  // Left Section: Horizon Calendar (Standard Layout)
  svg += `
    <g transform="translate(${pad}, ${pad})">
      <rect x="0" y="0" width="${leftWidth}" height="450" rx="12" ry="12" class="border-card" />
      <rect x="0" y="0" width="${leftWidth}" height="34" fill="black" />
      <text x="${leftWidth - 20}" y="22" class="header-text" text-anchor="end">לוח שבועי מורחב</text>
  `;

  const days = ["רביעי 5/8", "חמישי 6/8", "שישי 7/8", "שבת 8/8", "ראשון 9/8", "שני 10/8", "שלישי 11/8"];
  const events = ["פרויקט דיו אלקטרוני [פיני]", "סרט - סולטיר [סהר]", "ערב שבת - הדלקת נרות", "פרשת עקב - שבת חתן", "אין אירועים", "חזרה ללימודים", "תור לרופא שיניים"];
  
  for (let i = 0; i < 7; i++) {
    const rowY = 34 + i * 59.4;
    if (i < 6) {
      svg += `<line x1="15" y1="${rowY + 59.4}" x2="${leftWidth - 15}" y2="${rowY + 59.4}" class="divider" />`;
    }
    
    if (i === 1) {
      svg += `<rect x="${leftWidth - 110}" y="${rowY + 8}" width="95" height="43" rx="6" ry="6" fill="black" />`;
      svg += `<text x="${leftWidth - 20}" y="${rowY + 34}" class="bold" font-size="13.5" text-anchor="end" fill="white">${days[i]}</text>`;
    } else {
      svg += `<text x="${leftWidth - 20}" y="${rowY + 34}" class="bold" font-size="13.5" text-anchor="end" fill="black">${days[i]}</text>`;
    }

    svg += `<line x1="${leftWidth - 120}" y1="${rowY + 5}" x2="${leftWidth - 120}" y2="${rowY + 54}" class="divider" />`;
    svg += `<text x="${leftWidth - 140}" y="${rowY + 34}" class="regular" font-size="14.5" text-anchor="end" fill="black">${events[i]}</text>`;
  }
  svg += `</g>`;

  // Right Column Top: Date & Hebrew Date Banner (0 to 110)
  svg += `
    <g transform="translate(${rightX}, ${pad})">
      <rect x="0" y="0" width="${rightWidth}" height="100" rx="12" ry="12" class="border-card" />
      <rect x="0" y="0" width="${rightWidth}" height="32" rx="12" ry="12" class="header-pill" />
      <rect x="0" y="10" width="${rightWidth}" height="22" fill="black" />
      <text x="${rightWidth/2}" y="21" class="header-text">תאריך עברי</text>
      
      <text x="${rightWidth/2}" y="62" class="bold" font-size="16.5" text-anchor="middle" fill="black">כ״ג באב ה׳תשפ״ו</text>
      <text x="${rightWidth/2}" y="84" class="regular" font-size="12" text-anchor="middle" fill="black">פרשת השבוע: עקב</text>
    </g>
  `;

  // Right Column Bottom: Shabbat Times Card (122 to 462)
  svg += `
    <g transform="translate(${rightX}, ${pad + 100 + gap})">
      <rect x="0" y="0" width="${rightWidth}" height="338" rx="12" ry="12" class="border-card" />
      <rect x="0" y="0" width="${rightWidth}" height="32" rx="12" ry="12" class="header-pill" />
      <rect x="0" y="10" width="${rightWidth}" height="22" fill="black" />
      <text x="${rightWidth/2}" y="21" class="header-text">זמני השבת (פרדסיה)</text>
      
      <!-- Decorative Shabbat Candles -->
      <g transform="translate(${rightWidth/2}, 90)" stroke="black" stroke-width="1.8" fill="none">
        <!-- Left candle -->
        <path d="M -12 25 L -8 -15 C -8 -20 -12 -20 -12 -15 Z" fill="none" />
        <path d="M -10 -15 L -10 -25" />
        <path d="M -10 -25 C -5 -25 -10 -35 -10 -35 C -10 -35 -15 -25 -10 -25 Z" fill="black" />
        
        <!-- Right candle -->
        <path d="M 12 25 L 8 -15 C 8 -20 12 -20 12 -15 Z" fill="none" />
        <path d="M 10 -15 L 10 -25" />
        <path d="M 10 -25 C 15 -25 10 -35 10 -35 C 10 -35 5 -25 10 -25 Z" fill="black" />
        
        <!-- Stand base -->
        <path d="M -25 25 L 25 25 M -15 25 L -15 28 M 15 25 L 15 28 M -22 28 L 22 28" />
      </g>
      
      <g transform="translate(15, 175)" class="bold" font-size="14.5" text-anchor="end">
        <!-- Candle Lighting -->
        <text x="${rightWidth-30}" y="0" fill="black">הדלקת נרות:</text>
        <text x="10" y="0" fill="black" class="bold" font-size="16">18:52</text>
        
        <line x1="0" y1="18" x2="${rightWidth-30}" y2="18" class="divider" />
        
        <!-- Sunset -->
        <text x="${rightWidth-30}" y="42" class="regular" font-size="13" fill="black">שקיעה:</text>
        <text x="10" y="42" class="regular" font-size="13" fill="black">19:10</text>
        
        <line x1="0" y1="60" x2="${rightWidth-30}" y2="60" class="divider" />
        
        <!-- Shabbat Ends -->
        <text x="${rightWidth-30}" y="84" fill="black">צאת השבת:</text>
        <text x="10" y="84" fill="black" class="bold" font-size="16">19:54</text>
        
        <line x1="0" y1="102" x2="${rightWidth-30}" y2="102" class="divider" />
        
        <!-- Rabenu Tam -->
        <text x="${rightWidth-30}" y="126" class="regular" font-size="12" fill="black">רבינו תם:</text>
        <text x="10" y="126" class="regular" font-size="12" fill="black">20:24</text>
      </g>
      
      <!-- Greeting Banner -->
      <rect x="15" y="325" width="154" height="2" fill="black" />
      <text x="${rightWidth/2}" y="315" class="bold" font-size="18.5" text-anchor="middle" fill="black">שבת שלום!</text>
    </g>
  `;

  svg += `</svg>`;
  return svg;
}

// ----------------------------------------------------
// MOCKUP 4: 4-Day Detailed Weather Forecast Strip Screen
// ----------------------------------------------------
function getMockup4Svg() {
  const pad = 12;
  const gap = 12;
  const leftWidth = 580;
  const rightX = 604;
  const rightWidth = 184;

  let svg = `<svg width="800" height="480" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg" style="background-color: white; direction: rtl;">`;
  svg += SVG_STYLE;

  // Gutter line
  svg += `<line x1="598" y1="12" x2="598" y2="468" stroke="black" stroke-width="1.5" />`;

  // Left Section Top: Horizon Weekly Calendar (12 to 290)
  svg += `
    <g transform="translate(${pad}, ${pad})">
      <rect x="0" y="0" width="${leftWidth}" height="268" rx="12" ry="12" class="border-card" />
      <rect x="0" y="0" width="${leftWidth}" height="32" fill="black" />
      <text x="${leftWidth - 20}" y="21" class="header-text" text-anchor="end">לוח אירועים שבועי</text>
  `;

  const daysShort = ["רביעי 5/8", "חמישי 6/8 (היום)", "שישי 7/8", "שבת 8/8", "ראשון 9/8"];
  const eventsShort = ["פרויקט דיו אלקטרוני [פיני]", "סרט - סולטיר [סהר] • תור לרופא", "ערב שבת - הדלקת נרות", "פרשת עקב - שבת חתן", "אין אירועים"];

  for (let i = 0; i < 5; i++) {
    const rowY = 32 + i * 47;
    if (i < 4) {
      svg += `<line x1="15" y1="${rowY + 47}" x2="${leftWidth - 15}" y2="${rowY + 47}" class="divider" />`;
    }
    
    if (i === 1) {
      svg += `<rect x="${leftWidth - 135}" y="${rowY + 5}" width="120" height="36" rx="6" ry="6" fill="black" />`;
      svg += `<text x="${leftWidth - 20}" y="${rowY + 28}" class="bold" font-size="12.5" text-anchor="end" fill="white">${daysShort[i]}</text>`;
    } else {
      svg += `<text x="${leftWidth - 20}" y="${rowY + 28}" class="bold" font-size="12.5" text-anchor="end" fill="black">${daysShort[i]}</text>`;
    }

    svg += `<line x1="${leftWidth - 145}" y1="${rowY + 5}" x2="${leftWidth - 145}" y2="${rowY + 42}" class="divider" />`;
    svg += `<text x="${leftWidth - 165}" y="${rowY + 28}" class="regular" font-size="13.5" text-anchor="end" fill="black">${eventsShort[i]}</text>`;
  }
  svg += `</g>`;

  // Left Section Bottom: 4-Day Forecast Strip (292 to 462)
  svg += `
    <g transform="translate(${pad}, ${pad + 268 + gap})">
      <rect x="0" y="0" width="${leftWidth}" height="170" rx="12" ry="12" class="border-card" />
      <rect x="0" y="0" width="${leftWidth}" height="32" rx="12" ry="12" class="header-pill" />
      <rect x="0" y="10" width="${leftWidth}" height="22" fill="black" />
      <text x="${leftWidth/2}" y="21" class="header-text">תחזית מזג אוויר מורחבת (פרדסיה)</text>
      
      <!-- Day 1: Today -->
      <g transform="translate(490, 42)">
        <text x="40" y="20" class="bold" font-size="14.5" text-anchor="middle" fill="black">היום</text>
        ${getWeatherIcon('partly-cloudy', 40, 52, 1.0)}
        <text x="40" y="102" class="bold" font-size="15" text-anchor="middle" fill="black">29°C</text>
        <text x="40" y="118" class="regular" font-size="11.5" text-anchor="middle" fill="black">21° - 28°</text>
      </g>
      
      <line x1="428" y1="52" x2="428" y2="158" class="divider" />
      
      <!-- Day 2: Tomorrow -->
      <g transform="translate(348, 42)">
        <text x="40" y="20" class="bold" font-size="14.5" text-anchor="middle" fill="black">שישי</text>
        ${getWeatherIcon('sun', 40, 52, 1.0)}
        <text x="40" y="102" class="bold" font-size="15" text-anchor="middle" fill="black">30°C</text>
        <text x="40" y="118" class="regular" font-size="11.5" text-anchor="middle" fill="black">22° - 31°</text>
      </g>
      
      <line x1="286" y1="52" x2="286" y2="158" class="divider" />
      
      <!-- Day 3: Saturday -->
      <g transform="translate(206, 42)">
        <text x="40" y="20" class="bold" font-size="14.5" text-anchor="middle" fill="black">שבת</text>
        ${getWeatherIcon('cloud', 40, 52, 1.0)}
        <text x="40" y="102" class="bold" font-size="15" text-anchor="middle" fill="black">28°C</text>
        <text x="40" y="118" class="regular" font-size="11.5" text-anchor="middle" fill="black">20° - 27°</text>
      </g>
      
      <line x1="144" y1="52" x2="144" y2="158" class="divider" />
      
      <!-- Day 4: Sunday -->
      <g transform="translate(64, 42)">
        <text x="40" y="20" class="bold" font-size="14.5" text-anchor="middle" fill="black">ראשון</text>
        ${getWeatherIcon('rain', 40, 52, 1.0)}
        <text x="40" y="102" class="bold" font-size="15" text-anchor="middle" fill="black">27°C</text>
        <text x="40" y="118" class="regular" font-size="11.5" text-anchor="middle" fill="black">19° - 25°</text>
      </g>
    </g>
  `;

  // Right Column: Daily Schedule Checklist (Full Height)
  svg += `
    <g transform="translate(${rightX}, ${pad})">
      <rect x="0" y="0" width="${rightWidth}" height="450" rx="12" ry="12" class="border-card" />
      <rect x="0" y="0" width="${rightWidth}" height="34" rx="12" ry="12" class="header-pill" />
      <rect x="0" y="10" width="${rightWidth}" height="24" fill="black" />
      <text x="${rightWidth/2}" y="22" class="header-text">לוז יומי להיום</text>
      
      <!-- Tasks list -->
  `;

  const tasksList = [
    { time: "08:30", desc: "ריצה בבוקר" },
    { time: "10:00", desc: "פגישת צוות" },
    { time: "14:00", desc: "עבודה על דיו" },
    { time: "16:00", desc: "איסוף Sahar" },
    { time: "18:00", desc: "תור לרופא" },
    { time: "19:30", desc: "ארוחת ערב" },
    { time: "21:00", desc: "עדכון גרסה" }
  ];

  tasksList.forEach((task, idx) => {
    const rowY = 65 + idx * 52;
    svg += `
      <g transform="translate(10, ${rowY})">
        <!-- Checkbox -->
        <rect x="${rightWidth-30}" y="-1" width="12" height="12" rx="2.5" fill="none" stroke="black" stroke-width="1.8" />
        ${idx === 0 || idx === 1 ? `<path d="M ${rightWidth-28} 5 L ${rightWidth-25} 8 L ${rightWidth-21} 2" fill="none" stroke="black" stroke-width="1.8" stroke-linecap="round" />` : ''}
        
        <text x="${rightWidth-40}" y="11" class="bold" font-size="12" text-anchor="end" fill="black">${task.time}</text>
        <text x="${rightWidth-82}" y="11" class="regular" font-size="12" text-anchor="end" fill="black">${task.desc}</text>
    `;
    if (idx < tasksList.length - 1) {
      svg += `<line x1="5" y1="28" x2="${rightWidth-25}" y2="28" class="divider" />`;
    }
    svg += `</g>`;
  });

  svg += `</g>`;
  svg += `</svg>`;
  return svg;
}

// ----------------------------------------------------
// MOCKUP 5: Shared Family Shopping List & Pinboard
// ----------------------------------------------------
function getMockup5Svg() {
  const pad = 12;
  const gap = 12;
  const cw = 382; // (800 - 24 - 12)/2
  const ch = 456; // 480 - 24

  let svg = `<svg width="800" height="480" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg" style="background-color: white; direction: rtl;">`;
  svg += SVG_STYLE;

  // Outer border & Middle divider
  svg += `<rect x="0" y="0" width="800" height="480" fill="none" stroke="black" stroke-width="3" />`;
  svg += `<line x1="400" y1="12" x2="400" y2="468" stroke="black" stroke-width="1.5" />`;

  // Left Section: Shared Family Shopping List
  svg += `
    <g transform="translate(12, 12)">
      <rect x="0" y="0" width="${cw}" height="${ch}" rx="12" ry="12" class="border-card" />
      <rect x="0" y="0" width="${cw}" height="34" rx="12" ry="12" class="header-pill" />
      <rect x="0" y="10" width="${cw}" height="24" fill="black" />
      <text x="${cw/2}" y="22" class="header-text">רשימת קניות משפחתית</text>
      
      <!-- List Items with checkbox lines -->
  `;

  const shoppingList = [
    { name: "חלב 3% קרטון", qty: "2" },
    { name: "לחם כוסמין מלא", qty: "1" },
    { name: "ביצים קרטון גדול L", qty: "1" },
    { name: "שמן זית כתית מעולה", qty: "1" },
    { name: "עגבניות שרי מתוקות", qty: "2" },
    { name: "נייר טואלט מארז זוגי", qty: "1" },
    { name: "קפה אספרסו קפסולות", qty: "3" },
    { name: "גבינת קוטג' 5%", qty: "2" }
  ];

  shoppingList.forEach((item, idx) => {
    const rowY = 65 + idx * 46;
    svg += `
      <g transform="translate(15, ${rowY})">
        <!-- Checkbox -->
        <rect x="${cw-40}" y="-2" width="13" height="13" rx="2.5" fill="none" stroke="black" stroke-width="2" />
        ${idx === 0 || idx === 2 ? `<path d="M ${cw-38} 4 L ${cw-35} 7 L ${cw-31} 1" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" />` : ''}
        
        <text x="${cw-55}" y="10" class="regular" font-size="14.5" text-anchor="end" fill="black">${item.name}</text>
        <text x="20" y="10" class="bold" font-size="13" text-anchor="start" fill="black">כמות: ${item.qty}</text>
    `;
    if (idx < shoppingList.length - 1) {
      svg += `<line x1="5" y1="23" x2="${cw-25}" y2="23" class="divider" />`;
    }
    svg += `</g>`;
  });
  svg += `</g>`;

  // Right Section Top: Quick Schedule (406, 12, w=382, h=222)
  svg += `
    <g transform="translate(406, 12)">
      <rect x="0" y="0" width="${cw}" height="222" rx="12" ry="12" class="border-card" />
      <rect x="0" y="0" width="${cw}" height="34" rx="12" ry="12" class="header-pill" />
      <rect x="0" y="10" width="${cw}" height="24" fill="black" />
      <text x="${cw/2}" y="22" class="header-text">לוז מהיר להיום</text>
      
      <!-- Content -->
      <g transform="translate(20, 50)">
        <text x="${cw-40}" y="18" class="bold" font-size="14" text-anchor="end" fill="black">08:30</text>
        <text x="${cw-95}" y="18" class="regular" font-size="14" text-anchor="end" fill="black">ריצת בוקר קבועה</text>
        
        <line x1="20" y1="36" x2="${cw-40}" y2="36" class="divider" />
        
        <text x="${cw-40}" y="56" class="bold" font-size="14" text-anchor="end" fill="black">14:00</text>
        <text x="${cw-95}" y="56" class="regular" font-size="14" text-anchor="end" fill="black">עדכון קוד דאשבורד</text>
        
        <line x1="20" y1="74" x2="${cw-40}" y2="74" class="divider" />
        
        <text x="${cw-40}" y="94" class="bold" font-size="14" text-anchor="end" fill="black">18:00</text>
        <text x="${cw-95}" y="94" class="regular" font-size="14" text-anchor="end" fill="black">תור לרופא עיניים בפתח תקווה</text>
        
        <line x1="20" y1="112" x2="${cw-40}" y2="112" class="divider" />
        
        <text x="${cw-40}" y="132" class="bold" font-size="14" text-anchor="end" fill="black">20:00</text>
        <text x="${cw-95}" y="132" class="regular" font-size="14" text-anchor="end" fill="black">ארוחת ערב סול וסהר</text>
      </g>
    </g>
  `;

  // Right Section Bottom: Notes & Bulletins (406, 246, w=382, h=222)
  svg += `
    <g transform="translate(406, 246)">
      <rect x="0" y="0" width="${cw}" height="222" rx="12" ry="12" class="border-card" />
      <rect x="0" y="0" width="${cw}" height="34" rx="12" ry="12" class="header-pill" />
      <rect x="0" y="10" width="${cw}" height="24" fill="black" />
      <text x="${cw/2}" y="22" class="header-text">פתקים והודעות משפחה</text>
      
      <!-- Notes -->
      <g transform="translate(20, 50)">
        <!-- Note 1 -->
        <rect x="20" y="0" width="${cw-60}" height="42" rx="6" ry="6" fill="none" stroke="black" stroke-width="1.5" />
        <text x="${cw-50}" y="25" class="bold" font-size="13" text-anchor="end" fill="black">נדיה:</text>
        <text x="${cw-100}" y="25" class="regular" font-size="13" text-anchor="end" fill="black">נא לרוקן את המדיח כשחוזרים</text>
        
        <!-- Note 2 -->
        <rect x="20" y="54" width="${cw-60}" height="42" rx="6" ry="6" fill="none" stroke="black" stroke-width="1.5" />
        <text x="${cw-50}" y="79" class="bold" font-size="13" text-anchor="end" fill="black">אבא פיני:</text>
        <text x="${cw-120}" y="79" class="regular" font-size="13" text-anchor="end" fill="black">איסוף מחוגים בשעה 16:30 במקום 16:00</text>
        
        <!-- Note 3 -->
        <rect x="20" y="108" width="${cw-60}" height="42" rx="6" ry="6" fill="none" stroke="black" stroke-width="1.5" />
        <text x="${cw-50}" y="133" class="bold" font-size="13" text-anchor="end" fill="black">סול וסהר:</text>
        <text x="${cw-130}" y="133" class="regular" font-size="13" text-anchor="end" fill="black">הכנו לכם הפתעה בחדר!</text>
      </g>
    </g>
  `;

  svg += `</svg>`;
  return svg;
}

// ----------------------------------------------------
// MAIN RUNNER
// ----------------------------------------------------
async function run() {
  const mockups = [
    { name: 'mockup_1_quadrant.png', getSvg: getMockup1Svg },
    { name: 'mockup_2_habit_tracker.png', getSvg: getMockup2Svg },
    { name: 'mockup_3_shabbat_times.png', getSvg: getMockup3Svg },
    { name: 'mockup_4_weather_forecast.png', getSvg: getMockup4Svg },
    { name: 'mockup_5_shopping_list.png', getSvg: getMockup5Svg }
  ];

  for (const m of mockups) {
    const filePath = path.join(targetDir, m.name);
    console.log(`Generating SVG for ${m.name}...`);
    const svgString = m.getSvg();
    
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
      console.error(`Error rendering mockup ${m.name}:`, err.message);
    }
  }
  console.log('All mockups generated successfully!');
}

run();
