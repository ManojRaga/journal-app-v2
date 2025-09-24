"""
Journal App RAG Service - LangChain + Ollama Implementation
Python FastAPI service for AI-powered journal analysis using LangChain and Ollama
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sqlite3
import json
import os
import shutil
from datetime import datetime
import logging

# LangChain imports
from langchain_ollama import OllamaLLM
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.schema import Document

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Journal RAG Service", version="1.0.0")

# CORS middleware for Tauri frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for RAG components
llm = None
vectorstore = None
embeddings = None
qa_chain = None
PERSIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "chroma_db"))
COLLECTION_NAME = "journal_entries"

# Pydantic models
class JournalEntry(BaseModel):
    id: str
    user_id: str
    title: str
    body: str
    created_at: str
    updated_at: str
    mood: Optional[str] = None
    tags: Optional[List[str]] = None

class ChatRequest(BaseModel):
    user_id: str
    message: str
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    conversation_id: str

def get_database_path() -> str:
    torch_app_path = os.path.expanduser(
        "~/Library/Application Support/com.tauri.dev/journal.db"
    )
    if os.path.exists(torch_app_path):
        return torch_app_path

    legacy_path = os.path.join(os.path.dirname(__file__), "..", "src-tauri", "journal.db")
    resolved = os.path.abspath(legacy_path)
    if os.path.exists(resolved):
        return resolved

    return "./journal.db"

def get_db_connection():
    """Get SQLite database connection"""
    db_path = get_database_path()
    return sqlite3.connect(db_path)

def init_rag_components():
    """Initialize LangChain RAG components"""
    global llm, embeddings
    
    try:
        logger.info("Initializing RAG components...")
        
        llm = OllamaLLM(model="llama3.1:8b", base_url="http://localhost:11434")
        logger.info("✅ Ollama LLM initialized")
        
        embeddings = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")
        logger.info("✅ Embeddings initialized")
        
    except Exception as e:
        logger.error(f"❌ Error initializing RAG components: {e}")
        raise

def load_journal_entries_to_vectorstore():
    """Load journal entries from SQLite and add to vector store"""
    global vectorstore, embeddings
    
    try:
        logger.info("Loading journal entries into vector store...")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all journal entries
        cursor.execute("""
            SELECT id, user_id, title, body, created_at, updated_at, mood, tags
            FROM entries 
            ORDER BY created_at DESC
        """)
        
        entries = cursor.fetchall()
        conn.close()
        
        if not entries:
            logger.info("📝 No journal entries found")
            return
        
        # Convert to documents
        documents = []
        for entry in entries:
            entry_id, user_id, title, body, created_at, updated_at, mood, tags = entry
            tags_list = json.loads(tags) if tags else []

            doc_text = f"Title: {title}\nDate: {created_at}\nContent: {body}"
            if mood:
                doc_text += f"\nMood: {mood}"
            if tags_list:
                doc_text += f"\nTags: {', '.join(tags_list)}"

            metadata = {
                "id": entry_id,
                "user_id": user_id,
                "title": title,
                "created_at": created_at,
            }
            if updated_at:
                metadata["updated_at"] = updated_at
            if mood:
                metadata["mood"] = mood
            if tags_list:
                metadata["tags"] = ", ".join(tags_list)

            doc = Document(page_content=doc_text, metadata=metadata)
            documents.append(doc)
        
        # Split documents
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        split_docs = text_splitter.split_documents(documents)
        
        # Recreate vector store from scratch
        global vectorstore, qa_chain
        if os.path.exists(PERSIST_DIR):
            shutil.rmtree(PERSIST_DIR)

        os.makedirs(PERSIST_DIR, exist_ok=True)
        vectorstore = Chroma.from_documents(
            documents=split_docs,
            embedding=embeddings,
            collection_name=COLLECTION_NAME,
            persist_directory=PERSIST_DIR,
        )
        vectorstore.persist()
        
        prompt_template = """You are a helpful AI assistant for a personal journaling application. \
You help users reflect on their thoughts and experiences by analyzing their journal entries.\n\nUse the following pieces of context from the user's journal entries to answer the question.\nIf you don't know the answer based on the context, say so.\n\nContext:\n{context}\n\nQuestion: {question}\n\nAnswer: Provide a thoughtful, personalized response based on the journal entries. Be empathetic and insightful."""

        PROMPT = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )
        
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vectorstore.as_retriever(search_kwargs={"k": 5}),
            chain_type_kwargs={"prompt": PROMPT},
            return_source_documents=True
        )
        
        logger.info(f"✅ Loaded {len(entries)} journal entries into vector store")
        
    except Exception as e:
        logger.error(f"❌ Error loading journal entries: {e}")
        vectorstore = None
        qa_chain = None

@app.on_event("startup")
async def startup_event():
    """Initialize RAG components on startup"""
    try:
        init_rag_components()
        load_journal_entries_to_vectorstore()
        logger.info("🚀 RAG service started successfully")
    except Exception as e:
        logger.error(f"❌ Failed to start RAG service: {e}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "service": "journal-rag",
        "llm_ready": llm is not None,
        "vectorstore_ready": vectorstore is not None,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/entries/{user_id}")
async def get_entries(user_id: str):
    """Get all journal entries for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, user_id, title, body, created_at, updated_at, mood, tags
            FROM entries 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        """, (user_id,))
        
        entries = []
        for row in cursor.fetchall():
            tags = json.loads(row[7]) if row[7] else []
            entries.append(JournalEntry(
                id=row[0],
                user_id=row[1], 
                title=row[2],
                body=row[3],
                created_at=row[4],
                updated_at=row[5],
                mood=row[6],
                tags=tags
            ))
        
        conn.close()
        return {"entries": entries}
        
    except Exception as e:
        logger.error(f"Error fetching entries: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    """Chat with AI using RAG"""
    try:
        if not qa_chain:
            return ChatResponse(
                answer="I'm still indexing your journal entries. Please try again in a moment.",
                sources=[],
                conversation_id=request.conversation_id or "default"
            )
        
        logger.info(f"Processing chat request: {request.message[:50]}...")
        
        # Get response from QA chain
        result = qa_chain({"query": request.message})
        
        # Extract sources
        sources = []
        if "source_documents" in result:
            for doc in result["source_documents"]:
                source_info = {
                    "title": doc.metadata.get("title", "Unknown"),
                    "date": doc.metadata.get("created_at", "Unknown"),
                    "mood": doc.metadata.get("mood", None),
                    "tags": doc.metadata.get("tags", [])
                }
                sources.append(source_info)
        
        # Remove duplicate sources
        unique_sources = []
        seen_titles = set()
        for source in sources:
            if source["title"] not in seen_titles:
                unique_sources.append(source)
                seen_titles.add(source["title"])
        
        logger.info(f"Generated response with {len(unique_sources)} sources")
        
        return ChatResponse(
            answer=result["result"],
            sources=unique_sources,
            conversation_id=request.conversation_id or "default"
        )
        
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/refresh")
async def refresh_vectorstore():
    """Refresh the vector store with latest journal entries"""
    try:
        load_journal_entries_to_vectorstore()
        return {"status": "success", "message": "Vector store refreshed"}
    except Exception as e:
        logger.error(f"Error refreshing vector store: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)