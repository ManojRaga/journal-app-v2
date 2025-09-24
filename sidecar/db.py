# sidecar/db.py
import sqlite3
from pathlib import Path
from typing import Iterable, List, Tuple, Optional
import struct
from dataclasses import dataclass

@dataclass
class Chunk:
    id: int
    entry_id: int
    text: str
    date: str
    tags: Optional[str]

def open_db(path: str) -> sqlite3.Connection:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.Connection(path, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def migrate(conn: sqlite3.Connection):
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS entries(
      id INTEGER PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      mood TEXT,
      tags TEXT
    );

    CREATE TABLE IF NOT EXISTS chunks(
      id INTEGER PRIMARY KEY,
      entry_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      tags TEXT,
      FOREIGN KEY(entry_id) REFERENCES entries(id) ON DELETE CASCADE
    );

    -- Keyword search
    CREATE VIRTUAL TABLE IF NOT EXISTS chunk_fts USING fts5(
      text, content='chunks', content_rowid='id'
    );

    -- Dense embeddings stored as BLOB (little-endian float32 array)
    CREATE TABLE IF NOT EXISTS chunk_vec(
      id INTEGER PRIMARY KEY,
      dim INTEGER NOT NULL,
      embedding BLOB NOT NULL, -- packed float32[dim]
      FOREIGN KEY(id) REFERENCES chunks(id) ON DELETE CASCADE
    );
    """)
    conn.commit()

def upsert_entry(conn: sqlite3.Connection, user_id: str, title: str, body: str, created_at: str, mood: str, tags: str) -> int:
    cur = conn.execute(
        "INSERT INTO entries(user_id,title,body,created_at,mood,tags) VALUES(?,?,?,?,?,?)",
        (user_id, title, body, created_at, mood, tags)
    )
    return cur.lastrowid

def insert_chunk(conn: sqlite3.Connection, entry_id: int, user_id: str, idx: int, text: str, created_at: str, tags: Optional[str]) -> int:
    cur = conn.execute(
        "INSERT INTO chunks(entry_id,user_id,chunk_index,text,created_at,tags) VALUES(?,?,?,?,?,?)",
        (entry_id, user_id, idx, text, created_at, tags)
    )
    cid = cur.lastrowid
    conn.execute("INSERT INTO chunk_fts(rowid, text) VALUES(?,?)", (cid, text))
    return cid

def embed_to_blob(vec: Iterable[float]) -> bytes:
    arr = list(vec)
    return struct.pack("<%sf" % len(arr), *arr)

def store_embedding(conn: sqlite3.Connection, chunk_id: int, vec: List[float]):
    conn.execute(
        "INSERT OR REPLACE INTO chunk_vec(id, dim, embedding) VALUES(?,?,?)",
        (chunk_id, len(vec), embed_to_blob(vec))
    )

def read_embedding(row) -> List[float]:
    blob = row["embedding"]
    dim = row["dim"]
    floats = struct.unpack("<%sf" % dim, blob)
    return list(floats)

def get_candidate_chunks_by_keyword(conn: sqlite3.Connection, user_id: str, query: str, k: int = 20) -> List[Chunk]:
    conn.row_factory = sqlite3.Row
    cur = conn.execute("""
        SELECT c.id, c.entry_id, c.text, c.created_at as date, c.tags
        FROM chunk_fts
        JOIN chunks c ON c.id = chunk_fts.rowid
        WHERE chunk_fts MATCH ? AND c.user_id = ?
        ORDER BY bm25(chunk_fts) LIMIT ?
    """, (query, user_id, k))
    out = []
    for r in cur.fetchall():
        out.append(Chunk(id=r["id"], entry_id=r["entry_id"], text=r["text"], date=r["date"], tags=r["tags"]))
    return out

def get_embeddings_for_ids(conn: sqlite3.Connection, ids: Iterable[int]) -> List[Tuple[int, List[float], str]]:
    conn.row_factory = sqlite3.Row
    q = "SELECT v.id, v.dim, v.embedding, c.created_at as date FROM chunk_vec v JOIN chunks c ON c.id=v.id WHERE v.id IN (%s)" % ",".join("?"*len(list(ids)))
    cur = conn.execute(q, tuple(ids))
    res = []
    for r in cur.fetchall():
        vec = read_embedding(r)
        res.append((r["id"], vec, r["date"]))
    return res

def all_embeddings_for_user(conn: sqlite3.Connection, user_id: str) -> List[Tuple[int, List[float], str, str]]:
    conn.row_factory = sqlite3.Row
    cur = conn.execute("""
        SELECT v.id, v.dim, v.embedding, c.created_at as date, c.text
        FROM chunk_vec v JOIN chunks c ON c.id=v.id
        WHERE c.user_id = ?
    """, (user_id,))
    out = []
    for r in cur.fetchall():
        vec = read_embedding(r)
        out.append((r["id"], vec, r["date"], r["text"]))
    return out