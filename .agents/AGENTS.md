# Project Learnings and Setup Memory

## Hardware Setup
- **Microcontroller:** Seeed Studio XIAO ESP32-C3
- **ePaper Screen:** Waveshare 7.5" V2 (800x480 resolution, Black & White)
- **Upload Tool:** ESPHome CLI via USB serial port (COM7)
- **Pinout (SPI):**
  - CLK: GPIO8
  - MOSI: GPIO10
  - CS: GPIO4
  - DC: GPIO5
  - RST: GPIO2

## Software Setup
- **Firmware Framework:** ESPHome with ESP-IDF
- **Back-end Server:** Node.js Express hosted on Vercel (`https://e-ink-pini.vercel.app`)
- **Database:** Google Cloud Firestore (Primary) & local `db.json` (Local fallback)
- **Timezone:** `Asia/Jerusalem` (Israel Standard Time / Israel Daylight Time)
- **Fuzzy Deduplication:**
  - Event titles are normalized (lowercase, symbols/whitespace stripped).
  - Similar titles on the same date/time are treated as duplicates.
  - Conflicts prioritize the family member author (e.g. `נדיה` overrides generic names/fallbacks).
