const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Load environment variables for local development
require('dotenv').config();

const db = require('../db');
const { renderBmp } = require('../renderer');
const { getWeather } = require('../weather');

const app = express();
app.use(bodyParser.json());

// Serve static dashboard UI
app.get('/', (req, res) => {
  try {
    const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).send('Error loading control panel: ' + err.message);
  }
});

// Diagnostic API: Check font files and environment
app.get('/api/diagnose', async (req, res) => {
  try {
    const cwd = process.cwd();
    const dirname = __dirname;
    const fontsDir = path.join(cwd, 'fonts');
    
    let fontsDirExists = false;
    let fontsList = [];
    if (fs.existsSync(fontsDir)) {
      fontsDirExists = true;
      fontsList = fs.readdirSync(fontsDir);
    }

    const heeboBoldPath = path.join(cwd, 'fonts', 'Heebo-Bold.ttf');
    const notoBoldPath = path.join(cwd, 'fonts', 'NotoSansHebrew-Bold.ttf');

    const heeboExists = fs.existsSync(heeboBoldPath);
    const notoExists = fs.existsSync(notoBoldPath);

    let heeboSize = 0;
    if (heeboExists) {
      heeboSize = fs.statSync(heeboBoldPath).size;
    }

    let notoSize = 0;
    if (notoExists) {
      notoSize = fs.statSync(notoBoldPath).size;
    }

    let heeboBufferLength = 0;
    let heeboFirstBytes = "";
    let notoBufferLength = 0;
    const fontBuffers = [];
    if (heeboExists) {
      const buf = fs.readFileSync(heeboBoldPath);
      heeboBufferLength = buf.length;
      heeboFirstBytes = buf.subarray(0, 10).toString('hex');
      fontBuffers.push(buf);
    }
    if (notoExists) {
      const buf = fs.readFileSync(notoBoldPath);
      notoBufferLength = buf.length;
      fontBuffers.push(buf);
    }

    const familiesToTest = [
      'Heebo',
      'Heebo Regular',
      'Heebo-Regular',
      'Noto Sans Hebrew',
      'Noto Sans Hebrew Bold',
      'NotoSansHebrew-Bold',
      'sans-serif'
    ];

    const testResults = {};
    const { Resvg } = require('@resvg/resvg-js');

    for (const family of familiesToTest) {
      const testSvg = `
        <svg width="100" height="50" xmlns="http://www.w3.org/2000/svg">
          <text x="10" y="30" font-family="${family}" font-size="20" fill="black">Test</text>
        </svg>
      `;

      try {
        const fontFiles = [];
        if (heeboExists) fontFiles.push(heeboBoldPath);
        if (notoExists) fontFiles.push(notoBoldPath);

        const resvg = new Resvg(testSvg, {
          font: {
            fontFiles,
            defaultFontFamily: family,
            loadSystemFonts: false,
          },
          fitTo: { mode: 'width', value: 100 }
        });

        const pixels = resvg.render().pixels;
        let nonZeroPixels = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i+1];
          const b = pixels[i+2];
          const a = pixels[i+3];
          if (a > 0 && (r < 255 || g < 255 || b < 255)) {
            nonZeroPixels++;
          }
        }
        testResults[family] = nonZeroPixels;
      } catch (err) {
        testResults[family] = `Error: ${err.message}`;
      }
    }

    res.json({
      cwd,
      dirname,
      fontsDir,
      fontsDirExists,
      fontsList,
      heeboExists,
      heeboSize,
      heeboBufferLength,
      heeboFirstBytes,
      notoExists,
      notoSize,
      notoBufferLength,
      usingFirestore: db.isUsingFirestore(),
      firestoreConnectionTest: await (async () => {
        if (!db.isUsingFirestore()) return "Disabled";
        try {
          const promise = db.getCalendars();
          const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore query timed out after 3s")), 3000));
          await Promise.race([promise, timeout]);
          return "Connected successfully";
        } catch (err) {
          return `Failed: ${err.message}`;
        }
      })(),
      testResults
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});


// API: Get monthly events
app.get('/api/events', async (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const month = req.query.month || (new Date().getMonth() + 1);
  try {
    const events = await db.getEvents(year, month);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Add event
app.post('/api/events', async (req, res) => {
  const { title, date, author, time } = req.body;
  if (!title || !date) {
    return res.status(400).json({ error: 'Title and Date are required' });
  }
  try {
    const isTimed = !!time;
    const newEvent = await db.addEvent({ title, date, author, isTimed, time });
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Delete event
app.delete('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.deleteEvent(id);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get daily tasks
app.get('/api/tasks', async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const tasks = await db.getTasks(date);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Add daily task
app.post('/api/tasks', async (req, res) => {
  const { description, time, date, author } = req.body;
  if (!description || !time || !date) {
    return res.status(400).json({ error: 'Description, Time, and Date are required' });
  }
  try {
    const newTask = await db.addTask({ description, time, date, author });
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Delete daily task
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.deleteTask(id);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get connected calendars
app.get('/api/calendars', async (req, res) => {
  try {
    const calendars = await db.getCalendars();
    res.json(calendars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Connect a new calendar
app.post('/api/calendars', async (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'Name and URL are required' });
  }
  try {
    const newCal = await db.addCalendar({ name, url });
    // Trigger sync immediately in background
    db.syncCalendars().catch(err => console.error('Auto sync error:', err));
    res.status(201).json(newCal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Disconnect a calendar
app.delete('/api/calendars/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.deleteCalendar(id);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Trigger calendar sync manually
app.post('/api/calendars/sync', async (req, res) => {
  try {
    await db.syncCalendars();
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Clean database duplicates manually
app.post('/api/calendars/dedup', async (req, res) => {
  try {
    const result = await db.deduplicateAll();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Render ePaper Screen PNG Image
app.get('/api/screen', async (req, res) => {
  try {
    // 1. Trigger calendar sync in background (non-blocking)
    db.syncCalendars().catch(err => console.error('Auto-sync during screen render failed:', err));

    let dateStr;
    if (req.query.date) {
      dateStr = req.query.date;
    } else {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jerusalem',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date());
      const y = parts.find(p => p.type === 'year').value;
      const m = parts.find(p => p.type === 'month').value;
      const d = parts.find(p => p.type === 'day').value;
      dateStr = `${y}-${m}-${d}`;
    }
    const [year, month, day] = dateStr.split('-').map(Number);
    const reqDate = new Date(year, month - 1, day);

    // 3. Fetch database data
    const [events, tasks, weather] = await Promise.all([
      db.getEvents(year, month),
      db.getTasks(dateStr),
      getWeather(req.query.location)
    ]);

    // 3. Render dashboard
    if (req.query.format === 'svg') {
      const { generateSvg } = require('../renderer');
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.send(generateSvg({
        date: reqDate,
        events,
        tasks,
        weather
      }));
      return;
    }

    const bmpBuffer = renderBmp({
      date: reqDate,
      events,
      tasks,
      weather
    });

    // 4. Send image headers and buffer
    res.setHeader('Content-Type', 'image/bmp');
    // Ensure the ePaper doesn't cache stale images
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Expires', '-1');
    res.setHeader('Pragma', 'no-cache');
    res.send(bmpBuffer);

  } catch (err) {
    console.error('Error rendering ePaper image:', err);
    res.status(500).send('Failed to render ePaper image: ' + err.message);
  }
});

// For Vercel deployment: export Express application
module.exports = app;
