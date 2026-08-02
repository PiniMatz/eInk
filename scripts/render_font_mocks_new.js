const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { generateSvg } = require('../renderer');

const mockData = {
  date: new Date('2026-07-15T12:00:00'),
  events: [
    { id: '1', date: '2026-07-15', title: 'פרויקט דיו אלקטרוני', author: 'פיני' },
    { id: '2', date: '2026-07-15', title: 'סרט - סולטיר [סהר]', isTimed: true, time: '16:30', author: 'סהר' },
    { id: '3', date: '2026-07-15', title: 'תור לרופא [נדיה]', isTimed: true, time: '18:00', author: 'נדיה' },
    { id: '4', date: '2026-07-20', title: 'ביקור בגינה הקהילתית...', isTimed: true, time: '17:30' }
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

const baseOutDir = path.join('C:', 'Users', 'pini_', '.gemini', 'antigravity', 'brain', '914ca031-02a6-4823-8a9e-f54ff7ea71f5');

function renderMock(svgText, fontFiles, defaultFontFamily, filename) {
  try {
    const resvg = new Resvg(svgText, {
      font: {
        fontFiles,
        defaultFontFamily,
        loadSystemFonts: false,
      },
      fitTo: {
        mode: 'width',
        value: 800,
      }
    });
    const pngBuffer = resvg.render().asPng();
    const dest = path.join(baseOutDir, filename);
    fs.writeFileSync(dest, pngBuffer);
    console.log(`Saved mock: ${filename}`);
  } catch (err) {
    console.error(`Failed rendering ${filename}:`, err);
  }
}

// Generate base SVG
const baseSvg = generateSvg(mockData);

// 1. Option 1: Heebo
console.log('Rendering Heebo mock...');
let svgHeebo = baseSvg
  .replace(/'Assistant'/g, "'Heebo'")
  .replace("font-weight: 500;", "font-weight: normal;")
  .replace("font-weight: 700;", "font-weight: bold;");
renderMock(
  svgHeebo,
  [
    path.join(__dirname, '..', 'fonts', 'Heebo-Regular.ttf'),
    path.join(__dirname, '..', 'fonts', 'Heebo-Bold.ttf')
  ],
  'Heebo',
  'mock_option1_heebo.png'
);

// 2. Option 2: Assistant
console.log('Rendering Assistant mock...');
renderMock(
  baseSvg,
  [
    path.join(__dirname, '..', 'fonts', 'Assistant-Regular.ttf'),
    path.join(__dirname, '..', 'fonts', 'Assistant-Bold.ttf')
  ],
  'Assistant',
  'mock_option2_assistant.png'
);

// 3. Option 3: Varela Round
console.log('Rendering Varela Round mock...');
let svgVarela = baseSvg
  .replace(/'Assistant'/g, "'Varela Round'")
  .replace("font-weight: 500;", "font-weight: normal;")
  .replace("font-weight: 700;", "font-weight: normal;");
renderMock(
  svgVarela,
  [
    path.join(__dirname, '..', 'fonts', 'VarelaRound-Regular.ttf')
  ],
  'Varela Round',
  'mock_option3_varela_round.png'
);

// 4. Option 4: Noto Sans Hebrew
console.log('Rendering Noto Sans Hebrew mock...');
let svgNoto = baseSvg
  .replace(/'Assistant'/g, "'Noto Sans Hebrew'")
  .replace("font-weight: 500;", "font-weight: normal;")
  .replace("font-weight: 700;", "font-weight: bold;");
renderMock(
  svgNoto,
  [
    path.join(__dirname, '..', 'fonts', 'NotoSansHebrew-Regular.ttf'),
    path.join(__dirname, '..', 'fonts', 'NotoSansHebrew-Bold.ttf')
  ],
  'Noto Sans Hebrew',
  'mock_option4_noto_sans.png'
);

console.log('All mocks rendered.');
