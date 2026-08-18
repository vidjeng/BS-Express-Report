# BS Express - Daily Branch Work Report System

(BS Express Daily Branch Work Report System)

This repository contains a lightweight, offline-first web application for creating and exporting daily branch work reports that match the company's official A4 report format. The original README had Khmer content and a merge conflict marker; this file has been translated to English and expanded with details about the code and how the project is organized.

---

## Key Features

- Official A4-standard report layout (matches company image/template).
  - Official header: Kingdom of Cambodia text (Khmer header text included in the HTML template).
  - Company name: BS Express
  - Report meta table: branch, date, reporter name, position
  - Two reporting times per day (Opening and Closing), with dedicated sections for Opening Shift, Daily Operations, and Closing Shift
  - Signatures & official stamp area
  - Company address in footer

- Smart Form Builder (interactive web form)
  - Select from branches (25 provinces / major branches)
  - Quick tags for commonly used phrases
  - "Load sample data" button to prefill example branch data
  - Automatic watermarking of uploaded photos with branch name, time, and date (client-side)

- Sharing & Export
  - Telegram/Messenger friendly text formatting (emoji + header)
  - Print / Save as PDF: A4-ready layout
  - Export CSV / Excel
  - JSON Backup & Restore

- Branch analytics & history
  - Dashboard showing total reports, active branches, staff present count, and pending issues
  - Search & filter by branch and date

---

## How to run

There are two simple ways to run the app locally:

Option 1: Run with Node.js (recommended for local testing)

```bash
# from repository root
npm install   # (optional; project is a static app except for server.js)
node server.js
```

Then open your browser at: http://localhost:3000

Option 2: Open the static HTML directly

Double-click (or open) `index.html` in any modern browser (Chrome / Edge / Firefox / Safari). This works for most UI/testing flows but some features (like file serving from a small Node server or local network access) are easier with Option 1.

---

## Project structure and important files

- index.html
  - Main single-page application UI. Contains the full Khmer/English UI and the A4 document layout used for print/PDF export and the live preview.
  - Uses data attributes and JS to populate branch lists, quick tags, live preview values, and trigger export/save operations.

- server.js
  - Small Node HTTP server (ES module) that serves static files from the repository directory.
  - Listens on port 3000 by default (PORT environment variable supported) and prints both localhost and local-network (LAN) addresses for easy mobile access.
  - Basic content-type handling is implemented by the MIME_TYPES table and file extension lookup.
  - If a file is not found the server returns 404; other file system errors return 500 with the code.

- package.json
  - Minimal package metadata and a start script: `node server.js`.

- css/
  - CSS stylesheets for the app UI and print styles (A4 layout). Files are referenced from index.html as `css/style.css` and `css/print.css`.

- js/
  - JavaScript modules and scripts implementing the interactive behavior: form wizard, preview, file upload watermarking, saving/exporting data, and UI helpers.

- assets/
  - Static assets (images, logo, icons) used in the document header and UI.

- manifest.json
  - Web app manifest metadata for installable PWA-style behavior.

- Open-In-Chrome.bat / start.bat / start.ps1
  - Helper scripts for Windows PowerShell / batch environments to open the app in Chrome or start the server.

---

## Implementation notes (code-level details)

- server.js details
  - Uses modern ES modules (package.json contains "type": "module").
  - Uses the `http` module to create a simple HTTP server and `fs.readFile` to serve files. It resolves the requested path relative to the repository folder and strips query strings.
  - The server contains a minimal mapping of file extensions to MIME types (MIME_TYPES). If the extension is not known it falls back to `application/octet-stream`.
  - A helper `getLocalIPs()` enumerates the machine's network interfaces via `os.networkInterfaces()` and prints available IPv4 addresses so other devices on the LAN can reach the server.

- index.html details
  - Marked up in Khmer by default with translation toggles for English (UI supports both Khmer and English labels via data-i18n attributes).
  - Contains a 5-step wizard UI: branch info, opening shift, daily operations, closing shift, review & export.
  - Live A4 preview on the right updates as fields are modified in the form. The A4 layout is split into sections that match the official template.
  - Photo upload areas (opening & closing) accept multiple images and the client-side JS generates previews and applies a timestamp/branch watermark.
  - Export actions: Save report (persists to localStorage or JSON export), Telegram-format text modal, Print / Save as PDF using window.print, and CSV/Excel export utilities.

- Client-side storage & export
  - The app stores reports in browser storage (localStorage) and offers JSON backup & restore for portability.
  - CSV/Excel export is generated client-side by converting the report objects to CSV and triggering a download.

---

## Contributing

If you want to improve the project:

- Fixes, UI improvements, or translations are welcome.
- If you add Node-side features (e.g. persistent storage, API endpoints), consider adding a simple express server or an API folder and document the endpoints.
- Please keep A4 layout and Khmer typography intact when changing print styles.

---

## Notes and next steps

- This update removed the merge conflict markers and replaced the original Khmer README with an English translation plus technical details about the code and structure.
- If you'd like, I can further expand this README with:
  - A dependency list and code excerpts/examples (e.g., server.js annotated snippet)
  - Development notes for building a production-ready server (Express + SQLite / file DB)
  - Automated tests or CI workflow (GitHub Actions) for linting and previewing the build

---

© 2026 BS Express • Project maintained by vidjeng
