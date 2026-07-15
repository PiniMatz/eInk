const fs = require('fs');
const path = require('path');
const https = require('https');

const fontsDir = path.join(__dirname, '..', 'fonts');

const FONTS = [
  {
    name: 'Heebo-Bold.ttf',
    url: 'https://github.com/t0mer/hebrew-clock/raw/main/Heebo-Bold.ttf'
  },
  {
    name: 'NotoSansHebrew-Bold.ttf',
    url: 'https://github.com/t0mer/hebrew-clock/raw/main/NotoSansHebrew-Bold.ttf'
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
        // Handle redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: Status code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded and saved: ${path.basename(dest)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('Downloading Hebrew fonts from hebrew-clock repository...');
  for (const font of FONTS) {
    const dest = path.join(fontsDir, font.name);
    try {
      await downloadFile(font.url, dest);
    } catch (err) {
      console.error(`Error downloading ${font.name}:`, err.message);
    }
  }
  console.log('Fonts download completed.');
}

main();
