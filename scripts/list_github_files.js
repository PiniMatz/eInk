const https = require('https');

const options = {
  hostname: 'api.github.com',
  path: '/repos/google/fonts/contents/ofl/rubik/static',
  headers: {
    'User-Agent': 'NodeJS-Script'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const files = JSON.parse(data);
      if (Array.isArray(files)) {
        console.log('Files in ofl/rubik/static:');
        files.forEach(f => console.log(` - ${f.name} (download_url: ${f.download_url})`));
      } else {
        console.log('Response not an array:', data.substring(0, 500));
        // Try root ofl/rubik
        options.path = '/repos/google/fonts/contents/ofl/rubik';
        https.get(options, (res2) => {
          let data2 = '';
          res2.on('data', chunk => data2 += chunk);
          res2.on('end', () => {
            const files2 = JSON.parse(data2);
            if (Array.isArray(files2)) {
              console.log('Files in ofl/rubik:');
              files2.forEach(f => console.log(` - ${f.name}`));
            } else {
              console.log('ofl/rubik response not an array:', data2.substring(0, 500));
            }
          });
        });
      }
    } catch (e) {
      console.error('Error parsing response:', e);
    }
  });
}).on('error', err => console.error(err));
