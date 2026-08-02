const https = require('https');

const urls = [
  'https://raw.githubusercontent.com/wix/wix-style-react/master/src/assets/fonts/Rubik-Regular.ttf',
  'https://raw.githubusercontent.com/wix/wix-style-react/master/src/assets/fonts/Rubik-Bold.ttf',
  'https://raw.githubusercontent.com/googlefonts/rubik/main/fonts/ttf/Rubik-Regular.ttf',
  'https://raw.githubusercontent.com/googlefonts/rubik/master/fonts/ttf/Rubik-Regular.ttf'
];

function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      console.log(`URL: ${url} -> Status: ${res.statusCode}`);
      resolve(res.statusCode === 200);
    }).on('error', (err) => {
      console.log(`URL: ${url} -> Error: ${err.message}`);
      resolve(false);
    });
  });
}

async function main() {
  for (const url of urls) {
    await checkUrl(url);
  }
}

main();
