const fs = require('fs');
const path = require('path');

const regPath = path.join(__dirname, '..', 'fonts', 'Rubik-Regular.ttf');
const buffer = fs.readFileSync(regPath);

console.log('Size:', buffer.length);
console.log('Header (Hex):', buffer.subarray(0, 30).toString('hex'));
console.log('Header (ASCII):', buffer.toString('ascii', 0, 30).replace(/[^ -~]/g, '.'));
