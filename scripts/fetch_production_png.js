const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

async function main() {
  const url = 'https://e-ink-pini.vercel.app/api/screen?format=svg';
  console.log('Fetching live SVG from:', url);
  const res = await fetch(url);
  const svgText = await res.text();
  
  // Write SVG locally
  fs.writeFileSync(path.join(__dirname, 'production_screen.svg'), svgText);
  console.log('Saved production_screen.svg!');

  // Render to PNG
  const resvg = new Resvg(svgText, {
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

  const pngBuffer = resvg.render().asPng();
  fs.writeFileSync(path.join(__dirname, 'production_screen.png'), pngBuffer);
  console.log('Saved production_screen.png!');
}

main().catch(err => console.error(err));
