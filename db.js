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
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify({ events: [], tasks: [] }, null, 2));
  }
}

// Local File Helper Functions
function readLocal() {
  try {
    const data = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { events: [], tasks: [] };
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
    // event: { date ("YYYY-MM-DD"), title (Hebrew string) }
    if (firestore) {
      try {
        const docRef = await firestore.collection('events').add({
          title: event.title,
          date: event.date
        });
        return { id: docRef.id, ...event };
      } catch (err) {
        console.error('Firestore addEvent failed:', err);
        throw err;
      }
    } else {
      event.id = Math.random().toString(36).substring(2, 9);
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
      const tasks = data.tasks.filter(t => t.date === date);
      return tasks.sort((a, b) => a.time.localeCompare(b.time));
    }
  },

  async addTask(task) {
    // task: { date ("YYYY-MM-DD"), time ("HH:MM"), description (Hebrew string) }
    if (firestore) {
      try {
        const docRef = await firestore.collection('tasks').add({
          description: task.description,
          time: task.time,
          date: task.date
        });
        return { id: docRef.id, ...task };
      } catch (err) {
        console.error('Firestore addTask failed:', err);
        throw err;
      }
    } else {
      task.id = Math.random().toString(36).substring(2, 9);
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
  }
};

module.exports = db;
