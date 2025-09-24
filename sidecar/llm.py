# sidecar/llm.py
from llama_cpp import Llama
from typing import Dict, Iterable

class ChatLLM:
    def __init__(self, model_path: str, ctx_tokens: int = 8192, gpu_layers: int = 0, temperature: float = 0.7, top_p: float = 0.9):
        self.llm = Llama(
            model_path=model_path,
            n_ctx=ctx_tokens,
            n_gpu_layers=gpu_layers,
            embedding=False,
            logits_all=False,
            verbose=True
        )
        self.temperature = temperature
        self.top_p = top_p

    def stream_chat(self, system: str, user: str, max_tokens: int = 512):
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ]
        for chunk in self.llm.create_chat_completion(
            messages=messages,
            temperature=self.temperature,
            top_p=self.top_p,
            max_tokens=max_tokens,
            stream=True
        ):
            # chunk shape may have 'choices'[0]['delta']['content'] or 'choices'[0]['text']
            choice = chunk["choices"][0]
            delta = choice.get("delta") or {}
            token = delta.get("content") or choice.get("text") or ""
            if token:
                yield token

class Embedder:
    def __init__(self, model_path: str, ctx_tokens: int = 2048, gpu_layers: int = 0):
        self.llm = Llama(
            model_path=model_path,
            n_ctx=ctx_tokens,
            n_gpu_layers=gpu_layers,
            embedding=True,
            verbose=True
        )

    def embed(self, text: str) -> Iterable[float]:
        # Returns list[float]
        out = self.llm.create_embedding(input=[text])
        return out["data"][0]["embedding"]