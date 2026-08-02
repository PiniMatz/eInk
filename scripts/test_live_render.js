const fs = require('fs');
const path = require('path');
const { renderBmp } = require('../renderer');

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

function main() {
  console.log('Testing live renderBmp from renderer.js...');
  try {
    const bmpBuffer = renderBmp(mockData);
    console.log('BMP Buffer generated successfully, size:', bmpBuffer.length);
    
    // Convert the generated SVG to PNG directly to visually check
    const { generateSvg } = require('../renderer');
    const { Resvg } = require('@resvg/resvg-js');
    const svgString = generateSvg(mockData);
    
    const resvg = new Resvg(svgString, {
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
    fs.writeFileSync(path.join(baseOutDir, 'test_live_render_output.png'), pngBuffer);
    console.log('Saved test live render output to PNG.');
  } catch (err) {
    console.error('Error in live renderBmp:', err);
  }
}

main();
