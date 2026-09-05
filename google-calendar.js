const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

let cachedAuth = null;

function getAuthClient() {
  if (cachedAuth) return cachedAuth;

  let credentials;
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    credentials = {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  } else {
    const keyPath = path.join(__dirname, 'Firebase_Key.json');
    if (fs.existsSync(keyPath)) {
      credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    }
  }

  if (!credentials) {
    throw new Error('Google Calendar Auth Credentials (Firebase_Key.json or env vars) not found.');
  }

  cachedAuth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: SCOPES
  });

  return cachedAuth;
}

function getJerusalemIsoString(dateStr, timeStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    timeZoneName: 'shortOffset'
  }).formatToParts(d);
  const tzPart = parts.find(p => p.type === 'timeZoneName');
  let offsetStr = '+03:00';
  if (tzPart && tzPart.value) {
    if (tzPart.value.includes('+2') || tzPart.value.includes('GMT+2')) offsetStr = '+02:00';
    if (tzPart.value.includes('+3') || tzPart.value.includes('GMT+3')) offsetStr = '+03:00';
  }
  return `${dateStr}T${timeStr}:00${offsetStr}`;
}

/**
 * Creates an event in Google Calendar (e.g. hugim.kid@gmail.com).
 */
async function addGoogleCalendarEvent({ calendarId = 'hugim.kid@gmail.com', kid, title, date, time, durationMinutes = 45, description = '' }) {
  const auth = getAuthClient();
  await auth.authorize();
  const calendar = google.calendar({ version: 'v3', auth });

  const cleanTitle = (title || '').replace(/[,:\s]+$/, '').trim();
  const kidTag = kid ? `[${kid}] ` : '';
  const fullTitle = cleanTitle.startsWith('[') ? cleanTitle : `${kidTag}${cleanTitle}`;

  let startDateTime;
  let endDateTime;

  if (time && time.includes(':')) {
    const [h, m] = time.split(':').map(Number);
    const formattedTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const startIso = getJerusalemIsoString(date, formattedTime);
    const start = new Date(startIso);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    startDateTime = { dateTime: startIso, timeZone: 'Asia/Jerusalem' };
    endDateTime = { dateTime: end.toISOString(), timeZone: 'Asia/Jerusalem' };
  } else {
    // All-day event
    startDateTime = { date };
    endDateTime = { date };
  }

  const eventResource = {
    summary: fullTitle,
    description: description || `Kid Schedule Item for ${kid || 'Family'}`,
    start: startDateTime,
    end: endDateTime
  };

  // Idempotency check: query existing events on the target date to avoid inserting duplicates
  try {
    const existing = await calendar.events.list({
      calendarId,
      timeMin: `${date}T00:00:00Z`,
      timeMax: `${date}T23:59:59Z`,
      singleEvents: true
    });
    const items = existing.data ? (existing.data.items || []) : [];
    const targetMs = new Date(startDateTime.dateTime || `${startDateTime.date}T00:00:00Z`).getTime();
    const duplicate = items.find(e => {
      const cleanSummary = (e.summary || '').replace(/[,:\s]+$/, '').trim();
      if (cleanSummary !== fullTitle || !e.start) return false;
      const evMs = new Date(e.start.dateTime || `${e.start.date}T00:00:00Z`).getTime();
      return Math.abs(evMs - targetMs) < 60000;
    });
    if (duplicate) {
      console.log(`Skipping existing Google Calendar event "${fullTitle}" (ID: ${duplicate.id})`);
      return duplicate;
    }
  } catch (checkErr) {
    // ignore query failure and fall through to insert
  }

  const response = await calendar.events.insert({
    calendarId,
    requestBody: eventResource
  });

  console.log(`Created Google Calendar event "${fullTitle}" (ID: ${response.data.id})`);
  return response.data;
}

/**
 * Deletes an event from Google Calendar by ID.
 */
async function deleteGoogleCalendarEvent({ calendarId = 'hugim.kid@gmail.com', eventId }) {
  const auth = getAuthClient();
  await auth.authorize();
  const calendar = google.calendar({ version: 'v3', auth });

  let retries = 5;
  let delay = 2000;
  while (retries > 0) {
    try {
      await calendar.events.delete({
        calendarId,
        eventId
      });
      break;
    } catch (err) {
      retries--;
      if (retries === 0) throw err;
      console.warn(`Delete failed for event ID ${eventId} (${err.message}). Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }

  console.log(`Deleted Google Calendar event ID ${eventId}`);
  return { success: true };
}

/**
 * Lists upcoming events from Google Calendar with retry handling.
 */
async function listGoogleCalendarEvents({ calendarId = 'hugim.kid@gmail.com', timeMin, timeMax } = {}) {
  const auth = getAuthClient();
  await auth.authorize();
  const calendar = google.calendar({ version: 'v3', auth });

  let allItems = [];
  let pageToken = null;

  do {
    const params = {
      calendarId,
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250
    };
    if (pageToken) params.pageToken = pageToken;

    let retries = 5;
    let delay = 2000;
    let response;
    while (retries > 0) {
      try {
        response = await calendar.events.list(params);
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        console.warn(`listGoogleCalendarEvents quota limit (${err.message}). Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }

    const items = response.data.items || [];
    allItems = allItems.concat(items);
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return allItems;
}

async function updateGoogleCalendarEvent({ calendarId = 'hugim.kid@gmail.com', eventId, summary }) {
  const auth = getAuthClient();
  await auth.authorize();
  const calendar = google.calendar({ version: 'v3', auth });

  let eventData;
  try {
    const getRes = await calendar.events.get({ calendarId, eventId });
    eventData = getRes.data;
  } catch (err) {
    console.error(`Failed to fetch event ${eventId}:`, err.message);
  }

  const patchBody = {};
  if (summary) {
    patchBody.summary = summary.replace(/[,:\s]+$/, '').trim();
  }

  if (eventData && eventData.attendees && eventData.attendees.length > 0) {
    const attendees = eventData.attendees.map(att => {
      if (att.self || att.email === calendarId) {
        return { ...att, responseStatus: 'accepted' };
      }
      return att;
    });
    patchBody.attendees = attendees;
  } else {
    patchBody.attendees = [{ email: calendarId, responseStatus: 'accepted' }];
  }

  let retries = 3;
  let response;
  while (retries > 0) {
    try {
      response = await calendar.events.patch({
        calendarId,
        eventId,
        requestBody: patchBody
      });
      break;
    } catch (err) {
      retries--;
      if (retries === 0) throw err;
      console.warn(`Patch failed for event ${eventId} (${err.message}). Retrying in 1.5s...`);
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  console.log(`Updated & Auto-Accepted Google Calendar event ID ${eventId} -> "${summary || 'accepted'}"`);
  return response.data;
}

/**
 * Bulk patches events in Google Calendar with rate-limiting and concurrency control.
 */
async function bulkPatchGoogleCalendarEvents(patchItems, concurrency = 1) {
  const auth = getAuthClient();
  await auth.authorize();
  const calendar = google.calendar({ version: 'v3', auth });

  const results = [];
  for (let i = 0; i < patchItems.length; i += concurrency) {
    const chunk = patchItems.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(async (item) => {
      const { calendarId = 'hugim.kid@gmail.com', eventId, summary, start, end } = item;
      const patchBody = {};
      if (summary) {
        patchBody.summary = summary.replace(/[,:\s]+$/, '').trim();
      }
      if (start) patchBody.start = start;
      if (end) patchBody.end = end;

      let retries = 5;
      let delay = 2000;
      while (retries > 0) {
        try {
          const res = await calendar.events.patch({
            calendarId,
            eventId,
            requestBody: patchBody
          });
          return res.data;
        } catch (err) {
          retries--;
          if (retries === 0) {
            console.error(`Bulk patch failed for event ${eventId}:`, err.message);
            return null;
          }
          console.warn(`Patch rate limited for event ${eventId} (${err.message}). Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
        }
      }
    }));
    results.push(...chunkResults);
    await new Promise(r => setTimeout(r, 350));
  }
  return results.filter(Boolean);
}

module.exports = {
  addGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  listGoogleCalendarEvents,
  updateGoogleCalendarEvent,
  bulkPatchGoogleCalendarEvents,
  getJerusalemIsoString
};
