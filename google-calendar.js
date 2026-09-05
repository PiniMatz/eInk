const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

function getAuthClient() {
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

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: SCOPES
  });

  return auth;
}

/**
 * Creates an event in Google Calendar (e.g. hugim.kid@gmail.com).
 */
async function addGoogleCalendarEvent({ calendarId = 'hugim.kid@gmail.com', kid, title, date, time, durationMinutes = 45, description = '' }) {
  const auth = getAuthClient();
  await auth.authorize();
  const calendar = google.calendar({ version: 'v3', auth });

  const kidTag = kid ? `[${kid}] ` : '';
  const fullTitle = title.startsWith('[') ? title : `${kidTag}${title}`;

  let startDateTime;
  let endDateTime;

  if (time && time.includes(':')) {
    const [h, m] = time.split(':').map(Number);
    const start = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+03:00`);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    startDateTime = { dateTime: start.toISOString(), timeZone: 'Asia/Jerusalem' };
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
  const calendar = google.calendar({ version: 'v3', auth });

  await calendar.events.delete({
    calendarId,
    eventId
  });

  console.log(`Deleted Google Calendar event ID ${eventId}`);
  return { success: true };
}

/**
 * Lists upcoming events from Google Calendar.
 */
async function listGoogleCalendarEvents({ calendarId = 'hugim.kid@gmail.com', timeMin, timeMax }) {
  const auth = getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin || new Date().toISOString(),
    timeMax: timeMax,
    singleEvents: true,
    orderBy: 'startTime'
  });

  return response.data.items || [];
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
    patchBody.summary = summary;
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

module.exports = {
  addGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  listGoogleCalendarEvents,
  updateGoogleCalendarEvent
};
