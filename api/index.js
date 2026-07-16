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
app.get('/api/diagnose', (req, res) => {
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
  const { title, date } = req.body;
  if (!title || !date) {
    return res.status(400).json({ error: 'Title and Date are required' });
  }
  try {
    const newEvent = await db.addEvent({ title, date });
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
  const { description, time, date } = req.body;
  if (!description || !time || !date) {
    return res.status(400).json({ error: 'Description, Time, and Date are required' });
  }
  try {
    const newTask = await db.addTask({ description, time, date });
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

// API: Render ePaper Screen PNG Image
app.get('/api/screen', async (req, res) => {
  try {
    // 1. Resolve date
    let reqDate = new Date();
    if (req.query.date) {
      reqDate = new Date(req.query.date);
    }
    const dateStr = reqDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const year = reqDate.getFullYear();
    const month = reqDate.getMonth() + 1;

    // 2. Fetch database data
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
