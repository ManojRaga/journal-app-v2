# **Product Requirements Document (PRD)**

**Product:** Local AI-Powered Journal Desktop App  
 **Platform:** Desktop (macOS, Windows, Linux)  
 **Framework:** Tauri (Rust core \+ React frontend)  
 **Database:** SQLite (with sqlite-vec \+ FTS5 for hybrid RAG)  
 **LLM Runtime:** llama.cpp (local GGUF models)  
 **Version:** MVP

## **1\. Goal / Vision**

Create a **premium, private journaling application** where all data and AI inference happens **entirely offline**, on-device. Users can:  
Write daily journal entries (rich text editor).

Save and retrieve entries.

Ask natural-language questions and converse with an AI assistant.

AI leverages **RAG (Retrieval-Augmented Generation)** to ground responses in past entries.

Experience a **modern, premium UI** (inspired by Medium, Substack, Day One).

Privacy, performance, and elegant UX are first-class requirements.

## **2\. Scope (MVP)**

**Journaling Core**

Add/edit/delete journal entries.

Rich-text editor (basic formatting: bold, italic, headings, bullet lists).

Tagging & mood metadata.

Automatic timestamp.

**Search & Retrieval**

Search past entries (keyword via FTS5).

Retrieve similar entries via embeddings (sqlite-vec).

**AI Assistant**

Local LLM (e.g., Mistral-7B or Llama 3 8B in GGUF).

Local embedding model (BGE-small or MiniLM GGUF).

RAG pipeline: chunk → embed → store in DB → retrieve top-k snippets → build prompt → local LLM generates response.

Chat UI with streaming responses.

**System**

Offline-first: no network calls.

SQLite storage.

GPU offload if available (Metal/CUDA/Vulkan).

**UI/UX**

Sleek, minimal, premium design.

Dark/light mode.

Smooth animations (Framer Motion if applicable).

Timeline view of entries.

Evidence view for AI responses (show which snippets were used).

## **3\. Non-Goals (Future / Post-MVP)**

Cloud sync or multi-device sync.

Collaboration / shared journals.

Advanced templates (gratitude journaling, CBT, etc.).

Mobile apps.

Voice input / transcription.

## **4\. Technical Architecture**

**Frontend (React in Tauri WebView)**  
Pages:

**Editor Page**: Write/edit entries.

**Timeline/Library Page**: List of past entries.

**Chat Page**: Talk with AI assistant.

State management: Zustand or Redux.

Styling: Tailwind \+ custom premium components.

Component system: Cards, timeline, tags, modal dialogs.

**Backend (Rust in Tauri)**  
Modules:

[db.rs](http://db.rs/) → SQLite schema \+ ops (entries, chunks, embeddings).

[llm.rs](http://llm.rs/) → llama.cpp bindings (chat \+ embeddings).

[rag.rs](http://rag.rs/) → retrieval pipeline, prompt construction.

[main.rs](http://main.rs/) → Tauri setup \+ command handlers.

**Database Schema**  
users(id, email, created\_at)

entries(  
  id INTEGER PRIMARY KEY,  
  user\_id TEXT,  
  title TEXT,  
  body TEXT,  
  created\_at TEXT,  
  mood TEXT,  
  tags TEXT  
)

chunks(  
  id INTEGER PRIMARY KEY,  
  entry\_id INTEGER,  
  user\_id TEXT,  
  chunk\_index INTEGER,  
  text TEXT,  
  created\_at TEXT  
)

entry\_fts (FTS5: body)  
chunk\_fts (FTS5: text)  
entry\_vec (sqlite-vec: embedding)  
chunk\_vec (sqlite-vec: embedding)

**RAG Flow**  
On save → chunk entry → embed chunks → insert into chunk\_vec \+ chunk\_fts.

On query → embed query → hybrid retrieve (vec \+ FTS) → rerank (semantic \+ recency).

Build prompt with dated snippets.

Stream answer back to UI.

## **5\. Functional Requirements**

**Journaling**  
**FR1**: Users can create/edit/delete entries.

**FR2**: Entries auto-timestamped.

**FR3**: Entries stored in SQLite.

**FR4**: Rich-text editing supported.

**Search**  
**FR5**: Keyword search via FTS5.

**FR6**: Semantic search via embeddings.

**AI Assistant**  
**FR7**: Local embedding generation for queries/entries.

**FR8**: Hybrid retrieval (semantic \+ keyword).

**FR9**: Prompt building with context.

**FR10**: Local LLM answers streamed back.

**FR11**: Evidence snippets displayed in UI.

**System**  
**FR12**: All operations fully offline.

**FR13**: SQLite as single data store.

**FR14**: Tauri permissions minimal (fs, dialog).

## **6\. Non-Functional Requirements**

**Performance**: Response \<3s for small queries on CPU; \<1s with GPU offload.

**Security**: All journal text stored locally; no logging raw content.

**UX Quality**: Modern, clean design; no clutter.

**Portability**: Single installer \<200MB.

## **7\. UX & UI Principles**

**Minimalist Premium**: Typography-focused (like Medium).

**Consistency**: Light/dark theme switch.

**Affordance**: Clear entry points (New Entry, Chat, Search).

**Feedback**: Subtle animations (button hover, typing indicator).

**Evidence Transparency**: Display cited snippets in chat.

## **8\. Risks & Mitigations**

**Risk**: LLM binding doesn’t expose embeddings → **Mitigation**: Use sidecar (Ollama for embeddings only).

**Risk**: Large models too heavy → **Mitigation**: Default to 3B–7B quantized GGUF models.

**Risk**: UI feels sluggish → **Mitigation**: Optimize Tauri event streaming, lazy load entries.

## **9\. Starting Blueprint Code**

The following code (from our earlier blueprint) is a reference starting point for implementing the core Rust modules and Tauri commands:

## // [rag.rs](http://rag.rs/) (retriever)

## pub fn build\_prompt(question: \&str, ctx: &\[RetrievedDoc\]) \-\> String {

##   let ctx\_txt \= ctx.iter().map(|d| format\!("• \[{}\] {}", d.date, d.text)).collect::\<Vec\<\_\>\>().join("\\n\\n");

##   format\!("System: You are a reflective journal coach. Cite dates.\\n\\nUser: {}\\n\\nContext:\\n{}\\n\\nAssistant:", question, ctx\_txt)

## }

## // [main.rs](http://main.rs/)

## \#\[tauri::command\]

## async fn embed\_chunks(texts: Vec\<String\>, user\_id: String) \-\> Result\<Vec\<usize\>, String\> { /\* ... \*/ }

## \#\[tauri::command\]

## async fn search(user\_id: String, query: String) \-\> Result\<Vec\<String\>, String\> { /\* ... \*/ }

## \#\[tauri::command\]

## async fn chat(user\_id: String, question: String) \-\> Result\<(), String\> { /\* ... \*/ }

## **10\. Deliverables (MVP)**

Desktop app installers for macOS, Windows, Linux.

Core features: journaling CRUD, search, AI chat.

SQLite DB with entries \+ embeddings.

LLM running locally via llama.cpp.

Premium, modern UI with dark/light modes.

## **11\. Success Criteria**

User can write 10+ entries, search them, and query the AI.

AI cites past entries with dates in responses.

App feels sleek, modern, and trustworthy.

All data & inference remain fully local.

## **12\) Frontend Architecture with Vite & Tailwind**

**Stack**  
**React 18 \+ Vite** for fast local dev and optimized bundles.

**Tailwind CSS** for modern, sleek design.

**shadcn/ui** for premium components.

**Framer Motion** for animations.

**Zustand** for global state management.

**TanStack Router** for routing between Timeline, Editor, Chat, Search, and Settings.

**File Structure**  
src/  
  pages/  
    Timeline.tsx  
    Editor.tsx  
    Chat.tsx  
    Search.tsx  
    Settings.tsx  
  components/  
    EntryCard.tsx  
    ChatBubble.tsx  
    Sidebar.tsx  
  lib/  
    [api.ts](http://api.ts/)   \# wrappers for Tauri invokes  
    [store.ts](http://store.ts/) \# Zustand store  
  index.css \# Tailwind base

**Dev Workflow**  
Run Vite dev server and Tauri simultaneously: npm run tauri dev.

Tailwind styles applied globally via index.css.

Components styled with Tailwind classes and enhanced with shadcn/ui.

Animations applied using Framer Motion for smooth premium polish.

**Notes**  
**Cross-platform**: macOS & Windows.

**Shortcuts**: macOS (⌘), Windows (Ctrl).

**Accessibility**: focus rings, reduced motion support, high contrast theme.

**Performance**: Vite’s HMR for fast dev reloads, optimized production builds.