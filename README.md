AI Journal v2
================

Private, local-first journaling app built with React + Tauri + SQLite. Entries are stored on-device with full-text search and a clean UI. Optional AI/RAG features will evolve over time.

Table of Contents
-----------------
- Features
- Tech Stack
- Getting Started
- Development
- Build & Package
- Project Structure
- Tauri Permissions
- Troubleshooting
- Roadmap

Features
--------
- Local SQLite database with FTS5 for full‑text search
- Clean journaling UI: Timeline, New Entry (Editor), Reader
- Tags and mood per entry
- Edit/Delete entries with contextual menu
- Auto-resizing editor textarea for single-page scrolling
- Dark/Light theme toggle (persisted)
- Tauri desktop app with on-device storage

Tech Stack
---------
- Frontend: React, TypeScript, Vite, Tailwind CSS, Zustand, Framer Motion
- Desktop: Tauri
- Database: SQLite via sqlx (Rust), FTS5 virtual tables

Getting Started
---------------
Prerequisites
- Node.js 18+
- Rust toolchain (cargo)
- Tauri prerequisites per your OS: see https://tauri.app/start/prerequisites

Install dependencies
```bash
npm install
```

Run the app (dev)
```bash
npm run tauri dev
```
This starts the Vite dev server and launches the Tauri shell.

Development
-----------
Key commands
```bash
npm run dev        # Frontend only
npm run tauri dev  # Full app in Tauri
npm run build      # Vite build for frontend
```

App initialization
- On first run, the app creates a SQLite DB at the Tauri app data directory and ensures tables/indexes exist.
- A default user is created automatically and its real UUID is stored in Tauri state; this ID is used for all entry operations.

Navigation
- Sidebar: Timeline, New Entry, Chat, Search, Settings
- Clicking a card on the Timeline opens the Reader page
- Use the three-dots menu on a card to Edit or Delete
- New Entry opens blank (we clear the current entry when routing to the editor)

Project Structure
-----------------
```
src/                     # React app
  components/            # Layout, Sidebar, EntryCard, etc.
  lib/                   # store (Zustand), api wrappers
  pages/                 # Timeline, Editor, Reader, Chat, Search, Settings
src-tauri/               # Tauri Rust backend
  src/
    lib.rs               # Commands, app state, routing
    db.rs                # SQLite schema and queries
    rag.rs, llm.rs       # RAG/LLM scaffolding (WIP)
```

Data Model (simplified)
-----------------------
- users(id, email, created_at)
- entries(id, user_id, title, body, created_at, updated_at, mood, tags)
- chunks (RAG text chunks) and FTS tables (entry_fts, chunk_fts)
- Foreign keys enforce `entries.user_id -> users.id`

Tauri Commands
--------------
- initialize_database: creates/opens DB and default user; stores user id in state
- create_entry, get_entries, get_entry, update_entry, delete_entry
- search_entries (uses FTS)
- chat_with_ai (mock for now)

Tauri Permissions
-----------------
If you add UI elements that use dialogs (e.g. confirm/message), update `src-tauri/capabilities/*.json` accordingly. This app avoids dialogs in normal flows to minimize permission prompts.

Build & Package
---------------
```bash
npm run tauri build
```
Outputs installer/binary in `src-tauri/target` for your platform.

Troubleshooting
---------------
- FOREIGN KEY constraint failed when saving
  - Ensure the backend uses the stored default user UUID (fixed in code). Consider deleting the old `journal.db` if created before this fix.
- Dialog permission errors
  - Avoid window.alert/confirm; use in-app UI. Remove debug alerts.
- Editor shows previous entry when opening New Entry
  - We explicitly clear `currentEntry` when navigating to the editor.

Roadmap
-------
- Proper RAG pipeline and embedding storage
- Rich text editor (markdown) and attachments
- Advanced search and filters
- Import/export

License
-------
MIT


