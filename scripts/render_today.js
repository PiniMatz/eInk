const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { generateSvg } = require('../renderer');
const db = require('../db');
const { getWeather } = require('../weather');

async function main() {
  const today = new Date('2026-07-20T12:00:00+03:00');
  const events = await db.getEvents(2026, 7);
  const tasks = await db.getTasks();
  const weather = await getWeather();

  console.log('Today:', today.toISOString());
  console.log('Total events fetched:', events.length);
  
  const week25Events = events.filter(e => e.date === '2026-07-25');
  console.log('Events on 2026-07-25:', week25Events);

  const data = {
    date: today,
    events,
    tasks,
    weather
  };

  const svgString = generateSvg(data);
  fs.writeFileSync(path.join(__dirname, 'today_screen.svg'), svgString);

  const resvg = new Resvg(svgString, {
    font: {
      fontFiles: [
        path.join(__dirname, '..', 'fonts', 'Rubik-Bold.ttf'),
        path.join(__dirname, '..', 'fonts', 'Rubik-Regular.ttf'),
        path.join(__dirname, '..', 'fonts', 'Rubik-Black.ttf')
      ],
      defaultFontFamily: 'Rubik Light',
      loadSystemFonts: false,
    },
    fitTo: { mode: 'width', value: 800 }
  });

  const png = resvg.render().asPng();
  fs.writeFileSync(path.join(__dirname, 'today_screen.png'), png);
  console.log('Saved today_screen.png!');
}

main();
