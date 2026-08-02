const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { generateSvg } = require('../renderer');

const mockData = {
  date: new Date('2026-07-15T12:00:00'),
  events: [
    { id: '1', date: '2026-07-15', title: 'פרויקט דיו אלקטרוני', author: 'פיני' },
    { id: '2', date: '2026-07-15', title: 'סרט - סולטיר [סהר]', isTimed: true, time: '16:30', author: 'סהר' },
    { id: '3', date: '2026-07-15', title: 'תור לרופא [נדיה]', isTimed: true, time: '18:00', author: 'נדיה' }
  ],
  tasks: [
    { id: 't1', date: '2026-07-15', time: '08:30', description: 'ריצה בבוקר בפארק' },
    { id: 't2', date: '2026-07-15', time: '10:00', description: 'פגישת צוות שבועית' }
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

function renderTest(fontWeightBold, fontWeightRegular, filename) {
  const baseSvg = generateSvg(mockData);

  const modifiedSvg = baseSvg
    .replace(
      ".bold { font-family: 'Rubik', sans-serif; font-weight: 900; }",
      `.bold { font-family: 'Rubik', sans-serif; font-weight: ${fontWeightBold}; }`
    )
    .replace(
      ".regular { font-family: 'Rubik', sans-serif; font-weight: 700; }",
      `.regular { font-family: 'Rubik', sans-serif; font-weight: ${fontWeightRegular}; }`
    );

  try {
    const resvg = new Resvg(modifiedSvg, {
      font: {
        fontFiles: [
          path.join(__dirname, '..', 'fonts', 'Rubik-Bold.ttf'),
          path.join(__dirname, '..', 'fonts', 'Rubik-Regular.ttf')
        ],
        defaultFontFamily: 'Rubik',
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
    console.log(`Saved test to: ${dest}`);
  } catch (err) {
    console.error(`Error rendering ${filename}:`, err);
  }
}

// Render with standard Rubik weights (700 and 400)
renderTest('bold', 'normal', 'test_rubik_standard_weights.png');

// Render with 900 and 700 (which is what failed)
renderTest('900', '700', 'test_rubik_failed_weights.png');
