# sidecar/rag.py
from dataclasses import dataclass
from typing import List, Tuple
import math
import time
import re
import numpy as np

@dataclass
class Doc:
    id: int
    text: str
    date: str
    score: float

def simple_chunks(text: str, target_chars: int = 2400, overlap: int = 200) -> List[str]:
    # Naive splitter by characters (MVP). Replace with token-aware later.
    text = re.sub(r"\s+", " ", text).strip()
    out, i = [], 0
    while i < len(text):
        end = min(len(text), i + target_chars)
        out.append(text[i:end])
        if end == len(text): break
        i = max(0, end - overlap)
    return out

def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-8
    return float(np.dot(a, b) / denom)

def dense_search(query_vec: List[float], corpus: List[Tuple[int, List[float], str, str]], top_k: int = 20) -> List[Doc]:
    q = np.array(query_vec, dtype=np.float32)
    scored = []
    for cid, emb, date, text in corpus:
        s = cosine_sim(q, np.array(emb, dtype=np.float32))
        scored.append(Doc(id=cid, text=text, date=date, score=s))
    scored.sort(key=lambda d: d.score, reverse=True)
    return scored[:top_k]

def reciprocal_rank_fusion(dense: List[Doc], sparse: List[Doc], k: int = 60, top_k: int = 12) -> List[Doc]:
    # RRF: sum 1/(k + rank)
    score_map = {}
    for i, d in enumerate(dense):
        score_map.setdefault(d.id, Doc(id=d.id, text=d.text, date=d.date, score=0.0)).score += 1.0 / (k + i + 1)
    for i, d in enumerate(sparse):
        score_map.setdefault(d.id, Doc(id=d.id, text=d.text, date=d.date, score=0.0)).score += 1.0 / (k + i + 1)
    fused = list(score_map.values())
    fused.sort(key=lambda x: x.score, reverse=True)
    return fused[:top_k]

def recency_boost(docs: List[Doc], now_ts: float, half_life_days: float = 30.0) -> List[Doc]:
    # Expect date as ISO string, e.g., "2025-09-24T12:00:00Z" or "2025-09-24"
    def to_ts(d: str) -> float:
        try:
            return time.mktime(time.strptime(d[:10], "%Y-%m-%d"))
        except:
            return now_ts
    hl = half_life_days * 86400.0
    out = []
    for d in docs:
        age = max(0.0, now_ts - to_ts(d.date))
        boost = 0.5 ** (age / hl)
        out.append(Doc(id=d.id, text=d.text, date=d.date, score=d.score * (0.85 + 0.15 * boost)))
    out.sort(key=lambda x: x.score, reverse=True)
    return out

def build_prompt(question: str, ctx_docs: List[Doc]) -> str:
    bullets = "\n\n".join(f"• [{d.date}] {d.text}" for d in ctx_docs)
    sys = (
        "You are a helpful AI assistant that can have natural conversations on any topic. "
        "When relevant context from the user's journal entries is provided, you may reference it to give more personalized responses, "
        "but you can also engage in normal conversation about any subject. "
        "Be conversational, helpful, and engaging."
    )
    if ctx_docs:
        user = f"Question: {question}\n\nRelevant journal context (if applicable):\n{bullets}"
    else:
        user = f"Question: {question}"
    return sys, user