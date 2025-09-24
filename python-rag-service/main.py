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
import re
from collections import Counter

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
entry_metadata_map: Dict[str, Dict[str, Any]] = {}
user_profile: Dict[str, Any] = {"name": None, "name_sources": []}
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

def extract_user_insights(entries: List[JournalEntry]):
    """Extract simple user profile insights such as name occurrences"""
    global user_profile

    content_texts = []
    for entry in entries:
        content_texts.append(entry.body)
        if entry.title:
            content_texts.append(entry.title)

    combined_text = "\n".join(content_texts)
    name_pattern = re.compile(r"\bMy name is\s+([A-Z][a-z]+)\b", re.IGNORECASE)
    matches = name_pattern.findall(combined_text)

    if matches:
        counter = Counter(name.title() for name in matches)
        most_common = counter.most_common(1)[0]
        user_profile["name"] = most_common[0]
        user_profile["name_sources"] = [f"Mentioned {most_common[1]} time(s) in journal entries"]
    else:
        user_profile["name"] = None
        user_profile["name_sources"] = []


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
        
        rows = cursor.fetchall()
        conn.close()
        
        if not rows:
            logger.info("📝 No journal entries found")
            return
        
        # Convert to documents
        documents = []
        entries: List[JournalEntry] = []
        global entry_metadata_map
        entry_metadata_map = {}

        for row in rows:
            entry_id, user_id, title, body, created_at, updated_at, mood, tags = row
            tags_list = json.loads(tags) if tags else []

            entries.append(
                JournalEntry(
                    id=entry_id,
                    user_id=user_id,
                    title=title,
                    body=body,
                    created_at=created_at,
                    updated_at=updated_at,
                    mood=mood,
                    tags=tags_list,
                )
            )

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
            entry_metadata_map[entry_id] = metadata

        extract_user_insights(entries)
        
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
        
        prompt_template = """You are a thoughtful journaling companion.
Use the journal context to answer the user. Adjust your tone and length to the question:
- For direct facts (e.g. "What is my name?"), respond in one or two concise sentences.
- For reflective or open-ended questions (e.g. "What patterns do you notice?"), be more expansive, weaving themes with empathy.
- If context is missing, say so gently and offer next steps.

Context:
{context}

Question: {question}

Answer:"""

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
        
        normalized_question = request.message.strip().lower()
        if re.search(r"what\s+is\s+my\s+name", normalized_question):
            if user_profile.get("name"):
                answer = (
                    f"Based on your journal entries, your name appears to be {user_profile['name']}."
                )
                return ChatResponse(
                    answer=answer,
                    sources=[{"title": note} for note in user_profile.get("name_sources", [])],
                    conversation_id=request.conversation_id or "default",
                )
            else:
                return ChatResponse(
                    answer="I didn't find an explicit mention of your name in the journal entries. Feel free to tell me how you'd like to be addressed!",
                    sources=[],
                    conversation_id=request.conversation_id or "default",
                )

        # Get response from QA chain
        result = qa_chain.invoke({"query": request.message})
        
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