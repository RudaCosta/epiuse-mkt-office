#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
rag.py — RAG offline sobre o corpus dos 693 artigos EPI-USE.
Embeddings via Ollama (nomic-embed-text), índice em memória + cache em disco.
Sem torch, sem faiss — numpy puro. Tudo local, zero crédito de API.

- build_index(): le corpus/corpus.jsonl, chunka, embeda via Ollama, salva corpus/index.npz
- retrieve(query, k): top-k chunks por similaridade de cosseno
"""
import os, json, sys
import numpy as np
import requests

HERE = os.path.dirname(os.path.abspath(__file__))
CORPUS = os.path.join(HERE, "corpus", "corpus.jsonl")
INDEX = os.path.join(HERE, "corpus", "index.npz")
META = os.path.join(HERE, "corpus", "index_meta.json")
OLLAMA = os.environ.get("OLLAMA_URL", "http://localhost:11434")
EMBED_MODEL = "nomic-embed-text"
CHUNK = 1100  # chars por chunk

def _embed(text):
    r = requests.post(f"{OLLAMA}/api/embeddings",
                      json={"model": EMBED_MODEL, "prompt": text}, timeout=60)
    r.raise_for_status()
    return r.json()["embedding"]

def _chunks(body, size=CHUNK):
    body = body.strip()
    return [body[i:i+size] for i in range(0, len(body), size)] or [body]

def build_index(verbose=True):
    if not os.path.exists(CORPUS):
        raise SystemExit(f"corpus inexistente: {CORPUS} — rode scrape_corpus.py antes")
    docs = [json.loads(l) for l in open(CORPUS, encoding="utf-8")]
    vecs, meta = [], []
    for di, d in enumerate(docs, 1):
        for ci, ch in enumerate(_chunks(d["body"])):
            try:
                vecs.append(_embed(ch))
                meta.append({"id": d["id"], "titulo": d["titulo"], "url": d["url"],
                             "lob": d.get("lob"), "etapa": d.get("etapa_funil"),
                             "chunk": ch})
            except Exception as e:
                print(f"  embed falhou doc{di} chunk{ci}: {e}")
        if verbose and di % 50 == 0:
            print(f"[index] {di}/{len(docs)} docs · {len(vecs)} chunks")
    arr = np.array(vecs, dtype=np.float32)
    arr /= (np.linalg.norm(arr, axis=1, keepdims=True) + 1e-9)
    np.savez_compressed(INDEX, vecs=arr)
    json.dump(meta, open(META, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"FIM index: {len(meta)} chunks de {len(docs)} docs -> {INDEX}")
    return len(meta)

_CACHE = {"vecs": None, "meta": None}
def _load():
    if _CACHE["vecs"] is None:
        if not os.path.exists(INDEX):
            raise SystemExit("indice inexistente — rode build_index()")
        _CACHE["vecs"] = np.load(INDEX)["vecs"]
        _CACHE["meta"] = json.load(open(META, encoding="utf-8"))
    return _CACHE["vecs"], _CACHE["meta"]

def retrieve(query, k=5, lob=None):
    vecs, meta = _load()
    q = np.array(_embed(query), dtype=np.float32)
    q /= (np.linalg.norm(q) + 1e-9)
    sims = vecs @ q
    idx = np.argsort(-sims)[:max(k*3, k)]
    out, seen = [], set()
    for i in idx:
        m = meta[i]
        if lob and m.get("lob") and lob.lower() not in str(m["lob"]).lower():
            continue
        key = m["id"]
        if key in seen:
            continue
        seen.add(key)
        out.append({**m, "score": float(sims[i])})
        if len(out) >= k:
            break
    return out

if __name__ == "__main__":
    if "--build" in sys.argv:
        build_index()
    else:
        for r in retrieve(" ".join(sys.argv[1:]) or "reforma tributaria CFO", k=4):
            print(f"{r['score']:.3f} · {r['titulo'][:60]} · {r['lob']}")
