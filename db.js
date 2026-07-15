const fs = require('fs');
const path = require('path');
const { createClient } = require('@vercel/kv');

// Local fallback database file
const LOCAL_DB_PATH = path.join(__dirname, 'db.json');

// Initialize Vercel KV client if environment variables are set
let kvClient = null;
if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  try {
    kvClient = createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    console.log('Database: Using Vercel KV (Cloud Redis)');
  } catch (err) {
    console.error('Failed to initialize Vercel KV client:', err.message);
  }
}

if (!kvClient) {
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
    const prefix = `${year}-${monthStr}`;

    if (kvClient) {
      try {
        const events = await kvClient.get(`epaper:events:${prefix}`) || [];
        return events;
      } catch (err) {
        console.error('KV getEvents failed:', err);
        return [];
      }
    } else {
      const data = readLocal();
      return data.events.filter(e => e.date.startsWith(prefix));
    }
  },

  async addEvent(event) {
    // event: { id, date ("YYYY-MM-DD"), title (Hebrew string) }
    event.id = event.id || Math.random().toString(36).substring(2, 9);
    
    if (kvClient) {
      try {
        const prefix = event.date.substring(0, 7); // "YYYY-MM"
        const key = `epaper:events:${prefix}`;
        const events = await kvClient.get(key) || [];
        events.push(event);
        await kvClient.set(key, events);
        return event;
      } catch (err) {
        console.error('KV addEvent failed:', err);
        throw err;
      }
    } else {
      const data = readLocal();
      data.events.push(event);
      writeLocal(data);
      return event;
    }
  },

  async deleteEvent(id, date) {
    if (kvClient) {
      try {
        const prefix = date.substring(0, 7); // "YYYY-MM"
        const key = `epaper:events:${prefix}`;
        let events = await kvClient.get(key) || [];
        events = events.filter(e => e.id !== id);
        await kvClient.set(key, events);
      } catch (err) {
        console.error('KV deleteEvent failed:', err);
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
    if (kvClient) {
      try {
        const tasks = await kvClient.get(`epaper:tasks:${date}`) || [];
        // Sort tasks by time
        return tasks.sort((a, b) => a.time.localeCompare(b.time));
      } catch (err) {
        console.error('KV getTasks failed:', err);
        return [];
      }
    } else {
      const data = readLocal();
      const tasks = data.tasks.filter(t => t.date === date);
      return tasks.sort((a, b) => a.time.localeCompare(b.time));
    }
  },

  async addTask(task) {
    // task: { id, date ("YYYY-MM-DD"), time ("HH:MM"), description (Hebrew string) }
    task.id = task.id || Math.random().toString(36).substring(2, 9);

    if (kvClient) {
      try {
        const key = `epaper:tasks:${task.date}`;
        const tasks = await kvClient.get(key) || [];
        tasks.push(task);
        await kvClient.set(key, tasks);
        return task;
      } catch (err) {
        console.error('KV addTask failed:', err);
        throw err;
      }
    } else {
      const data = readLocal();
      data.tasks.push(task);
      writeLocal(data);
      return task;
    }
  },

  async deleteTask(id, date) {
    if (kvClient) {
      try {
        const key = `epaper:tasks:${date}`;
        let tasks = await kvClient.get(key) || [];
        tasks = tasks.filter(t => t.id !== id);
        await kvClient.set(key, tasks);
      } catch (err) {
        console.error('KV deleteTask failed:', err);
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
