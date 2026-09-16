# eInk Dashboard — Project Handover & System Architecture

This document provides a comprehensive technical overview and context snapshot of the **eInk Dashboard** project for seamless handover to Claude or any other developer/AI agent.

---

## 1. Project Overview

The **eInk Dashboard** is a smart household calendar & schedule display system powered by a 7.5" ePaper screen. It renders daily school schedules for the kids (**סהר** and **סול**), afternoon extracurricular activities, upcoming family events, weather forecasts, and holiday banners in Hebrew.

- **Live Web Dashboard:** [https://e-ink-pini.vercel.app](https://e-ink-pini.vercel.app)
- **Git Repository:** [https://github.com/PiniMatz/eInk.git](https://github.com/PiniMatz/eInk.git)
- **Primary Branch:** `main`
- **Timezone:** `Asia/Jerusalem` (IST / IDT)

---

## 2. Hardware Architecture & Firmware

- **Microcontroller:** Seeed Studio XIAO ESP32-C3
- **Display:** Waveshare 7.5" V2 ePaper Display (800x480 resolution, Black & White)
- **Firmware Framework:** ESPHome CLI via USB serial port (`COM7`)
- **Sleep Schedule:** 60-minute deep sleep interval (hourly refresh)
- **SPI Pinout Configuration:**
  - `CLK`: GPIO8
  - `MOSI`: GPIO10
  - `CS`: GPIO4
  - `DC`: GPIO5
  - `RST`: GPIO2

---

## 3. Software & Backend Architecture

### Tech Stack
- **Runtime:** Node.js Express
- **Cloud Hosting:** Vercel Serverless Functions (`@vercel/node`)
- **Database:** Google Cloud Firestore (Primary) + local `db.json` (Local fallback when offline)
- **Integrations:** Google Calendar API (`hugim.kid@gmail.com`), Google Docs 2D Matrix parser, Open-Meteo Weather API.

### File Structure & Responsibilities
- [server.js](file:///c:/Users/pini_/Documents/Private/Pini/AntiGravity/eInk/server.js): Local Express development server.
- [api/index.js](file:///c:/Users/pini_/Documents/Private/Pini/AntiGravity/eInk/api/index.js): Vercel Serverless Function entry point (`/api/screen`, `/api/events`, `/api/tasks`, `/api/calendars`).
- [renderer.js](file:///c:/Users/pini_/Documents/Private/Pini/AntiGravity/eInk/renderer.js): SVG & 1-bit BMP rendering engine:
  - `parseKidEvents()`: Filters and categorizes daily items into Sahar School, Sol School, and Afternoon Activities.
  - `generateSvg()`: Generates the 800x480 SVG layout.
  - `renderBmp()`: Converts SVG pixel buffer into 1-bit BMP binary format for the ePaper screen.
  - 2D Matrix table parser for Google Doc schedule imports (handles `rowspan` and `colspan`).
  - Holiday vector icon banner renderer (`renderNoSchoolBox`).
  - 2-row line-wrapping algorithm for long afternoon activity titles (`splitTextIntoLines`).
- [db.js](file:///c:/Users/pini_/Documents/Private/Pini/AntiGravity/eInk/db.js): Data access layer handling Firestore, local fallback (`db.json`), deduplication, tombstoning deleted UIDs, and Google iCal syncing.
- [google-calendar.js](file:///c:/Users/pini_/Documents/Private/Pini/AntiGravity/eInk/google-calendar.js): Direct Google Calendar API client for event creation and sync.
- [holidays.js](file:///c:/Users/pini_/Documents/Private/Pini/AntiGravity/eInk/holidays.js): Israeli Jewish holiday lookup system (e.g. Rosh Hashana, Yom Kippur, Sukkot, etc.).
- [weather.js](file:///c:/Users/pini_/Documents/Private/Pini/AntiGravity/eInk/weather.js): Weather forecast provider.
- [public/index.html](file:///c:/Users/pini_/Documents/Private/Pini/AntiGravity/eInk/public/index.html): Web control panel for managing calendar events, daily tasks, iCal links, and live 800x480 screen previews.
- [vercel.json](file:///c:/Users/pini_/Documents/Private/Pini/AntiGravity/eInk/vercel.json): Vercel routing, cron configuration (`0 */8 * * *`), and serverless bundle file inclusion rules.

---

## 4. Key Rules & Business Logic

### School Cutoffs & Afternoon Activity Classification
1. **Sahar (סהר):**
   - **School Cutoff:** `13:30` (810 minutes) on Sunday–Thursday, and `12:00` (720 minutes) on Friday.
   - Any class/activity at or after this cutoff is categorized under **`afternoonActivities`**.
2. **Sol (סול):**
   - **School Cutoff:** `15:00` (900 minutes).
3. **Basketball (`קט-סל`):**
   - Sahar's recurring basketball practice runs on **Mon & Thu at 14:00** and **Fri at 13:00**.
   - Displayed as `קט-סל` (shortened from `אימון קט-סל`).

### Holiday Banners & Vector Icons
- If an event title matches a holiday (e.g., `ראש השנה`, `יום כיפור`, `סוכות`), regular school class lists are suppressed for that day and replaced with a centered vector icon and text banner (e.g. `ראש השנה — אין לימודים`).

### Afternoon Activity 2-Row Line Wrapping
- Long afternoon activity titles (e.g. `14:30 [פיני] ביקור במרכז הארצי להצלת צבי ים`) automatically wrap onto 2 lines:
  - Line 1: `14:30 [פיני] ביקור במרכז הארצי`
  - Line 2: `להצלת צבי ים`
- Pre-existing bracket badges (`[פיני]`) in titles are cleaned to prevent double-badge output (`[פיני] [פיני]`).

### Fuzzy Deduplication Engine
- Event titles are normalized (lowercase, symbols/whitespace stripped).
- Similar titles on the same date/time are deduplicated.
- Conflicts prioritize explicit family member authors (`אמא`, `אבא`, `סהר`, `סול`, `פיני`) over generic fallbacks.

---

## 5. Recent Git Commits & Modifications

| Commit | Description |
| :--- | :--- |
| `HEAD` | **Weather line graph, battery percentage, and font legibility enhancement:** Replaced horizontal forecast bars with a 4-day temperature line graph (polyline with dots, temperatures, and dashed guides); replaced voltage with battery percentage level indicator (`XX%`); boosted Hebrew font readability using `font-weight: 600`, 11.5pt font size, and raised 1-bit BMP threshold to 150. |
| `fe25cb7` | **Upgrade UI to Option 3 (Household Weather Station & Family Agenda):** Redesigned the 800x480 screen into a 240px Left Weather Station (live temp, 4-day forecast bars, holiday countdown box, network status) and 530px Right Family Agenda (Today & Tomorrow stacked cards, 3 columns, inverted header tabs, no battery voltage). |
| `0d4d175` | **Fix choir event deduplication & restore tombstoned occurrences:** Normalized filler words (`חזרה`, `אימון`, `שיעור`) in `areTitlesSimilar` and cleared tombstoned UIDs for Sol's choir (`סול - מקהלה`) on Sundays and Wednesdays (17:45). |
| `767882f` | **Fix afternoon activity 2-row line splitting & strip duplicate kid badge:** Increased `maxChars` per line to 20 and cleaned leading `[Badge]` from titles. |
| `58fff16` | **Support 2-row layout for long afternoon activities text:** Added 2-line rendering support for long afternoon titles. |
| `0cada63` | **Update vercel.json:** Included all required backend files (`renderer.js`, `holidays.js`, `weather.js`, `db.js`, `google-calendar.js`) in Vercel Serverless Function bundle. |
| `d1b998f` | **Fix ReferenceError:** Resolved `titleLower` scope issue in `renderer.js`. |
| `a4f735d` | **Sahar threshold & Kat-sal update:** Set Sahar afternoon cutoff to 13:30, updated Kat-sal event titles, fixed holiday banner text centering. |

---

## 6. Verification & Endpoints

- **Live Screen Image (BMP for eInk hardware):**  
  `GET https://e-ink-pini.vercel.app/api/screen`
- **Live SVG Vector Preview:**  
  `GET https://e-ink-pini.vercel.app/api/screen?format=svg`
- **Diagnostic Endpoint:**  
  `GET https://e-ink-pini.vercel.app/api/diagnose`
- **Manual Sync Endpoint:**  
  `POST https://e-ink-pini.vercel.app/api/calendars/sync`
- **Deduplication Trigger Endpoint:**  
  `POST https://e-ink-pini.vercel.app/api/calendars/dedup`

---

## 7. Developer Notes & Guidelines

- **Timezone Safety:** Always use `Asia/Jerusalem` when formatting dates or calculating cutoff times.
- **Local Testing:** Run `node server.js` to test locally on `http://localhost:3000`.
- **Deploying Changes:** Push to `main` branch; Vercel automatically deploys within 30-60 seconds.
