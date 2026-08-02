const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const boldPath = path.join(__dirname, '..', 'fonts', 'Rubik-Bold.ttf');
const regPath = path.join(__dirname, '..', 'fonts', 'Rubik-Regular.ttf');
const blackPath = path.join(__dirname, '..', 'fonts', 'Rubik-Black.ttf');

console.log('Bold font exists:', fs.existsSync(boldPath));
console.log('Regular font exists:', fs.existsSync(regPath));
console.log('Black font exists:', fs.existsSync(blackPath));

// Let's check if we can render a simple SVG with text using Rubik
const svg = `
<svg width="600" height="150" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white" />
  <style>
    .bold-txt { font-family: 'Rubik Light Black', sans-serif; font-size: 24px; font-weight: 900; fill: black; }
    .reg-txt { font-family: 'Rubik Light', sans-serif; font-size: 24px; font-weight: 700; fill: black; }
  </style>
  <text x="20" y="50" class="bold-txt">‫שלום עולם Rubik Black 900‬</text>
  <text x="20" y="100" class="reg-txt">‫שלום עולם Rubik Bold 700‬</text>
</svg>
`;

try {
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: [boldPath, regPath, blackPath],
      defaultFontFamily: 'Rubik Light',
      loadSystemFonts: false
    }
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(path.join(__dirname, 'test_rubik_simple.png'), png);
  console.log('Successfully rendered simple test!');
} catch (err) {
  console.error('Error rendering simple test:', err);
}
