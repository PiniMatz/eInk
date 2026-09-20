const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const db = require('../db');

const CANVA_URL = process.env.SOL_CANVA_CALENDAR_URL || 'https://www.canva.com/design/DAHKmRqjYbc/Rbis5M-6HPE55XdJZu2dcw/view?utm_content=DAHKmRqjYbc&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h68c8ce5abf';

const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function isRelevantForSol(title, pageHeader) {
  if (!title) return false;
  const t = title.trim();
  const header = (pageHeader || '').trim();

  // If page header or event explicitly mentions another grade, skip it
  if (header.includes('שכבת ח') || header.includes('שכבת ט')) return false;
  if (/(\b|שכבת\s*)[חט]['׳]?\b/.test(t) || t.includes('שכבת ח') || t.includes('שכבת ט') || t.includes('כינוס שכבת ח') || t.includes('הקש בדלת” ח')) {
    return false;
  }

  // If event specifically mentions grade 7 (ז), keep it
  if (/(\b|שכבת\s*)ז['׳]?\b/.test(t) || t.includes('שכבת ז') || header.includes('שכבת ז')) {
    return true;
  }

  // If event is general (no age group indicated at all), keep it
  return true;
}

function parseTablePage(elements, pageHeader, pageNum) {
  const events = [];
  const tableElements = elements.filter(e => e.y >= 700 && e.y <= 1400);

  const getMonthForY = (y) => {
    if (y < 1050) return { name: 'נובמבר', num: 11, year: 2026 };
    if (y < 1250) return { name: 'דצמבר', num: 12, year: 2026 };
    return { name: 'ינואר', num: 1, year: 2027 };
  };

  const subjects = tableElements.filter(e => e.x >= 950 && (e.text.includes('מבחן') || e.text.includes('בוחן') || e.text.includes('טיול') || e.text.includes('סיור')));
  const dayNumbers = tableElements.filter(e => e.x >= 550 && e.x <= 750 && !isNaN(parseInt(e.text, 10)));

  subjects.forEach(sub => {
    let bestDay = null;
    let bestDist = 999;
    dayNumbers.forEach(d => {
      const dist = Math.abs(d.y - sub.y);
      if (dist < bestDist && dist <= 35) {
        bestDist = dist;
        bestDay = parseInt(d.text, 10);
      }
    });

    const m = getMonthForY(sub.y);
    if (bestDay && m) {
      const mStr = String(m.num).padStart(2, '0');
      const dStr = String(bestDay).padStart(2, '0');
      const dateStr = `${m.year}-${mStr}-${dStr}`;
      
      if (isRelevantForSol(sub.text, pageHeader)) {
        events.push({
          title: sub.text.trim(),
          date: dateStr,
          sourcePage: pageNum
        });
      }
    }
  });

  return events;
}

function parseMonthlyGridPage(elements, pageNum) {
  const events = [];
  const fullText = elements.map(e => e.text).join(' ');

  let monthNum = null;
  let yearNum = 2026;
  if (fullText.includes('ספטמבר')) monthNum = 9;
  else if (fullText.includes('אוקטובר')) monthNum = 10;
  else if (fullText.includes('נובמבר')) monthNum = 11;
  else if (fullText.includes('דצמבר')) monthNum = 12;
  else if (fullText.includes('ינואר')) { monthNum = 1; yearNum = 2027; }

  if (!monthNum) return events;

  // For October 2026 grid:
  if (monthNum === 10) {
    elements.forEach(e => {
      const t = e.text.trim();
      if ((t.includes('טקס שבעה באוקטובר') || t.includes('שבעה באוקטובר')) && isRelevantForSol(t)) {
        events.push({ title: 'טקס שבעה באוקטובר', date: '2026-10-07', sourcePage: pageNum });
      }
      if (t.includes('יצחק רבין') && isRelevantForSol(t)) {
        events.push({ title: 'יום השנה לרצח יצחק רבין', date: '2026-10-20', sourcePage: pageNum });
      }
      if (t.includes('יום הבחירות לכנסת') && isRelevantForSol(t)) {
        events.push({ title: 'יום הבחירות לכנסת', date: '2026-10-27', sourcePage: pageNum });
      }
      if (t.includes('יום גיבוש שכבת ז') && isRelevantForSol(t)) {
        events.push({ title: 'יום גיבוש שכבת ז’', date: '2026-10-28', sourcePage: pageNum });
      }
    });
  }

  return events;
}

async function fetchCanvaPages() {
  console.log('Launching headless Chrome to fetch Canva presentation...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1600, height: 2000 }
  });

  const page = await browser.newPage();
  console.log(`Navigating to ${CANVA_URL}...`);
  await page.goto(CANVA_URL, {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  await new Promise(r => setTimeout(r, 8000));

  const allPages = [];

  for (let pNum = 1; pNum <= 5; pNum++) {
    console.log(`Scanning Page ${pNum}...`);
    const elements = await page.evaluate((p) => {
      const nodes = Array.from(document.querySelectorAll('*'));
      const results = [];
      nodes.forEach(node => {
        if (node.children.length === 0 && node.innerText && node.innerText.trim().length > 0) {
          const rect = node.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            results.push({
              page: p,
              text: node.innerText.trim(),
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              w: Math.round(rect.width),
              h: Math.round(rect.height)
            });
          }
        }
      });
      return results;
    }, pNum);

    allPages.push({ page: pNum, elements });

    if (pNum < 5) {
      const clicked = await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Next page"]') ||
                    document.querySelector('button[aria-label*="Next"]') ||
                    document.querySelector('button[title*="Next"]');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      if (!clicked) {
        await page.keyboard.press('ArrowRight');
      }
      await new Promise(r => setTimeout(r, 3500));
    }
  }

  await browser.close();
  return allPages;
}

async function syncSolSchoolCalendar() {
  console.log('=== STARTING SOL SCHOOL CALENDAR SYNC ===');
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  console.log(`Current Date: ${todayStr} (Filtering out events prior to today)`);

  let allPages;
  try {
    allPages = await fetchCanvaPages();
  } catch (err) {
    console.warn(`Could not fetch live Canva page (${err.message}). Checking cache...`);
    const cachePath = path.join(__dirname, '..', 'scratch', 'canva_all_pages.json');
    if (fs.existsSync(cachePath)) {
      allPages = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      console.log('Loaded pages from cache.');
    } else {
      throw err;
    }
  }

  const allCandidateEvents = [];

  for (const pageData of allPages) {
    const { page, elements } = pageData;
    const fullText = elements.map(e => e.text).join(' ');

    const isTablePage = fullText.includes('לוח מבחנים') || fullText.includes('מבחנים וטיול שנתי');
    
    if (isTablePage) {
      const headerElement = elements.find(e => (e.text.includes('לוח מבחנים') || e.text.includes('מבחנים וטיול שנתי')));
      const pageHeader = headerElement ? headerElement.text : '';

      if (pageHeader.includes('שכבת ח') || pageHeader.includes('שכבת ט') || fullText.includes('שכבת ח') || fullText.includes('שכבת ט')) {
        if (!fullText.includes('שכבת ז')) {
          console.log(`[Page ${page}] Skipped: Table designated for other grades (${pageHeader})`);
          continue;
        }
      }

      if (fullText.includes('שכבת ז')) {
        console.log(`[Page ${page}] Parsing exam sheet for שכבת ז`);
        const tableEvs = parseTablePage(elements, 'שכבת ז', page);
        allCandidateEvents.push(...tableEvs);
      }
    } else {
      console.log(`[Page ${page}] Parsing monthly grid page`);
      const gridEvs = parseMonthlyGridPage(elements, page);
      allCandidateEvents.push(...gridEvs);
    }
  }

  // Deduplicate candidate events
  const uniqueCandidates = [];
  allCandidateEvents.forEach(cand => {
    if (!uniqueCandidates.some(u => u.date === cand.date && u.title === cand.title)) {
      uniqueCandidates.push(cand);
    }
  });

  console.log(`\nFound ${uniqueCandidates.length} potential events across presentation.`);

  // Filter moving forward only
  const movingForwardEvents = uniqueCandidates.filter(ev => ev.date >= todayStr);
  console.log(`${movingForwardEvents.length} events are moving forward (from ${todayStr} onward):`);
  movingForwardEvents.forEach(e => console.log(` - ${e.date}: ${e.title}`));

  // Ingest into Firestore & GCal
  let googleCalApi = null;
  try {
    googleCalApi = require('../google-calendar');
  } catch (e) {}

  let addedCount = 0;
  let alreadyExistCount = 0;

  for (const ev of movingForwardEvents) {
    const [y, m] = ev.date.split('-').map(Number);
    const existingEvents = await db.getEvents(y, m);
    
    // Check if event already exists for Sol on this date
    const exists = existingEvents.some(ex => {
      if (ex.date !== ev.date) return false;
      const cleanEx = (ex.title || '').replace(/^\[.*?\]\s*/, '').trim();
      return cleanEx === ev.title || cleanEx.includes(ev.title) || ev.title.includes(cleanEx);
    });

    if (exists) {
      alreadyExistCount++;
      console.log(`[=] Already in DB: ${ev.date} - ${ev.title}`);
      continue;
    }

    const eventObj = {
      title: `[סול] ${ev.title}`,
      date: ev.date,
      author: 'סול',
      time: '', // Untimed daily event during school time (title above hourly breakdown)
      isTimed: false,
      source: 'canva_school_calendar'
    };

    try {
      await db.addEvent(eventObj);
      addedCount++;
      console.log(`[+] Added to DB: ${ev.date} - [סול] ${ev.title}`);

      if (googleCalApi) {
        try {
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('GCal Timeout')), 3000));
          await Promise.race([
            googleCalApi.addGoogleCalendarEvent({
              calendarId: process.env.GOOGLE_CALENDAR_ID || 'hugim.kid@gmail.com',
              kid: 'סול',
              title: ev.title,
              date: ev.date,
              time: ''
            }),
            timeoutPromise
          ]);
          console.log(`    Synced to Google Calendar.`);
        } catch (gErr) {
          console.log(`    GCal sync note: ${gErr.message}`);
        }
      }
    } catch (dbErr) {
      console.error(`[-] Failed adding ${ev.title}:`, dbErr.message);
    }
  }

  console.log(`\n=== SYNC COMPLETE: ${addedCount} new events added, ${alreadyExistCount} already existed ===`);
  return { addedCount, alreadyExistCount, total: movingForwardEvents.length };
}

if (require.main === module) {
  syncSolSchoolCalendar()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal sync error:', err);
      process.exit(1);
    });
}

module.exports = { syncSolSchoolCalendar, isRelevantForSol };
