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

function main() {
  const baseSvg = generateSvg(mockData);

  // We want to test CSS with Noto Sans Hebrew + Heebo fallback, and increased weights (e.g. bold=800, regular=600)
  const modifiedSvg = baseSvg
    .replace(
      ".bold { font-family: 'Noto Sans Hebrew', sans-serif; font-weight: bold; }",
      ".bold { font-family: 'Noto Sans Hebrew', 'Heebo', sans-serif; font-weight: 800; }"
    )
    .replace(
      ".regular { font-family: 'Noto Sans Hebrew', sans-serif; font-weight: normal; }",
      ".regular { font-family: 'Noto Sans Hebrew', 'Heebo', sans-serif; font-weight: 600; }"
    );

  const resvg = new Resvg(modifiedSvg, {
    font: {
      fontFiles: [
        path.join(__dirname, '..', 'fonts', 'NotoSansHebrew-Bold.ttf'),
        path.join(__dirname, '..', 'fonts', 'NotoSansHebrew-Regular.ttf'),
        path.join(__dirname, '..', 'fonts', 'Heebo-Bold.ttf'),
        path.join(__dirname, '..', 'fonts', 'Heebo-Regular.ttf')
      ],
      defaultFontFamily: 'Noto Sans Hebrew',
      loadSystemFonts: false,
    },
    fitTo: {
      mode: 'width',
      value: 800,
    }
  });

  const pngBuffer = resvg.render().asPng();
  const dest = path.join(baseOutDir, 'test_fallback_bold.png');
  fs.writeFileSync(dest, pngBuffer);
  console.log('Saved fallback test to:', dest);
}

main();
