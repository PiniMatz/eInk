const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==================================================');
console.log('          RUNNING AUTO-VERIFICATION SUITE        ');
console.log('==================================================\n');

let passCount = 0;
let failCount = 0;

function test(description, testFn) {
  try {
    testFn();
    console.log(`[PASS] ${description}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${description}`);
    console.error(`       Error: ${err.message}`);
    failCount++;
  }
}

// Load db.js functions
const db = require('../db');

// Test 1: Fuzzy Title Deduplication Matching
test('Fuzzy Title Matching: Normalization & Similarities', () => {
  const tSimilar = db.areTitlesSimilar;
  
  // Exact match
  assert.strictEqual(tSimilar('ספורט עם מיכל', 'ספורט עם מיכל'), true);
  
  // Whitespace / casing / symbols
  assert.strictEqual(tSimilar('חוג כדורסל', 'חוג  כדורסל  '), true);
  assert.strictEqual(tSimilar('ספורט', 'ספורט - אימון'), true);
  assert.strictEqual(tSimilar('אימון - ספורט', 'ספורט'), true);
  
  // Mismatch
  assert.strictEqual(tSimilar('עבודה', 'בית'), false);
});

// Test 2: Conflict & Author Resolution
test('Conflict & Author Resolution Rules', () => {
  const getAuthor = db.getEventOrganizerName;
  
  // Test cases matching getEventOrganizerName logic
  assert.strictEqual(getAuthor({ organizer: 'מיכל' }, 'default'), 'נדיה');
  assert.strictEqual(getAuthor({ organizer: 'nadia' }, 'default'), 'נדיה');
  assert.strictEqual(getAuthor({ organizer: 'אמא' }, 'default'), 'נדיה');
  assert.strictEqual(getAuthor({ organizer: 'אבא' }, 'default'), 'פיני');
  assert.strictEqual(getAuthor({ creator: 'פיני' }, 'default'), 'פיני');
  assert.strictEqual(getAuthor({ creator: { val: 'סהר' } }, 'default'), 'סהר');
  assert.strictEqual(getAuthor({ creator: 'سهر' }, 'סול'), 'סול'); // default fallback
});

// Test 3: Font Weight pairings in renderer.js
test('Font Weights: Bold=700, Regular=600 in renderer.js CSS', () => {
  const rendererPath = path.join(__dirname, '..', 'renderer.js');
  const content = fs.readFileSync(rendererPath, 'utf8');
  
  assert.match(content, /\.bold\s*\{\s*font-family:\s*'Rubik Light',\s*sans-serif;\s*font-weight:\s*700;\s*\}/);
  assert.match(content, /\.regular\s*\{\s*font-family:\s*'Rubik Light',\s*sans-serif;\s*font-weight:\s*600;\s*\}/);
});

// Test 4: Solid Black fill contrast for fallback text
test('Fallback Text: "אין לימודים" must be rendered in solid black', () => {
  const rendererPath = path.join(__dirname, '..', 'renderer.js');
  const content = fs.readFileSync(rendererPath, 'utf8');
  
  assert.match(content, /fill="black">\\u202B\$\{msg\}\\u202C<\/text>/);
});

// Test 5: Layout-aware dynamic text truncation lengths
test('Layout-Aware Text Truncation limits in renderer.js', () => {
  const rendererPath = path.join(__dirname, '..', 'renderer.js');
  const content = fs.readFileSync(rendererPath, 'utf8');
  
  assert.match(content, /truncateText\(stripNikud\(item\.title\),\s*14\)/);
});

// Test 6: Vercel server cache control headers
test('Cache Control: Vercel HTTP response headers prevent stale ePaper cache', () => {
  const indexPath = path.join(__dirname, '..', 'api', 'index.js');
  const content = fs.readFileSync(indexPath, 'utf8');
  
  assert.match(content, /'Cache-Control',\s*'private,\s*no-cache,\s*no-store,\s*must-revalidate'/);
  assert.match(content, /'Expires',\s*'-1'/);
  assert.match(content, /'Pragma',\s*'no-cache'/);
});

// Test 7: ESPHome firmware console none, logger none, safe-mode disable, and deep sleep configs
// Test 8: Ministry of Education Jewish School Holiday Detection
test('Ministry of Education Jewish Holiday Detection (getSchoolHoliday)', () => {
  const { getSchoolHoliday } = require('../holidays');
  
  assert.strictEqual(getSchoolHoliday(new Date('2026-09-11')), 'ראש השנה');
  assert.strictEqual(getSchoolHoliday(new Date('2026-09-20')), 'יום כיפור');
  assert.strictEqual(getSchoolHoliday(new Date('2026-09-25')), 'סוכות');
  assert.strictEqual(getSchoolHoliday(new Date('2026-12-04')), 'חנוכה');
  assert.strictEqual(getSchoolHoliday(new Date('2027-03-23')), 'פורים');
});

// Test 9: No-School Verification Cascade (Holiday -> Saturday -> Friday Sol -> Default)
test('No-School Verification Cascade: Holiday -> Saturday -> Friday Sol -> Default', () => {
  const { generateSvg } = require('../renderer');
  
  // Rosh Hashana (2026-09-11)
  const svgHoliday = generateSvg({ date: new Date('2026-09-11T12:00:00+03:00'), events: [], tasks: [], weather: {} });
  assert.match(svgHoliday, /ראש השנה — אין לימודים/);

  // Saturday (2026-09-05 is a regular Saturday)
  const svgSaturday = generateSvg({ date: new Date('2026-09-05T12:00:00+03:00'), events: [], tasks: [], weather: {} });
  assert.match(svgSaturday, /יום שבת — אין לימודים/);

  // Friday for Sol (2026-09-18)
  const svgFridaySol = generateSvg({ date: new Date('2026-09-18T12:00:00+03:00'), events: [], tasks: [], weather: {} });
  assert.match(svgFridaySol, /יום שישי — אין לימודים/);
});

console.log('\n==================================================');
console.log(`Summary: ${passCount} passed, ${failCount} failed.`);
console.log('==================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
