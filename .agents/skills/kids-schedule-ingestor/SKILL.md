---
name: kids-schedule-ingestor
description: Ingests, parses, tags, and updates weekly school schedules and afternoon activities for kids into the Google Calendar and eInk dashboard.
---

# Kids Schedule Ingestor Skill

This skill is designed to take a weekly school schedule or afternoon activity schedule file (image, PDF, Excel, or text snippet) for each child (`סהר`, `סול`, etc.), extract the structured classes, format them with standardized kid tags (`[סהר]`, `[סול]`), and sync them into the dashboard database / Google Calendar.

## Workflow

### 1. Receive & Identify Input
- Identify which child the schedule belongs to (e.g. `סהר` or `סול`).
- Identify the target week or date range (e.g., Sunday through Thursday for Israel school week).

### 2. Extract & Format Schedule Items
Extract each class period or activity:
- **Kid Tag**: `סהר` or `סול`
- **Date**: `YYYY-MM-DD`
- **Start Time**: `HH:MM`
- **Subject / Activity Title**: e.g., `מתמטיקה`, `תנ"ך`, `חוג ג'ודו`
- **Category**: School Schedule (before 13:00) vs Afternoon Activity (13:00+ or titled `חוג`/`אימון`)

#### Standard Item Format:
```json
[
  {
    "kid": "סהר",
    "title": "מתמטיקה",
    "date": "2026-09-06",
    "time": "08:00"
  },
  {
    "kid": "סול",
    "title": "חוג קרמיקה",
    "date": "2026-09-06",
    "time": "17:30"
  }
]
```

### 3. Ingest into Database & Sync
Run the ingestion tool:
```bash
node scripts/ingest_schedule.js <path-to-json-file>
```
Or POST directly to the server endpoint `/api/events`:
```json
{
  "title": "[סהר] מתמטיקה",
  "date": "2026-09-06",
  "author": "סהר",
  "time": "08:00"
}
```

### 4. Verification
After ingestion, verify the ePaper preview image using:
```bash
node test_render_png.js
```
The board will display:
- **Right Column (RTL)**: Sahar's School Schedule (`סהר - מערכת שעות`)
- **Center Column**: Sol's School Schedule (`סול - מערכת שעות`)
- **Left Column**: Afternoon Activities (`חוגים ופעילויות אחה"צ`)
