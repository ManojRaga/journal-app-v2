# Journal App Python RAG Service

This is the Python-based RAG (Retrieval Augmented Generation) service for the Journal App, providing AI-powered analysis of journal entries.

## Architecture

```
┌─────────────────┐    HTTP/WebSocket    ┌─────────────────┐
│   Tauri App     │ ◄─────────────────► │  Python Service │
│   (Frontend)    │                     │  (FastAPI)      │
└─────────────────┘                     └─────────────────┘
         │                                       │
         │                                       │ SQLite
         │                               ┌─────────────────┐
         │                               │   Database      │
         │                               │   (Shared)      │
         └───────────────────────────────┘
```

## Features

- **FastAPI REST API** for communication with Tauri frontend
- **SQLite Integration** - Reads from the same database as the Tauri app
- **Smart RAG Responses** - Analyzes journal entries to provide contextual answers
- **Topic Analysis** - Identifies patterns, themes, and moods in journal entries
- **Conversation Persistence** - Stores chat history in SQLite

## Setup

1. **Install Python 3.8+**
2. **Run setup script:**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Start the service:**
   ```bash
   source venv/bin/activate
   python main.py
   ```

4. **Service will be available at:** `http://127.0.0.1:8000`
5. **API Documentation:** `http://127.0.0.1:8000/docs`

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Journal Entries
- `GET /entries/{user_id}` - Get all journal entries for a user

### AI Chat
- `POST /chat` - Chat with AI using RAG
  ```json
  {
    "user_id": "user-uuid",
    "message": "What topics do I write about most?",
    "conversation_id": "optional-conversation-id"
  }
  ```

## Response Format

```json
{
  "answer": "Based on analyzing your 10 journal entries...",
  "sources": [],
  "conversation_id": "default"
}
```

## Development

The service uses a simplified approach without LangChain initially, focusing on:
- Direct SQLite access
- Simple keyword analysis
- Pattern recognition in journal content
- Contextual responses based on entry analysis

## Future Enhancements

- **LangChain Integration** - Full RAG pipeline with embeddings
- **Vector Search** - Semantic similarity search using ChromaDB
- **LLM Integration** - OpenAI API or local model support
- **Streaming Responses** - Real-time response streaming
- **Advanced Analytics** - Sentiment analysis, trend detection

## Integration with Tauri

The Tauri backend communicates with this service via HTTP requests:
- `chat_with_ai` command forwards requests to Python service
- Responses are stored in SQLite for conversation persistence
- Error handling for service unavailability
