const { HDate } = require('@hebcal/core');
const hdate = new HDate(new Date());
const day = hdate.renderGematriya(hdate.getDate());
const month = hdate.getMonthName('he');
const year = hdate.renderGematriya(hdate.getFullYear());
console.log('Hebrew Date fully in Hebrew letters:', `${day} ב${month} ${year}`);
