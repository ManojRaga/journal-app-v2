# sidecar/server.py
import os, time, json
from fastapi import FastAPI, Response, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List
import logging
import traceback

from db import open_db, migrate, upsert_entry, insert_chunk, store_embedding, get_candidate_chunks_by_keyword, all_embeddings_for_user
from llm import ChatLLM, Embedder
from rag import simple_chunks, dense_search, reciprocal_rank_fusion, recency_boost, build_prompt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
PORT = int(os.getenv("PORT", "5278"))
DB_PATH = os.getenv("DB_PATH")
MODEL_CHAT = os.getenv("MODEL_CHAT")
MODEL_EMBED = os.getenv("MODEL_EMBED")
CTX_TOKENS = int(os.getenv("CTX_TOKENS", "8192"))
GPU_LAYERS = int(os.getenv("GPU_LAYERS", "0"))
TOP_P = float(os.getenv("TOP_P", "0.9"))
TEMP = float(os.getenv("TEMP", "0.7"))
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "512"))

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://tauri.localhost"],  # Vite dev server and Tauri
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize globals
conn = None
chat = None
embedder = None

@app.on_event("startup")
async def startup_event():
    global conn, chat, embedder
    try:
        logger.info("Starting up sidecar server...")
        conn = open_db(DB_PATH)
        migrate(conn)
        logger.info("Database initialized")

        logger.info(f"Loading chat model: {MODEL_CHAT}")
        chat = ChatLLM(MODEL_CHAT, ctx_tokens=CTX_TOKENS, gpu_layers=GPU_LAYERS, temperature=TEMP, top_p=TOP_P)
        logger.info("Chat model loaded")

        if os.path.exists(MODEL_EMBED):
            logger.info(f"Loading embedding model: {MODEL_EMBED}")
            embedder = Embedder(MODEL_EMBED, ctx_tokens=2048, gpu_layers=0)
            logger.info("Embedding model loaded")
        else:
            logger.warning(f"Embedding model not found at {MODEL_EMBED}, using chat model for embeddings")
            embedder = None

    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        logger.error(traceback.format_exc())
        raise e

class EntryIn(BaseModel):
    user_id: str
    title: str = ""
    body: str
    created_at: str
    mood: str = ""
    tags: str = ""

class EmbedReq(BaseModel):
    user_id: str
    entry_id: int
    created_at: str
    text: str
    tags: str = ""

class SearchReq(BaseModel):
    user_id: str
    query: str
    k: int = 12

class ChatReq(BaseModel):
    user_id: str
    question: str
    k: int = 12

@app.get("/health")
def health():
    return {"ok": True, "models_loaded": {"chat": chat is not None, "embedder": embedder is not None}}

@app.post("/entries")
def add_entry(e: EntryIn):
    try:
        entry_id = upsert_entry(conn, e.user_id, e.title, e.body, e.created_at, e.mood, e.tags)

        # Chunk + embed immediately (MVP)
        chunks = simple_chunks(e.body, target_chars=2400, overlap=200)
        chunk_count = 0

        for i, ch in enumerate(chunks):
            cid = insert_chunk(conn, entry_id, e.user_id, i, ch, e.created_at, e.tags)

            # Only embed if embedder is available
            if embedder:
                try:
                    vec = embedder.embed(ch)
                    store_embedding(conn, cid, vec)
                except Exception as embed_error:
                    logger.error(f"Failed to embed chunk {cid}: {embed_error}")

            chunk_count += 1

        conn.commit()
        return {"entry_id": entry_id, "chunks": chunk_count}
    except Exception as e:
        logger.error(f"Error adding entry: {e}")
        logger.error(traceback.format_exc())
        return {"error": str(e)}, 500

@app.post("/embed")
def embed_chunk(r: EmbedReq):
    try:
        # For updating an existing entry or one-off chunks
        cid = insert_chunk(conn, r.entry_id, r.user_id, 0, r.text, r.created_at, r.tags)

        if embedder:
            vec = embedder.embed(r.text)
            store_embedding(conn, cid, vec)

        conn.commit()
        return {"chunk_id": cid}
    except Exception as e:
        logger.error(f"Error embedding chunk: {e}")
        return {"error": str(e)}, 500

@app.post("/search")
def search(req: SearchReq):
    try:
        results = []

        # Always do sparse/keyword search
        sparse = get_candidate_chunks_by_keyword(conn, req.user_id, req.query, k=max(20, req.k))

        if embedder and sparse:
            # Dense search only if embedder is available and we have results
            try:
                qvec = embedder.embed(req.query)
                corpus = all_embeddings_for_user(conn, req.user_id)
                dense = dense_search(qvec, corpus, top_k=max(20, req.k))
                # Fuse + recency boost
                fused = reciprocal_rank_fusion(dense, sparse, top_k=req.k)
                ranked = recency_boost(fused, now_ts=time.time(), half_life_days=30.0)
                results = ranked
            except Exception as embed_error:
                logger.error(f"Dense search failed, using sparse only: {embed_error}")
                results = sparse[:req.k]
        else:
            # Fallback to sparse only
            results = sparse[:req.k]

        return {
            "results": [
                {"id": d.id if hasattr(d, 'id') else d.id,
                 "date": d.date if hasattr(d, 'date') else d.date,
                 "text": (d.text if hasattr(d, 'text') else d.text)[:500],
                 "score": getattr(d, 'score', 1.0)}
                for d in results
            ]
        }
    except Exception as e:
        logger.error(f"Error in search: {e}")
        logger.error(traceback.format_exc())
        return {"error": str(e)}, 500

@app.post("/chat/stream")
def chat_stream(req: ChatReq):
    try:
        # Retrieve context
        ctx_docs = []

        # Get sparse results as baseline
        sparse = get_candidate_chunks_by_keyword(conn, req.user_id, req.question, k=max(20, req.k))

        if embedder and sparse:
            try:
                qvec = embedder.embed(req.question)
                corpus = all_embeddings_for_user(conn, req.user_id)
                dense = dense_search(qvec, corpus, top_k=max(20, req.k))
                fused = reciprocal_rank_fusion(dense, sparse, top_k=req.k)
                ranked = recency_boost(fused, now_ts=time.time(), half_life_days=30.0)
                ctx_docs = ranked
            except Exception as embed_error:
                logger.error(f"Context retrieval failed, using sparse: {embed_error}")
                from rag import Doc
                ctx_docs = [Doc(id=c.id, text=c.text, date=c.date, score=1.0) for c in sparse[:req.k]]
        else:
            # Fallback to sparse only
            from rag import Doc
            ctx_docs = [Doc(id=c.id, text=c.text, date=c.date, score=1.0) for c in sparse[:req.k]]

        sys, user = build_prompt(req.question, ctx_docs)

        def gen():
            try:
                # Server-Sent Events (SSE)
                yield "event: sources\ndata:" + json.dumps([
                    {"id": d.id, "date": d.date, "preview": d.text[:200]} for d in ctx_docs
                ]) + "\n\n"

                for tok in chat.stream_chat(sys, user, max_tokens=MAX_TOKENS):
                    # Escape newlines for SSE format
                    escaped_tok = tok.replace("\n", "\\n").replace("\r", "\\r")
                    yield "data:" + escaped_tok + "\n\n"

                yield "event: done\ndata: [DONE]\n\n"
            except Exception as stream_error:
                logger.error(f"Error in chat stream: {stream_error}")
                yield "event: error\ndata:" + json.dumps({"error": str(stream_error)}) + "\n\n"

        return StreamingResponse(gen(), media_type="text/event-stream")

    except Exception as e:
        logger.error(f"Error setting up chat stream: {e}")
        logger.error(traceback.format_exc())
        return {"error": str(e)}, 500

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=PORT)