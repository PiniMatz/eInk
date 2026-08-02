const https = require('https');

https.get('https://gwfh.mranftl.com/api/fonts/rubik?subsets=hebrew,latin', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const obj = JSON.parse(data);
      console.log('Font name:', obj.name);
      console.log('Variants available:', obj.variants.map(v => v.id));
      
      // Let's print regular and 700 bold variant details
      const regular = obj.variants.find(v => v.id === 'regular');
      const bold = obj.variants.find(v => v.id === '700');
      const black = obj.variants.find(v => v.id === '900');
      
      if (regular) {
        console.log('\nRegular Variant:');
        console.log(JSON.stringify(regular, null, 2));
      }
      if (bold) {
        console.log('\nBold Variant (700):');
        console.log(JSON.stringify(bold, null, 2));
      }
      if (black) {
        console.log('\nBlack Variant (900):');
        console.log(JSON.stringify(black, null, 2));
      }
    } catch (e) {
      console.log('Failed to parse:', data.substring(0, 500));
    }
  });
}).on('error', err => console.error(err));
