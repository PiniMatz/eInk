const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { generateSvg } = require('./renderer');

// Load all fonts in the fonts folder
const fontBuffers = [];
const fontsDir = path.join(process.cwd(), 'fonts');
if (fs.existsSync(fontsDir)) {
  fs.readdirSync(fontsDir).forEach(file => {
    if (file.endsWith('.ttf')) {
      fontBuffers.push(fs.readFileSync(path.join(fontsDir, file)));
    }
  });
}

const outPath = path.join('C:', 'Users', 'pini_', '.gemini', 'antigravity', 'brain', '914ca031-02a6-4823-8a9e-f54ff7ea71f5', 'rendered_screen_diagnostic.png');

const mockData = {
  date: new Date('2026-07-15T12:00:00'),
  events: [
    { id: '1', date: '2026-07-01', title: 'פגישת פתיחה' },
    { id: '2', date: '2026-07-15', title: 'פרויקט דיו אלקטרוני', author: 'פיני' },
    { id: '2b', date: '2026-07-15', title: 'סרט - סולטיר', isTimed: true, time: '16:30', author: 'סהר' },
    { id: '2c', date: '2026-07-15', title: 'תור לרופא', isTimed: true, time: '18:00' },
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
  console.log('Rendering ePaper screen to PNG directly in node...');
  try {
    const svgString = generateSvg(mockData);
    const resvg = new Resvg(svgString, {
      font: {
        fontBuffers,
        defaultFontFamily: 'Assistant',
        loadSystemFonts: false,
      },
      fitTo: {
        mode: 'width',
        value: 800,
      }
    });

    const pngBuffer = resvg.render().asPng();
    fs.writeFileSync(outPath, pngBuffer);
    console.log('Success! Test render saved to:', outPath);
  } catch (err) {
    console.error('Error rendering:', err.message, err.stack);
  }
}

main();
