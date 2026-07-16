const fs = require('fs');
const path = require('path');

// Local fallback database file
const LOCAL_DB_PATH = path.join(__dirname, 'db.json');

// Initialize Firebase Admin if environment variables are set
let firestore = null;

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    const admin = require('firebase-admin');
    
    // Prevent double initialization if serverless function hot-reloads
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Handle escaped newline strings common in environment configurations
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
      });
    }
    
    firestore = admin.firestore();
    console.log('Database: Using Google Firebase Firestore');
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK:', err.message);
  }
}

if (!firestore) {
  console.log('Database: Using local JSON file storage (db.json)');
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify({ events: [], tasks: [], calendars: [] }, null, 2));
  }
}

// Local File Helper Functions
function readLocal() {
  try {
    const data = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { events: [], tasks: [], calendars: [] };
  }
}

function writeLocal(data) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
}

// Unified Database API
const db = {
  // --- EVENTS (Calendar) ---
  async getEvents(year, month) {
    const monthStr = String(month).padStart(2, '0');
    const startRange = `${year}-${monthStr}-01`;
    // Standard calendar grid could display dates up to 31st
    const endRange = `${year}-${monthStr}-31`;

    if (firestore) {
      try {
        const snapshot = await firestore.collection('events')
          .where('date', '>=', startRange)
          .where('date', '<=', endRange)
          .get();
        
        const events = [];
        snapshot.forEach(doc => {
          events.push({ id: doc.id, ...doc.data() });
        });
        return events;
      } catch (err) {
        console.error('Firestore getEvents failed:', err);
        return [];
      }
    } else {
      const data = readLocal();
      const prefix = `${year}-${monthStr}`;
      return data.events.filter(e => e.date.startsWith(prefix));
    }
  },

  async addEvent(event) {
    // event: { date ("YYYY-MM-DD"), title (Hebrew string), author, isTimed, time, source }
    if (firestore) {
      try {
        const docRef = await firestore.collection('events').add({
          title: event.title,
          date: event.date,
          author: event.author || '',
          isTimed: event.isTimed || false,
          time: event.time || '',
          source: event.source || ''
        });
        return { id: docRef.id, ...event };
      } catch (err) {
        console.error('Firestore addEvent failed:', err);
        throw err;
      }
    } else {
      event.id = Math.random().toString(36).substring(2, 9);
      event.isTimed = event.isTimed || false;
      event.time = event.time || '';
      event.source = event.source || '';
      const data = readLocal();
      data.events.push(event);
      writeLocal(data);
      return event;
    }
  },

  async deleteEvent(id) {
    if (firestore) {
      try {
        await firestore.collection('events').doc(id).delete();
      } catch (err) {
        console.error('Firestore deleteEvent failed:', err);
        throw err;
      }
    } else {
      const data = readLocal();
      data.events = data.events.filter(e => e.id !== id);
      writeLocal(data);
    }
  },

  // --- TASKS (Daily Schedule) ---
  async getTasks(date) {
    // date: "YYYY-MM-DD"
    if (firestore) {
      try {
        const snapshot = await firestore.collection('tasks')
          .where('date', '==', date)
          .get();
        
        const tasks = [];
        snapshot.forEach(doc => {
          tasks.push({ id: doc.id, ...doc.data() });
        });
        // Sort tasks by time
        return tasks.sort((a, b) => a.time.localeCompare(b.time));
      } catch (err) {
        console.error('Firestore getTasks failed:', err);
        return [];
      }
    } else {
      const data = readLocal();
      const tasks = (data.tasks || []).filter(t => t.date === date);
      return tasks.sort((a, b) => a.time.localeCompare(b.time));
    }
  },

  async addTask(task) {
    // task: { date ("YYYY-MM-DD"), time ("HH:MM"), description (Hebrew string), author, source }
    if (firestore) {
      try {
        const docRef = await firestore.collection('tasks').add({
          description: task.description,
          time: task.time,
          date: task.date,
          author: task.author || '',
          source: task.source || ''
        });
        return { id: docRef.id, ...task };
      } catch (err) {
        console.error('Firestore addTask failed:', err);
        throw err;
      }
    } else {
      task.id = Math.random().toString(36).substring(2, 9);
      task.source = task.source || '';
      const data = readLocal();
      data.tasks.push(task);
      writeLocal(data);
      return task;
    }
  },

  async deleteTask(id) {
    if (firestore) {
      try {
        await firestore.collection('tasks').doc(id).delete();
      } catch (err) {
        console.error('Firestore deleteTask failed:', err);
        throw err;
      }
    } else {
      const data = readLocal();
      data.tasks = data.tasks.filter(t => t.id !== id);
      writeLocal(data);
    }
  },

  // --- CALENDARS (Google Calendar Links) ---
  async getCalendars() {
    if (firestore) {
      try {
        const snapshot = await firestore.collection('calendars').get();
        const calendars = [];
        snapshot.forEach(doc => {
          calendars.push({ id: doc.id, ...doc.data() });
        });
        return calendars;
      } catch (err) {
        console.error('Firestore getCalendars failed:', err);
        return [];
      }
    } else {
      const data = readLocal();
      return data.calendars || [];
    }
  },

  async addCalendar(cal) {
    if (firestore) {
      try {
        const docRef = await firestore.collection('calendars').add({
          name: cal.name,
          url: cal.url
        });
        return { id: docRef.id, ...cal };
      } catch (err) {
        console.error('Firestore addCalendar failed:', err);
        throw err;
      }
    } else {
      const data = readLocal();
      if (!data.calendars) data.calendars = [];
      cal.id = Math.random().toString(36).substring(2, 9);
      data.calendars.push(cal);
      writeLocal(data);
      return cal;
    }
  },

  async deleteCalendar(id) {
    if (firestore) {
      try {
        await firestore.collection('calendars').doc(id).delete();
        // Also wipe all sync items from this calendar
        const batch = firestore.batch();
        const eventsSnapshot = await firestore.collection('events').where('source', '==', id).get();
        eventsSnapshot.forEach(doc => batch.delete(doc.ref));
        const tasksSnapshot = await firestore.collection('tasks').where('source', '==', id).get();
        tasksSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      } catch (err) {
        console.error('Firestore deleteCalendar failed:', err);
        throw err;
      }
    } else {
      const data = readLocal();
      if (data.calendars) {
        data.calendars = data.calendars.filter(c => c.id !== id);
      }
      data.events = data.events.filter(e => e.source !== id);
      data.tasks = data.tasks.filter(t => t.source !== id);
      writeLocal(data);
    }
  },

  async deleteCalendarEventsAndTasks(calendarId, rangeStart, rangeEnd) {
    const startStr = `${rangeStart.getFullYear()}-${String(rangeStart.getMonth() + 1).padStart(2, '0')}-${String(rangeStart.getDate()).padStart(2, '0')}`;
    const endStr = `${rangeEnd.getFullYear()}-${String(rangeEnd.getMonth() + 1).padStart(2, '0')}-${String(rangeEnd.getDate()).padStart(2, '0')}`;
    
    if (firestore) {
      try {
        // Delete events
        const eventsSnapshot = await firestore.collection('events')
          .where('source', '==', calendarId)
          .where('date', '>=', startStr)
          .where('date', '<=', endStr)
          .get();
        const batch = firestore.batch();
        eventsSnapshot.forEach(doc => batch.delete(doc.ref));
        
        // Delete tasks
        const tasksSnapshot = await firestore.collection('tasks')
          .where('source', '==', calendarId)
          .where('date', '>=', startStr)
          .where('date', '<=', endStr)
          .get();
        tasksSnapshot.forEach(doc => batch.delete(doc.ref));
        
        await batch.commit();
      } catch (err) {
        console.error('Firestore deleteCalendarEventsAndTasks failed:', err);
      }
    } else {
      const data = readLocal();
      data.events = (data.events || []).filter(e => !(e.source === calendarId && e.date >= startStr && e.date <= endStr));
      data.tasks = (data.tasks || []).filter(t => !(t.source === calendarId && t.date >= startStr && t.date <= endStr));
      writeLocal(data);
    }
  },

  async syncCalendars() {
    const calendars = await this.getCalendars();
    if (calendars.length === 0) return;

    const ical = require('node-ical');
    const now = new Date();
    // Sync window: +/- 35 days
    const rangeStart = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
    const rangeEnd = new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000);

    for (const cal of calendars) {
      try {
        console.log(`Syncing calendar for ${cal.name}: ${cal.url}`);
        
        // 1. Wipe existing events/tasks from this calendar source within range
        await this.deleteCalendarEventsAndTasks(cal.id, rangeStart, rangeEnd);

        // 2. Fetch and parse iCal
        const webEvents = await ical.async.fromURL(cal.url);
        
        for (const k in webEvents) {
          if (!webEvents.hasOwnProperty(k)) continue;
          const ev = webEvents[k];
          if (ev.type !== 'VEVENT') continue;

          // Filter out yearly birthday events for "אבא"
          const isYearly = ev.rrule && (
            ev.rrule.options.freq === 0 || 
            ev.rrule.options.freq === 'YEARLY' || 
            (typeof ev.rrule.toString === 'function' && ev.rrule.toString().includes('FREQ=YEARLY'))
          );
          const startsWithBirthday = ev.summary && (
            ev.summary.trim().startsWith('יומולדת') || 
            ev.summary.trim().startsWith('יום הולדת')
          );
          if (cal.name === 'אבא' && isYearly && startsWithBirthday) {
            console.log(`Skipping yearly birthday event for אבא: ${ev.summary}`);
            continue;
          }

          // Collect occurrences
          const occurrences = [];
          if (ev.rrule) {
            try {
              const dates = ev.rrule.between(rangeStart, rangeEnd);
              dates.forEach(d => {
                occurrences.push({
                  summary: ev.summary,
                  start: d,
                  end: ev.end ? new Date(d.getTime() + (ev.end.getTime() - ev.start.getTime())) : d,
                  datetype: ev.datetype,
                  organizer: ev.organizer,
                  creator: ev.creator
                });
              });
            } catch (rruleErr) {
              console.error('Failed expanding rrule:', rruleErr.message);
            }
          } else {
            // Single occurrence
            if (ev.start >= rangeStart && ev.start <= rangeEnd) {
              occurrences.push(ev);
            }
          }

          // Insert occurrences into DB
          for (const occ of occurrences) {
            const occStart = occ.start;
            const dateStr = `${occStart.getFullYear()}-${String(occStart.getMonth() + 1).padStart(2, '0')}-${String(occStart.getDate()).padStart(2, '0')}`;
            
            // Resolve correct Hebrew owner name
            const resolvedAuthor = getEventOrganizerName(occ, cal.name);

            if (occ.datetype === 'date') {
              // All-day event
              // Check if duplicate all-day event already added
              if (await isDuplicateEvent(dateStr, occ.summary || 'אירוע')) {
                console.log(`Skipping duplicate event: ${occ.summary} on ${dateStr}`);
                continue;
              }
              await this.addEvent({
                title: occ.summary || 'אירוע',
                date: dateStr,
                author: resolvedAuthor,
                isTimed: false,
                time: '',
                source: cal.id
              });
            } else {
              // Timed event
              const hourStr = `${String(occStart.getHours()).padStart(2, '0')}:${String(occStart.getMinutes()).padStart(2, '0')}`;
              
              // Check if duplicate timed event already added
              if (await isDuplicateTask(dateStr, hourStr, occ.summary || 'פעילות')) {
                console.log(`Skipping duplicate task/event: ${occ.summary} on ${dateStr} at ${hourStr}`);
                continue;
              }

              // 1. Add to tasks (Daily Schedule)
              await this.addTask({
                description: occ.summary || 'פעילות',
                date: dateStr,
                time: hourStr,
                author: resolvedAuthor,
                source: cal.id
              });

              // 2. Add to events (Weekly Agenda) - summarized title
              const shortSummary = await summarizeTitle(occ.summary || 'פעילות');
              await this.addEvent({
                title: shortSummary,
                date: dateStr,
                author: resolvedAuthor,
                isTimed: true,
                time: hourStr,
                source: cal.id
              });
            }
          }
        }
      } catch (err) {
        console.error(`Failed to sync calendar ${cal.name}:`, err.message);
      }
  },
  isUsingFirestore() {
    return firestore !== null;
  }
};

// --- Hybrid Hebrew Title Summarization ---
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  } catch (err) {
    console.error('Failed to load @google/generative-ai package:', err.message);
  }
}

async function summarizeTitleAI(title) {
  if (!genAI) return null;
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `קצר את כותרת האירוע הבאה ל-1 או 2 מילים משמעותיות בלבד בעברית (למשל "פגישת עבודה עם דני" -> "פגישה", "שיעור פסנתר בקונסרבטוריון" -> "שיעור פסנתר", "יום הולדת לאבא בגן" -> "יומולדת"): "${title}"`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleanText = text.replace(/['"״`״]+/g, '');
    if (cleanText && cleanText.length > 0 && cleanText.length < 20) {
      return cleanText;
    }
  } catch (err) {
    console.error('Gemini summary failed:', err.message);
  }
  return null;
}

function summarizeTitleRule(title) {
  if (!title) return '';
  let clean = title.trim();
  
  clean = clean
    .replace(/^יום הולדת ל/g, 'יומולדת ')
    .replace(/^יום הולדת של/g, 'יומולדת ')
    .replace(/^פגישת עבודה עם/g, 'פגישה')
    .replace(/^פגישה עם/g, 'פגישה')
    .replace(/^שיעור/g, 'שיעור')
    .replace(/^תור ל/g, 'תור ')
    .replace(/^אימון/g, 'אימון');

  const stopWords = ['של', 'עם', 'את', 'ל-', 'ב-', 'אל', 'ה-', 'על', 'בתוך'];
  let words = clean.split(/\s+/);
  words = words.filter(w => !stopWords.includes(w));
  
  const shortTitle = words.slice(0, 2).join(' ');
  return shortTitle || clean;
}

async function summarizeTitle(title) {
  const aiSummary = await summarizeTitleAI(title);
  if (aiSummary) return aiSummary;
  return summarizeTitleRule(title);
}

function getEventOrganizerName(ev, defaultName) {
  let org = ev.organizer;
  if (!org && ev.creator) org = ev.creator;
  
  if (!org) return defaultName;
  
  let val = '';
  if (typeof org === 'string') {
    val = org;
  } else if (org.val) {
    val = org.val;
  }
  
  let cn = '';
  if (org.params) {
    cn = org.params.cn || org.params.CN || '';
  }
  
  const text = `${val} ${cn}`.toLowerCase();
  
  if (text.includes('michal') || text.includes('מיכל') || text.includes('אמא')) return 'אמא';
  if (text.includes('pini') || text.includes('פיני') || text.includes('אבא')) return 'אבא';
  if (text.includes('sahar') || text.includes('סהר')) return 'סהר';
  if (text.includes('sol') || text.includes('סול')) return 'סול';
  
  return defaultName;
}

async function isDuplicateEvent(dateStr, title) {
  if (firestore) {
    try {
      const snapshot = await firestore.collection('events')
        .where('date', '==', dateStr)
        .where('title', '==', title)
        .get();
      return !snapshot.empty;
    } catch (err) {
      return false;
    }
  } else {
    const data = readLocal();
    return (data.events || []).some(e => e.date === dateStr && e.title === title);
  }
}

async function isDuplicateTask(dateStr, timeStr, desc) {
  if (firestore) {
    try {
      const snapshot = await firestore.collection('tasks')
        .where('date', '==', dateStr)
        .where('time', '==', timeStr)
        .where('description', '==', desc)
        .get();
      return !snapshot.empty;
    } catch (err) {
      return false;
    }
  } else {
    const data = readLocal();
    return (data.tasks || []).some(t => t.date === dateStr && t.time === timeStr && t.description === desc);
  }
}

module.exports = db;
