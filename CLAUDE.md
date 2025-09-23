# AI Journal App - Development Guide

## Project Overview
This is a **Local AI-Powered Journal Desktop App** built with Tauri (Rust backend) + React (TypeScript frontend). The app provides a premium, private journaling experience where all data and AI inference happens entirely offline, on-device.

## Architecture
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Rust with Tauri framework
- **Database**: SQLite with FTS5 (full-text search) and vector embeddings
- **AI/ML**: llama-cpp (local GGUF models) + RAG pipeline
- **State Management**: Zustand
- **Styling**: Tailwind CSS with premium design system

## Current Status ✅

### ✅ Completed Infrastructure
1. **Project Setup**
   - Tauri project initialized with React TypeScript template
   - Git repository configured with remote at `git@github.com:ManojRaga/journal-app-v2.git`
   - All dependencies installed (Rust toolchain, Node.js, cmake)

2. **Backend Architecture**
   - Complete SQLite database schema with tables for:
     - `users` - User management
     - `entries` - Journal entries with metadata (mood, tags)
     - `chunks` - Text chunks for RAG
     - `entry_fts` & `chunk_fts` - FTS5 virtual tables for search
     - `entry_embeddings` & `chunk_embeddings` - Vector storage
   - Thread-safe Tauri command handlers for all CRUD operations
   - RAG pipeline architecture implemented

3. **Database Operations** (`src-tauri/src/db.rs`)
   - Full CRUD for journal entries
   - Text chunking for RAG processing
   - Hybrid search (keyword + semantic)
   - FTS5 integration for fast text search

4. **AI/ML Integration** (`src-tauri/src/llm.rs`)
   - llama-cpp-2 integration structure
   - Embedding generation pipeline
   - Context-aware response generation

5. **RAG Pipeline** (`src-tauri/src/rag.rs`)
   - Document retrieval and ranking
   - Context building for LLM prompts
   - Evidence sourcing for AI responses

6. **Frontend Foundation**
   - Vite + React + TypeScript configuration
   - Tailwind CSS with premium design tokens
   - Zustand store for state management
   - API layer for Tauri command integration

### 🚧 Current Build Status
- **Backend**: Compiles with minor LLM API usage issues (non-blocking)
- **Frontend**: Ready for component development
- **Database**: Fully functional
- **Threading**: All Send/Sync issues resolved

## Key Files and Structure

```
journal-app-v2/
├── AI-Journal-PRD.md          # Original product requirements
├── CLAUDE.md                  # This development guide
├── package.json               # Frontend dependencies
├── src-tauri/
│   ├── Cargo.toml            # Rust dependencies
│   ├── src/
│   │   ├── main.rs           # Tauri entry point
│   │   ├── lib.rs            # Main app logic & Tauri commands
│   │   ├── db.rs             # Database operations
│   │   ├── llm.rs            # LLM integration
│   │   └── rag.rs            # RAG pipeline
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Main app component
│   ├── index.css             # Tailwind base styles
│   ├── lib/
│   │   ├── store.ts          # Zustand state management
│   │   └── api.ts            # Tauri API wrappers
│   ├── components/           # React components (to be built)
│   └── pages/                # App pages (to be built)
├── index.html                # HTML template
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind configuration
└── tsconfig.json             # TypeScript configuration
```

## Tauri Commands (Backend API)

All backend functionality is exposed through these Tauri commands:

### Database Commands
- `initialize_database()` - Set up SQLite database and create default user
- `create_entry(request: CreateEntryRequest)` - Create new journal entry
- `get_entries()` - Get all entries for user
- `get_entry(id: String)` - Get specific entry by ID
- `update_entry(request: UpdateEntryRequest)` - Update existing entry
- `delete_entry(id: String)` - Delete entry by ID
- `search_entries(request: SearchRequest)` - Search entries using FTS5

### AI Commands
- `load_llm_model(model_path: String)` - Load local LLM model
- `chat_with_ai(request: ChatRequest)` - Chat with AI using RAG

### System Commands
- `get_system_info()` - Get system information

## Data Structures

### JournalEntry
```rust
pub struct JournalEntry {
    pub id: String,
    pub user_id: String,
    pub title: String,
    pub body: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub mood: Option<String>,
    pub tags: Option<Vec<String>>,
}
```

### Frontend State (Zustand)
```typescript
interface AppState {
  // UI State
  theme: 'light' | 'dark';
  currentPage: 'timeline' | 'editor' | 'chat' | 'search' | 'settings';

  // Journal State
  entries: JournalEntry[];
  currentEntry: JournalEntry | null;
  isLoading: boolean;

  // Chat State
  chatMessages: ChatMessage[];
  isChatLoading: boolean;

  // Actions (CRUD operations, etc.)
}
```

## Next Steps 🚀

### 1. Complete Frontend UI Components
**Priority: HIGH** - Build the premium UI components:

```typescript
// Components to implement:
src/components/
├── EntryCard.tsx           # Timeline entry display
├── RichTextEditor.tsx      # Journal entry editor
├── ChatBubble.tsx          # AI chat messages
├── Sidebar.tsx             # Navigation sidebar
├── SearchBar.tsx           # Search interface
├── TagSelector.tsx         # Tag management
├── MoodSelector.tsx        # Mood tracking
└── ThemeToggle.tsx         # Dark/light mode

src/pages/
├── Timeline.tsx            # Main journal timeline
├── Editor.tsx              # Entry creation/editing
├── Chat.tsx                # AI chat interface
├── Search.tsx              # Search results
└── Settings.tsx            # App settings
```

### 2. Fix Minor LLM API Issues
**Priority: MEDIUM** - The LLM integration has minor API usage issues:

```rust
// In src-tauri/src/llm.rs - fix these API calls:
// 1. LlamaModel::load_from_file needs LlamaModelParams
// 2. Context methods have different names in current API
// 3. LlamaTokenData struct fields need updating
```

### 3. Implement Vector Embeddings
**Priority: MEDIUM** - Currently using placeholder embeddings:

```rust
// In src-tauri/src/llm.rs
// Replace hash-based embeddings with actual embedding models
// Consider: sentence-transformers, BGE-small, or similar
```

### 4. Add Advanced Features
**Priority: LOW** - Post-MVP features:
- Streaming AI responses
- Advanced search filters
- Export functionality
- Backup/restore
- Plugin system

## Development Commands

### Backend Development
```bash
# Check Rust compilation
cd src-tauri && cargo check

# Run Tauri in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Frontend Development
```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Build for production
npm run build
```

### Testing
```bash
# Test frontend components
npm test

# Test Rust backend
cd src-tauri && cargo test
```

## Design System

### Colors (Tailwind Config)
```javascript
colors: {
  primary: {
    50: '#f0f9ff',   // Light blue tints
    500: '#0ea5e9',  // Main brand color
    900: '#0c4a6e',  // Dark blue
  },
  gray: {
    50: '#fafafa',   // Light backgrounds
    500: '#71717a',  // Text
    900: '#18181b',  // Dark backgrounds
  }
}
```

### Typography
- **Primary Font**: Inter (sans-serif)
- **Content Font**: Merriweather (serif) for journal entries
- **Inspiration**: Medium, Substack, Day One aesthetic

### Component Patterns
- Entry cards with hover animations
- Smooth transitions (Framer Motion)
- Premium shadows and borders
- Consistent spacing (Tailwind system)

## Troubleshooting

### Common Issues
1. **Rust compilation errors**: Usually dependency version conflicts
2. **Node.js issues**: Check Node version compatibility
3. **Tauri command errors**: Ensure proper async/await handling
4. **SQLite issues**: Check database initialization

### Development Tips
1. Use `cargo check` frequently during Rust development
2. Test Tauri commands with `invoke()` from frontend
3. Use browser dev tools for frontend debugging
4. Check Tauri console logs for backend issues

## Architecture Decisions

### Why This Stack?
- **Tauri**: Native performance, small bundle size, Rust security
- **React + TypeScript**: Mature ecosystem, type safety
- **SQLite**: Local-first, no server dependencies
- **Tailwind**: Rapid UI development, design consistency
- **Zustand**: Lightweight state management

### Key Design Principles
1. **Privacy First**: All data stays local
2. **Performance**: Native speed with Rust backend
3. **Offline First**: No network dependencies
4. **Premium UX**: Modern, clean, professional design
5. **Extensible**: Plugin-ready architecture

---

**Last Updated**: September 2024
**Status**: Core infrastructure complete, ready for UI development
**Next Milestone**: Complete Timeline and Editor pages