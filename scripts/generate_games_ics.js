const fs = require('fs');
const path = require('path');

const games = [
  {
    code: '802337',
    round: 1,
    date: '20261020',
    startTime: '163000',
    endTime: '180000',
    summary: '[סהר] משחק קט-סל: נגד הפועל ל.ח. חוף השרון (בית)',
    opponent: 'הפועל ל.ח. חוף השרון',
    location: 'ביה"ס תפוז, רח\' רמב"ם, פרדסיה',
    isHome: true
  },
  {
    code: '802341',
    round: 2,
    date: '20261110',
    startTime: '163000',
    endTime: '180000',
    summary: '[סהר] משחק קט-סל: נגד הפועל מ.ק. פרדסיה רימון (דרבי חוץ)',
    opponent: 'הפועל מ.ק. פרדסיה רימון',
    location: 'ביה"ס תפוז, רח\' רמב"ם, פרדסיה',
    isHome: false
  },
  {
    code: '802344',
    round: 3,
    date: '20261124',
    startTime: '163000',
    endTime: '180000',
    summary: '[סהר] משחק קט-סל: נגד מ.ס. אבן יהודה אננס (בית)',
    opponent: 'מ.ס. אבן יהודה אננס',
    location: 'ביה"ס תפוז, רח\' רמב"ם, פרדסיה',
    isHome: true
  },
  {
    code: '802348',
    round: 4,
    date: '20261215',
    startTime: '170000',
    endTime: '183000',
    summary: '[סהר] משחק קט-סל: נגד מכבי קדימה צורן (חוץ)',
    opponent: 'מכבי קדימה צורן',
    location: 'רח\' הדקלים, קדימה',
    isHome: false
  },
  {
    code: '802357',
    round: 6,
    date: '20270112',
    startTime: '163000',
    endTime: '180000',
    summary: '[סהר] משחק קט-סל: נגד הפועל לב השרון דרור (בית)',
    opponent: 'הפועל לב השרון דרור',
    location: 'ביה"ס תפוז, רח\' רמב"ם, פרדסיה',
    isHome: true
  },
  {
    code: '802360',
    round: 7,
    date: '20270126',
    startTime: '170000',
    endTime: '183000',
    summary: '[סהר] משחק קט-סל: נגד מ.ס. אבן יהודה תות (חוץ)',
    opponent: 'מ.ס. אבן יהודה תות',
    location: 'אולם רלף קליין, רח\' השרון, אבן יהודה',
    isHome: false
  },
  {
    code: '802365',
    round: 8,
    date: '20270212',
    startTime: '163000',
    endTime: '180000',
    summary: '[סהר] משחק קט-סל: נגד הפועל ל.ח. חוף השרון (חוץ)',
    opponent: 'הפועל ל.ח. חוף השרון',
    location: 'מושב בית יהושע',
    isHome: false
  },
  {
    code: '802369',
    round: 9,
    date: '20270223',
    startTime: '163000',
    endTime: '180000',
    summary: '[סהר] משחק קט-סל: נגד הפועל מ.ק. פרדסיה רימון (דרבי בית)',
    opponent: 'הפועל מ.ק. פרדסיה רימון',
    location: 'ביה"ס תפוז, רח\' רמב"ם, פרדסיה',
    isHome: true
  },
  {
    code: '802372',
    round: 10,
    date: '20270309',
    startTime: '170000',
    endTime: '183000',
    summary: '[סהר] משחק קט-סל: נגד מ.ס. אבן יהודה אננס (חוץ)',
    opponent: 'מ.ס. אבן יהודה אננס',
    location: 'אולם ביה"ס ראשונים, אבן יהודה',
    isHome: false
  },
  {
    code: '802376',
    round: 11,
    date: '20270330',
    startTime: '163000',
    endTime: '180000',
    summary: '[סהר] משחק קט-סל: נגד מכבי קדימה צורן (בית)',
    opponent: 'מכבי קדימה צורן',
    location: 'ביה"ס תפוז, רח\' רמב"ם, פרדסיה',
    isHome: true
  },
  {
    code: '802385',
    round: 13,
    date: '20270521',
    startTime: '163000',
    endTime: '180000',
    summary: '[סהר] משחק קט-סל: נגד הפועל לב השרון דרור (חוץ)',
    opponent: 'הפועל לב השרון דרור',
    location: 'לב הפרדס, מושב גאולים',
    isHome: false
  },
  {
    code: '802388',
    round: 14,
    date: '20270608',
    startTime: '163000',
    endTime: '180000',
    summary: '[סהר] משחק קט-סל: נגד מ.ס. אבן יהודה תות (בית)',
    opponent: 'מ.ס. אבן יהודה תות',
    location: 'ביה"ס תפוז, רח\' רמב"ם, פרדסיה',
    isHome: true
  }
];

function generateIcs() {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sahar Basketball League//IL',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'X-WR-CALNAME:משחקי ליגה - סהר קט-סל',
    'X-WR-TIMEZONE:Asia/Jerusalem'
  ];

  for (const g of games) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:basketball-game-${g.code}@eink-dashboard`);
    lines.push(`DTSTAMP:20260923T070000Z`);
    lines.push(`DTSTART;TZID=Asia/Jerusalem:${g.date}T${g.startTime}`);
    lines.push(`DTEND;TZID=Asia/Jerusalem:${g.date}T${g.endTime}`);
    lines.push(`SUMMARY:${g.summary}`);
    lines.push(`LOCATION:${g.location}`);
    lines.push(`DESCRIPTION:משחק ליגה קט-סל ב מחזור ${g.round}\\nיריבה: ${g.opponent}\\nמיקום: ${g.location}\\nאורך: שעה וחצי`);
    lines.push('ORGANIZER;CN=חוגים סהר וסול:mailto:hugim.kid@gmail.com');
    lines.push('ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=Pini:mailto:matzner.pini@gmail.com');
    lines.push('ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=Nadia:mailto:nadialip5@gmail.com');
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  const content = lines.join('\r\n');
  const outPath = path.join(__dirname, '..', 'public', 'sahar_basketball_games.ics');
  fs.writeFileSync(outPath, content, 'utf8');
  console.log('Saved ICS file to:', outPath);
}

generateIcs();
