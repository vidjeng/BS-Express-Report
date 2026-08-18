# BS Express - Daily Branch Work Report System

(BS Express Daily Branch Work Report System)

A lightweight, offline-first single-page web application for creating, previewing, exporting and archiving daily branch work reports that match the company’s official A4 report layout.

## Key Features

- Official A4-standard document layout (matches company template).
  - Official header (Kingdom of Cambodia, Khmer typography), company name, meta table (branch / date / reporter / position).
  - Three sections: Opening Shift, Daily Operation, Closing Shift.
  - Signatures & official stamp area and footer address.
- Interactive Smart Form Builder:
  - Branch selector with a list of provinces/major branches.
  - Quick tags for repeated phrases.
  - “Load sample data” to prefill example reports.
  - Client-side watermarking for uploaded photos (branch name, date, time, verification badge).
- Sharing & Export:
  - Telegram / Messenger friendly text format (emoji + headers).
  - Print / Save as PDF (A4 layout).
  - Export CSV / Excel that preserves Khmer characters.
  - JSON backup & restore of all reports stored locally.
- Branch analytics & history:
  - Dashboard with total reports, active branches, staff totals, and tracked issues.
  - Search & filter by branch and date.

## How to run

### Option 1 — Node.js (recommended for local testing)
1. From the repository root:
   - npm install   (optional if you add server dependencies)
   - node server.js
2. Open http://localhost:3000

### Option 2 — Static
- Open `index.html` directly in any modern browser (Chrome, Edge, Firefox, Safari). Most UI flows work, but some local-network convenience (LAN access) is easier when using the Node server.

## Project structure (important files)

- `index.html`
  - The single-page UI (Khmer default, English toggle via data-i18n attributes).
  - 5-step wizard: Branch info → Opening → Operations → Closing → Review & Export.
  - Live A4 preview that mirrors form data and is used for printing/exporting.
  - Photo upload inputs for opening & closing sections.
- `server.js`
  - Small ES module HTTP server that serves static files from the repository directory.
  - Prints both localhost and LAN IPv4 addresses at startup.
- `package.json`
  - Minimal metadata and start script: `\"start\": \"node server.js\"`.
- `css/`
  - `style.css`, `print.css` (A4 print styles and UI).
- `js/`
  - `app.js` — main client-side application logic (wizard, UI wiring, event handlers, preview updates).
  - `export-util.js` — export and sharing helpers (Telegram formatting, CSV export, print).
  - `storage.js` — localStorage-backed persistence, sample data, user management, import/export JSON.
  - `watermark.js` — client-side image watermarking using HTML5 Canvas.
- `assets/`
  - Logos and images referenced in the A4 template and UI.
- `manifest.json`
  - Web app manifest metadata for installability / PWA behavior.
- `Open-In-Chrome.bat`, `start.bat`, `start.ps1`
  - Helper scripts for quickly opening or launching the project on Windows.

## Source file details and responsibilities

### server.js
- Purpose: a tiny, dependency-free ES module HTTP server for local testing.
- Key behavior:
  - Resolves requested path relative to the repository directory, strips query strings.
  - Maps file extension → Content-Type using a MIME_TYPES table.
  - Reads files with `fs.readFile` and returns them with correct Content-Type.
  - Returns 404 for missing files, 500 for other FS errors.
  - `getLocalIPs()` enumerates `os.networkInterfaces()` and logs local IPv4 addresses so other devices on the LAN can access the server.
- Notes:
  - Uses `type: "module"` in `package.json` so `server.js` is run as an ES module.
  - Good for local testing; consider path normalization and streaming for production (see Implementation Notes).

### index.html
- Purpose: main SPA markup and A4 printable layout.
- Key elements:
  - Authentication gateway (login/register) and a "guest" continue button for demo/testing.
  - Top navigation with language and theme toggles.
  - Stepper/form wizard controlling five steps (branch info, opening, operations, closing, review).
  - Live preview area with A4 document layout (header, three sections, footer, signature block).
  - Buttons for saving, exporting (Telegram, Print, CSV/Excel), and viewing full A4 document.
- i18n:
  - HTML uses `data-i18n` attributes to allow dynamic label switching between Khmer and English.
- Photo uploads:
  - `<input type="file">` controls for opening & closing photos; client JS applies watermark and shows preview.

### js/app.js (main client app)
- Role (overview):
  - Orchestrates UI flow: wizard navigation, progress bar, form validation, live preview binding, handling of load-sample, reset, and save actions.
  - Binds DOM elements, reacts to input changes (updates preview fields), wires up export actions (calls ExportUtil), and delegates storage to Storage.
  - Handles user session (persisting current user in localStorage via Storage.setCurrentUser / getCurrentUser).
  - Coordinates photo uploads: reads selected files, calls `WatermarkUtil.addWatermark(file, meta)` to get a watermarked data URL, displays previews, and stores watermarked images in the report object.
- Large single file, packed with helper functions and UI view manipulations (controls the primary UX).

### js/export-util.js
- Purpose: central utilities to format & export report data.
- Main functions:
  - `formatForTelegram(report, lang)`
    - Returns a Markdown-like text block suitable for pasting into Telegram / Messenger groups.
    - Produces Khmer or English output with emojis and labeled sections.
  - `exportToCsv(reports)`
    - Converts an array of report objects to CSV.
    - Uses UTF-8 BOM (`\uFEFF`) so Excel opens Khmer correctly.
    - Escapes quotes and replaces newlines to keep CSV well-formed.
    - Triggers a browser download with a timestamped filename.
  - `printReport()`
    - Calls `window.print()` to invoke the browser print dialog for A4/PDF export.
- Implementation notes:
  - CSV headers include both Khmer field labels and the usual metadata fields (ID, branch, date, reporter, etc.)
  - The CSV download is generated client-side using Blob and object URLs.

### js/watermark.js
- Purpose: apply a consistent, attractive watermark badge onto uploaded photos using the HTML5 Canvas API.
- `addWatermark(file, meta): Promise<string>`
  - Reads the image file via FileReader → loads into Image.
  - Resizes image to a maximum dimension (maxDim = 1200) to bound memory and file size.
  - Draws the original photo to canvas and overlays a semi-transparent badge in the bottom-right containing:
    - Branch name (meta.branch or default),
    - Date and time (meta.date/meta.time or computed),
    - A short verified text (localized Khmer text plus an icon).
  - Uses `canvas.toDataURL('image/jpeg', 0.85)` to return a JPEG data URL.
- Visual styling:
  - Semi-opaque dark box, left accent stripe (orange), white & colored text; font sizes scale with image width.
- Notes:
  - Uses canvas.roundRect and other modern Canvas features (supported in modern browsers).
  - Returns base64 data URLs which are stored with the report (good for offline/portable reports).

### js/storage.js
- Purpose: client-side persistence and user/session management using localStorage.
- Keys used:
  - `STORAGE_KEY = 'bs_express_daily_reports'` — stores the report array as JSON.
  - `SETTINGS_KEY = 'bs_express_settings'` — app settings.
  - `bs_express_users` — local users and authentication demo.
  - `bs_express_session` — current logged-in session.
- Main features:
  - `INITIAL_REPORTS` and `SAMPLE_REPORT`: seeded demo data that matches the official A4 sample image and demonstrates multi-branch data.
  - `getReports()`, `saveReports(reports)`, `saveReport(report)`, `getReportById(id)`, `deleteReport(id)` — CRUD operations for reports.
  - `exportAllAsJson()` / `importFromJson(json)` — backup & restore workflow for portability.
- User management & auth:
  - `getUsers()`, `saveUsers()`, `findUserByUsername(username)`, `registerUser({...})`, `authenticateUser(username, password)`, `deleteUser(id)`, `updateUserPassword(username, newPassword)`.
  - Ensures one default `sys_admin` user is present.
  - `getCurrentUser()` / `setCurrentUser(user)` / `logout()` manage session data in localStorage.
- Branch list and roles:
  - `BRANCH_LIST` constant includes many branch names (Khmer), exposed as `window.BRANCH_LIST` for UI to populate selects.
  - `USER_ROLES` and `INITIAL_USERS` provide role metadata and a sample admin user.
- Notes:
  - Storage module seeds demo data if no data is present (convenient for first-run demos).
  - All persistence is localStorage-only (client-side). Import/export enables moving to another browser or backing up to files.

## Implementation notes & considerations

- Path resolution & server safety:
  - `server.js` works for simple local testing. For production or sharing publicly, add path normalization and guard against path traversal (ensure resolved paths stay inside the repository root).
  - Consider using streaming (`fs.createReadStream`) to serve large files efficiently and adding cache-control headers for static assets.
- MIME types:
  - `server.js` contains a common mapping; consider expanding it (woff2, webp, mp4, etc.) if you add those asset types.
- SPA routing:
  - The project is a static SPA; if you add client-side routing, the server should fall back unknown HTML routes to `index.html`.
- Data persistence:
  - Current persistence is localStorage + JSON export/import. For shared, multi-device persistence add a small server API and lightweight DB (SQLite or JSON file).
- Browser support:
  - The watermark and canvas features require modern browsers; if older browser support is required, add feature detection/fallbacks.

## Contributing & repository hygiene

- Add `.gitignore` entries for `node_modules`, build artifacts, OS files.
- Add `LICENSE` and `CONTRIBUTING.md` for open-source clarity.
- Add a short `CHANGELOG` and README badges (node version, license).
- If you add server-side dependencies later, document them and add an npm start script that runs the server via `package.json` (already contains a simple start script).

## Credits

© 2026 BS Express • Maintained by vidjeng
