const fs = require('fs');
const path = require('path');
const https = require('https');

const fontsDir = path.join(__dirname, '..', 'fonts');

const FONTS = [
  {
    name: 'Rubik-Regular.ttf',
    url: 'https://fonts.gstatic.com/s/rubik/v31/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-B4iFVUUw.ttf'
  },
  {
    name: 'Rubik-Bold.ttf',
    url: 'https://fonts.gstatic.com/s/rubik/v31/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-4I-FVUUw.ttf'
  },
  {
    name: 'Rubik-Black.ttf',
    url: 'https://fonts.gstatic.com/s/rubik/v31/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-ro-FVUUw.ttf'
  }
];

if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Status ${response.statusCode} for ${url}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${path.basename(dest)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('Downloading extra fonts directly to project fonts folder...');
  for (const font of FONTS) {
    const dest = path.join(fontsDir, font.name);
    try {
      await downloadFile(font.url, dest);
    } catch (err) {
      console.error(`Error downloading ${font.name}:`, err.message);
    }
  }
  console.log('Download complete.');
}

main();
