const { generateSvg } = require('../renderer');
const mockData = {
  date: new Date('2026-07-15T12:00:00'),
  events: [],
  tasks: [],
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
const svg = generateSvg(mockData);
console.log(svg.substring(0, 800));
