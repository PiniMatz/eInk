const fs = require('fs');
const path = require('path');

// Local fallback database file
const LOCAL_DB_PATH = path.join(__dirname, 'db.json');

// Initialize Firebase Admin if environment variables are set
let firestore = null;

let hasEnvKeys = process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;
let keyFile = path.join(__dirname, 'Firebase_Key.json');
let hasKeyFile = fs.existsSync(keyFile);

if (hasEnvKeys || hasKeyFile) {
  try {
    const admin = require('firebase-admin');
    
    // Prevent double initialization if serverless function hot-reloads
    if (admin.apps.length === 0) {
      let config;
      if (hasEnvKeys) {
        config = {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };
      } else {
        const serviceAccount = require(keyFile);
        config = {
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key,
        };
      }
      admin.initializeApp({
        credential: admin.credential.cert(config)
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

  async updateTaskAuthor(id, newAuthor) {
    if (firestore) {
      try {
        await firestore.collection('tasks').doc(id).update({ author: newAuthor });
      } catch (err) {
        console.error('Firestore updateTaskAuthor failed:', err);
      }
    } else {
      const data = readLocal();
      const task = (data.tasks || []).find(t => t.id === id);
      if (task) task.author = newAuthor;
      writeLocal(data);
    }
  },

  async updateEventAuthor(dateStr, timeStr, newAuthor) {
    if (firestore) {
      try {
        const isTimed = timeStr !== '';
        const snapshot = await firestore.collection('events')
          .where('date', '==', dateStr)
          .where('time', '==', timeStr)
          .where('isTimed', '==', isTimed)
          .get();
        const batch = firestore.batch();
        snapshot.forEach(doc => {
          batch.update(doc.ref, { author: newAuthor });
        });
        await batch.commit();
      } catch (err) {
        console.error('Firestore updateEventAuthor failed:', err);
      }
    } else {
      const data = readLocal();
      const isTimed = timeStr !== '';
      const events = (data.events || []).filter(e => e.date === dateStr && e.time === timeStr && e.isTimed === isTimed);
      events.forEach(e => e.author = newAuthor);
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
          .get();
        const batch = firestore.batch();
        eventsSnapshot.forEach(doc => {
          const d = doc.data();
          if (d.date >= startStr && d.date <= endStr) {
            batch.delete(doc.ref);
          }
        });
        
        // Delete tasks
        const tasksSnapshot = await firestore.collection('tasks')
          .where('source', '==', calendarId)
          .get();
        tasksSnapshot.forEach(doc => {
          const d = doc.data();
          if (d.date >= startStr && d.date <= endStr) {
            batch.delete(doc.ref);
          }
        });
        
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
    let rangeStart = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
    const minDate = new Date('2026-07-12T00:00:00Z');
    if (rangeStart < minDate) {
      rangeStart = minDate;
    }
    const rangeEnd = new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000);
    const startStr = `${rangeStart.getFullYear()}-${String(rangeStart.getMonth() + 1).padStart(2, '0')}-${String(rangeStart.getDate()).padStart(2, '0')}`;
    const endStr = `${rangeEnd.getFullYear()}-${String(rangeEnd.getMonth() + 1).padStart(2, '0')}-${String(rangeEnd.getDate()).padStart(2, '0')}`;

    // 1. Fetch all existing events and tasks from Firestore to do in-memory lookup
    let existingEvents = [];
    let existingTasks = [];
    if (firestore) {
      try {
        const evSnap = await firestore.collection('events').get();
        evSnap.forEach(doc => existingEvents.push({ id: doc.id, ...doc.data() }));
        const tSnap = await firestore.collection('tasks').get();
        tSnap.forEach(doc => existingTasks.push({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.error('Failed to load existing items for sync:', err);
      }
    } else {
      const data = readLocal();
      existingEvents = data.events || [];
      existingTasks = data.tasks || [];
    }

    const keepEventIds = new Set();
    const keepTaskIds = new Set();

    for (const cal of calendars) {
      try {
        console.log(`Syncing calendar for ${cal.name}: ${cal.url}`);
        
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
            if (ev.start >= rangeStart && ev.start <= rangeEnd) {
              occurrences.push(ev);
            }
          }

          // Process occurrences
          for (const occ of occurrences) {
            const occStart = occ.start;
            let dateStr;
            if (occ.datetype === 'date') {
              dateStr = `${occStart.getUTCFullYear()}-${String(occStart.getUTCMonth() + 1).padStart(2, '0')}-${String(occStart.getUTCDate()).padStart(2, '0')}`;
            } else {
              const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Jerusalem',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              }).formatToParts(occStart);
              const y = parts.find(p => p.type === 'year').value;
              const m = parts.find(p => p.type === 'month').value;
              const d = parts.find(p => p.type === 'day').value;
              dateStr = `${y}-${m}-${d}`;
            }
            
            const resolvedAuthor = getEventOrganizerName(occ, cal.name);

            if (occ.datetype === 'date') {
              // All-day event
              let matched = existingEvents.find(e => e.date === dateStr && e.source === cal.id && areTitlesSimilar(e.title, occ.summary || 'אירוע'));
              if (!matched) {
                matched = existingEvents.find(e => e.date === dateStr && areTitlesSimilar(e.title, occ.summary || 'אירוע'));
              }

              if (matched) {
                keepEventIds.add(matched.id);
                if (resolvedAuthor === 'נדיה' && matched.author !== 'נדיה') {
                  await this.updateEventAuthor(dateStr, '', 'נדיה');
                  matched.author = 'נדיה';
                }
              } else {
                const newEv = await this.addEvent({
                  title: occ.summary || 'אירוע',
                  date: dateStr,
                  author: resolvedAuthor,
                  isTimed: false,
                  time: '',
                  source: cal.id
                });
                existingEvents.push(newEv);
                keepEventIds.add(newEv.id);
              }
            } else {
              // Timed event
              const tParts = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Jerusalem',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }).formatToParts(occStart);
              const hour = tParts.find(p => p.type === 'hour').value;
              const minute = tParts.find(p => p.type === 'minute').value;
              const hourStr = `${hour}:${minute}`;
              
              let matchedTask = existingTasks.find(t => t.date === dateStr && t.time === hourStr && t.source === cal.id && areTitlesSimilar(t.description, occ.summary || 'פעילות'));
              if (!matchedTask) {
                matchedTask = existingTasks.find(t => t.date === dateStr && t.time === hourStr && areTitlesSimilar(t.description, occ.summary || 'פעילות'));
              }

              let matchedEvent = existingEvents.find(e => e.date === dateStr && e.time === hourStr && e.source === cal.id && e.isTimed === true);
              if (!matchedEvent) {
                matchedEvent = existingEvents.find(e => e.date === dateStr && e.time === hourStr && e.isTimed === true && areTitlesSimilar(e.title, occ.summary || 'פעילות'));
              }

              if (matchedTask && matchedEvent) {
                keepTaskIds.add(matchedTask.id);
                keepEventIds.add(matchedEvent.id);
                if (resolvedAuthor === 'נדיה' && matchedTask.author !== 'נדיה') {
                  await this.updateTaskAuthor(matchedTask.id, 'נדיה');
                  await this.updateEventAuthor(dateStr, hourStr, 'נדיה');
                  matchedTask.author = 'נדיה';
                  matchedEvent.author = 'נדיה';
                }
              } else {
                let taskId = matchedTask ? matchedTask.id : null;
                if (!matchedTask) {
                  const newTask = await this.addTask({
                    description: occ.summary || 'פעילות',
                    date: dateStr,
                    time: hourStr,
                    author: resolvedAuthor,
                    source: cal.id
                  });
                  existingTasks.push(newTask);
                  taskId = newTask.id;
                }
                keepTaskIds.add(taskId);

                let eventId = matchedEvent ? matchedEvent.id : null;
                if (!matchedEvent) {
                  const shortSummary = await summarizeTitle(occ.summary || 'פעילות');
                  const newEv = await this.addEvent({
                    title: shortSummary,
                    date: dateStr,
                    author: resolvedAuthor,
                    isTimed: true,
                    time: hourStr,
                    source: cal.id
                  });
                  existingEvents.push(newEv);
                  eventId = newEv.id;
                }
                keepEventIds.add(eventId);
              }
            }
          }
        }
      } catch (err) {
        console.error(`Failed to sync calendar ${cal.name}:`, err.message);
      }
    }

    // 3. Delete stale events and tasks within the sync range
    if (firestore) {
      try {
        const batch = firestore.batch();
        let deleteCount = 0;
        
        existingEvents.forEach(e => {
          if (e.date >= startStr && e.date <= endStr && !keepEventIds.has(e.id)) {
            batch.delete(firestore.collection('events').doc(e.id));
            deleteCount++;
          }
        });

        existingTasks.forEach(t => {
          if (t.date >= startStr && t.date <= endStr && !keepTaskIds.has(t.id)) {
            batch.delete(firestore.collection('tasks').doc(t.id));
            deleteCount++;
          }
        });

        if (deleteCount > 0) {
          await batch.commit();
          console.log(`Deleted ${deleteCount} stale synced items from Firestore.`);
        }
      } catch (err) {
        console.error('Failed deleting stale sync items:', err);
      }
    } else {
      const data = readLocal();
      data.events = (data.events || []).filter(e => !(e.date >= startStr && e.date <= endStr && !keepEventIds.has(e.id)));
      data.tasks = (data.tasks || []).filter(t => !(t.date >= startStr && t.date <= endStr && !keepTaskIds.has(t.id)));
      writeLocal(data);
    }
    console.log('Smart sync completed successfully!');
  },
  isUsingFirestore() {
    return firestore !== null;
  },
  async deduplicateAll() {
    if (!firestore) return { success: true, count: 0 };
    try {
      const eventsSnap = await firestore.collection('events').get();
      const tasksSnap = await firestore.collection('tasks').get();
      
      const events = [];
      eventsSnap.forEach(doc => events.push({ id: doc.id, ...doc.data() }));
      const tasks = [];
      tasksSnap.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
      
      const batch = firestore.batch();
      let deleteCount = 0;
      
      // Deduplicate events
      const keptEvents = [];
      events.forEach(ev => {
        const dup = keptEvents.find(k => k.date === ev.date && k.time === ev.time && k.isTimed === ev.isTimed && areTitlesSimilar(k.title, ev.title));
        if (dup) {
          batch.delete(firestore.collection('events').doc(ev.id));
          deleteCount++;
          if (ev.author === 'נדיה' && dup.author !== 'נדיה') {
            batch.update(firestore.collection('events').doc(dup.id), { author: 'נדיה' });
            dup.author = 'נדיה';
          }
        } else {
          keptEvents.push(ev);
        }
      });
      
      // Deduplicate tasks
      const keptTasks = [];
      tasks.forEach(t => {
        const dup = keptTasks.find(k => k.date === t.date && k.time === t.time && areTitlesSimilar(k.description, t.description));
        if (dup) {
          batch.delete(firestore.collection('tasks').doc(t.id));
          deleteCount++;
          if (t.author === 'נדיה' && dup.author !== 'נדיה') {
            batch.update(firestore.collection('tasks').doc(dup.id), { author: 'נדיה' });
            dup.author = 'נדיה';
          }
        } else {
          keptTasks.push(t);
        }
      });
      
      if (deleteCount > 0) {
        await batch.commit();
        console.log(`Deduplicated: Deleted ${deleteCount} duplicate items from Firestore.`);
      }
      return { success: true, count: deleteCount };
    } catch (err) {
      console.error('Deduplicate failed:', err);
      throw err;
    }
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
    const prompt = `קצר את כותרת האירוע הבאה לעד 4 מילים משמעותיות בלבד בעברית (למשל "פגישת עבודה עם דני בנושא הפרויקט החדש" -> "פגישת עבודה עם דני", "שיעור פסנתר בקונסרבטוריון העירוני" -> "שיעור פסנתר בקונסרבטוריון"): "${title}"`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleanText = text.replace(/['"״`״]+/g, '');
    if (cleanText && cleanText.length > 0 && cleanText.length < 40) {
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
  
  const shortTitle = words.slice(0, 4).join(' ');
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
  
  if (!org) {
    let resolvedDefault = defaultName;
    if (resolvedDefault === 'אמא') resolvedDefault = 'נדיה';
    if (resolvedDefault === 'אבא') resolvedDefault = 'פיני';
    return resolvedDefault;
  }
  
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
  if (text.includes('michal') || text.includes('מיכל') || text.includes('nadia') || text.includes('נדיה') || text.includes('אמא')) return 'נדיה';
  if (text.includes('pini') || text.includes('פיני') || text.includes('אבא')) return 'פיני';
  if (text.includes('sahar') || text.includes('סהר')) return 'סהר';
  if (text.includes('sol') || text.includes('סול')) return 'סול';
  
  // Clean defaultName if it's the default raw name
  let resolvedDefault = defaultName;
  if (resolvedDefault === 'אמא') resolvedDefault = 'נדיה';
  if (resolvedDefault === 'אבא') resolvedDefault = 'פיני';
  return resolvedDefault;
}

function areTitlesSimilar(t1, t2) {
  if (!t1 || !t2) return false;
  const clean = (s) => s.toLowerCase().replace(/[\s\-_]/g, '');
  const c1 = clean(t1);
  const c2 = clean(t2);
  return c1 === c2 || c1.includes(c2) || c2.includes(c1);
}

async function findDuplicateEvent(dateStr, title) {
  if (firestore) {
    try {
      const snapshot = await firestore.collection('events')
        .where('date', '==', dateStr)
        .get();
      
      let duplicate = null;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (areTitlesSimilar(data.title, title)) {
          duplicate = { id: doc.id, ...data };
        }
      });
      return duplicate;
    } catch (err) {
      console.error('findDuplicateEvent error:', err);
      return null;
    }
  } else {
    const data = readLocal();
    const found = (data.events || []).find(e => e.date === dateStr && areTitlesSimilar(e.title, title));
    return found ? { id: found.id, ...found } : null;
  }
}

async function findDuplicateTask(dateStr, timeStr, desc) {
  if (firestore) {
    try {
      const snapshot = await firestore.collection('tasks')
        .where('date', '==', dateStr)
        .where('time', '==', timeStr)
        .get();
      
      let duplicate = null;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (areTitlesSimilar(data.description, desc)) {
          duplicate = { id: doc.id, ...data };
        }
      });
      return duplicate;
    } catch (err) {
      console.error('findDuplicateTask error:', err);
      return null;
    }
  } else {
    const data = readLocal();
    const found = (data.tasks || []).find(t => t.date === dateStr && t.time === timeStr && areTitlesSimilar(t.description, desc));
    return found ? { id: found.id, ...found } : null;
  }
}

module.exports = db;
