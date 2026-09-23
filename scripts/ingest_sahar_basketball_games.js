const db = require('../db');
const { addGoogleCalendarEvent } = require('../google-calendar');

const games = [
  {
    code: '802337',
    round: 1,
    day: 'יום שלישי',
    date: '2026-10-20',
    time: '16:30',
    durationMinutes: 90,
    endTime: '18:00',
    homeTeam: 'הפועל מ.ק. פרדסיה תפוז',
    awayTeam: 'הפועל ל.ח. חוף השרון',
    opponent: 'הפועל ל.ח. חוף השרון',
    opponentShort: 'חוף השרון',
    isHome: true,
    venueFull: 'ביה"ס תפוז, רח\' רמב"ם, פרדסיה',
    venueShort: 'ביה"ס תפוז'
  },
  {
    code: '802341',
    round: 2,
    day: 'יום שלישי',
    date: '2026-11-10',
    time: '16:30',
    durationMinutes: 90,
    endTime: '18:00',
    homeTeam: 'הפועל מ.ק. פרדסיה רימון',
    awayTeam: 'הפועל מ.ק. פרדסיה תפוז',
    opponent: 'הפועל מ.ק. פרדסיה רימון',
    opponentShort: 'פרדסיה רימון',
    isHome: false,
    venueFull: 'ביה"ס תפוז, רח\' רמב"ם, פרדסיה',
    venueShort: 'ביה"ס תפוז'
  },
  {
    code: '802344',
    round: 3,
    day: 'יום שלישי',
    date: '2026-11-24',
    time: '16:30',
    durationMinutes: 90,
    endTime: '18:00',
    homeTeam: 'הפועל מ.ק. פרדסיה תפוז',
    awayTeam: 'מ.ס. אבן יהודה אננס',
    opponent: 'מ.ס. אבן יהודה אננס',
    opponentShort: 'אבן יהודה אננס',
    isHome: true,
    venueFull: 'ביה"ס תפוז, רח\' רמב"ם, פרדסיה',
    venueShort: 'ביה"ס תפוז'
  },
  {
    code: '802348',
    round: 4,
    day: 'יום שלישי',
    date: '2026-12-15',
    time: '17:00',
    durationMinutes: 90,
    endTime: '18:30',
    homeTeam: 'מכבי קדימה צורן',
    awayTeam: 'הפועל מ.ק. פרדסיה תפוז',
    opponent: 'מכבי קדימה צורן',
    opponentShort: 'קדימה צורן',
    isHome: false,
    venueFull: 'רח\' הדקלים, קדימה',
    venueShort: 'רח\' הדקלים, קדימה'
  },
  {
    code: '802357',
    round: 6,
    day: 'יום שלישי',
    date: '2027-01-12',
    time: '16:30',
    durationMinutes: 90,
    endTime: '18:00',
    homeTeam: 'הפועל מ.ק. פרדסיה תפוז',
    awayTeam: 'הפועל לב השרון דרור',
    opponent: 'הפועל לב השרון דרור',
    opponentShort: 'לב השרון דרור',
    isHome: true,
    venueFull: 'ביה"ס תפוז, רח\' רמב"ם, פרדסיה',
    venueShort: 'ביה"ס תפוז'
  },
  {
    code: '802360',
    round: 7,
    day: 'יום שלישי',
    date: '2027-01-26',
    time: '17:00',
    durationMinutes: 90,
    endTime: '18:30',
    homeTeam: 'מ.ס. אבן יהודה תות',
    awayTeam: 'הפועל מ.ק. פרדסיה תפוז',
    opponent: 'מ.ס. אבן יהודה תות',
    opponentShort: 'אבן יהודה תות',
    isHome: false,
    venueFull: 'אולם רלף קליין, רח\' השרון, אבן יהודה',
    venueShort: 'אולם רלף קליין, אבן יהודה'
  },
  {
    code: '802365',
    round: 8,
    day: 'יום שישי',
    date: '2027-02-12',
    time: '16:30',
    durationMinutes: 90,
    endTime: '18:00',
    homeTeam: 'הפועל ל.ח. חוף השרון',
    awayTeam: 'הפועל מ.ק. פרדסיה תפוז',
    opponent: 'הפועל ל.ח. חוף השרון',
    opponentShort: 'חוף השרון',
    isHome: false,
    venueFull: 'מושב בית יהושע',
    venueShort: 'מושב בית יהושע'
  },
  {
    code: '802369',
    round: 9,
    day: 'יום שלישי',
    date: '2027-02-23',
    time: '16:30',
    durationMinutes: 90,
    endTime: '18:00',
    homeTeam: 'הפועל מ.ק. פרדסיה תפוז',
    awayTeam: 'הפועל מ.ק. פרדסיה רימון',
    opponent: 'הפועל מ.ק. פרדסיה רימון',
    opponentShort: 'פרדסיה רימון',
    isHome: true,
    venueFull: 'ביה"ס תפוז, רח\' רמב"ם, פרדסיה',
    venueShort: 'ביה"ס תפוז'
  },
  {
    code: '802372',
    round: 10,
    day: 'יום שלישי',
    date: '2027-03-09',
    time: '17:00',
    durationMinutes: 90,
    endTime: '18:30',
    homeTeam: 'מ.ס. אבן יהודה אננס',
    awayTeam: 'הפועל מ.ק. פרדסיה תפוז',
    opponent: 'מ.ס. אבן יהודה אננס',
    opponentShort: 'אבן יהודה אננס',
    isHome: false,
    venueFull: 'אולם ביה"ס ראשונים, אבן יהודה',
    venueShort: 'אולם ראשונים, אבן יהודה'
  },
  {
    code: '802376',
    round: 11,
    day: 'יום שלישי',
    date: '2027-03-30',
    time: '16:30',
    durationMinutes: 90,
    endTime: '18:00',
    homeTeam: 'הפועל מ.ק. פרדסיה תפוז',
    awayTeam: 'מכבי קדימה צורן',
    opponent: 'מכבי קדימה צורן',
    opponentShort: 'קדימה צורן',
    isHome: true,
    venueFull: 'ביה"ס תפוז, רח\' רמב"ם, פרדסיה',
    venueShort: 'ביה"ס תפוז'
  },
  {
    code: '802385',
    round: 13,
    day: 'יום שישי',
    date: '2027-05-21',
    time: '16:30',
    durationMinutes: 90,
    endTime: '18:00',
    homeTeam: 'הפועל לב השרון דרור',
    awayTeam: 'הפועל מ.ק. פרדסיה תפוז',
    opponent: 'הפועל לב השרון דרור',
    opponentShort: 'לב השרון דרור',
    isHome: false,
    venueFull: 'לב הפרדס, מושב גאולים',
    venueShort: 'לב הפרדס, מושב גאולים'
  },
  {
    code: '802388',
    round: 14,
    day: 'יום שלישי',
    date: '2027-06-08',
    time: '16:30',
    durationMinutes: 90,
    endTime: '18:00',
    homeTeam: 'הפועל מ.ק. פרדסיה תפוז',
    awayTeam: 'מ.ס. אבן יהודה תות',
    opponent: 'מ.ס. אבן יהודה תות',
    opponentShort: 'אבן יהודה תות',
    isHome: true,
    venueFull: 'ביה"ס תפוז, רח\' רמב"ם, פרדסיה',
    venueShort: 'ביה"ס תפוז'
  }
];

async function run() {
  console.log(`Starting ingestion of ${games.length} basketball league games for Sahar...\n`);

  let count = 0;
  for (const g of games) {
    count++;
    const fullTitle = `[סהר] משחק קט-סל: נגד ${g.opponentShort} (${g.venueShort})`;
    const gcalTitle = `משחק קט-סל: נגד ${g.opponent}`;
    const description = `ליגה: קט סל ב' לב השרון (מחזור ${g.round})\n` +
      `משחק: ${g.homeTeam} נגד ${g.awayTeam} (${g.isHome ? 'משחק בית' : 'משחק חוץ'})\n` +
      `מיקום: ${g.venueFull}\n` +
      `שעות: ${g.time} - ${g.endTime} (שעה וחצי)\n` +
      `קוד משחק: ${g.code}`;

    const eventObj = {
      title: fullTitle,
      date: g.date,
      author: 'סהר',
      time: g.time,
      durationMinutes: g.durationMinutes,
      endTime: g.endTime,
      location: g.venueFull,
      description: description,
      isTimed: true,
      source: 'league_schedule'
    };

    try {
      const added = await db.addEvent(eventObj);
      console.log(`[${count}/${games.length}] [+] Added to Firestore: ${g.date} ${g.time} - ${fullTitle} (ID: ${added.id})`);

      try {
        const gcalRes = await addGoogleCalendarEvent({
          calendarId: 'hugim.kid@gmail.com',
          kid: 'סהר',
          title: gcalTitle,
          date: g.date,
          time: g.time,
          durationMinutes: g.durationMinutes,
          location: g.venueFull,
          description: description
        });
        console.log(`    [+] Synced to Google Calendar: ID ${gcalRes.id}`);
      } catch (gErr) {
        console.warn(`    [-] Google Calendar sync note: ${gErr.message}`);
      }
    } catch (err) {
      console.error(`[-] Failed adding game ${g.code}:`, err.message);
    }
  }

  console.log('\n=== FINISHED INGESTING ALL BASKETBALL GAMES ===');
}

run().catch(console.error);
