#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
app.py — Content Factory OFFLINE (EPI-USE Brasil)
Mesma funcao do /inbound do Office, porem 100% local: zero credito de API.
LLM: Ollama qwen2.5 (redator + revisor) · RAG: 693 artigos via nomic-embed.

Pipeline: input -> RAG (ancora na voz EPI-USE) -> redator B2B persona -> revisor SEO/GEO
Roda em http://localhost:5000
"""
import os, json, re, warnings
warnings.filterwarnings("ignore")
import requests
from flask import Flask, request, jsonify, send_from_directory
import rag
from prompt_lib import PERSONAS, build_prompt, build_revisor, parse_json, ollama, LLM

HERE = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder="static")

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/api/factory", methods=["POST"])
def factory():
    b = request.get_json(force=True) or {}
    inp = str(b.get("input", "")).strip()[:12000]
    if not inp:
        return jsonify(success=False, error="Input obrigatorio."), 400
    persona = b.get("persona") if b.get("persona") in PERSONAS else "auto"
    o = b.get("outputs") or {}
    outputs = {"post": o.get("post", True), "carousel": bool(o.get("carousel")),
               "single": bool(o.get("single")), "blogCover": bool(o.get("blogCover")),
               "article": bool(o.get("article"))}
    if not any(outputs.values()):
        return jsonify(success=False, error="Escolha ao menos uma saida."), 400

    # RAG — ancora na voz EPI-USE
    contexto = []
    try:
        contexto = rag.retrieve(inp, k=4)
    except Exception as e:
        print("[rag] indisponivel:", e)

    try:
        gen = ollama(build_prompt(inp, persona, outputs, contexto),
                     max_tokens=6000 if outputs["article"] else 3000)
        pacote = parse_json(gen)
    except Exception as e:
        return jsonify(success=False, error=f"Falha na geracao: {e}"), 500

    revisao = None
    try:
        revisao = parse_json(ollama(build_revisor(pacote, inp), max_tokens=1800, temp=0.4))
    except Exception as e:
        print("[revisor] falhou:", e)

    fontes = [{"titulo": c["titulo"], "url": c["url"], "score": round(c["score"], 3)} for c in contexto]
    return jsonify(success=True, **pacote, revisao=revisao, fontes_rag=fontes,
                   etiqueta="🤖 Gerado por IA LOCAL (Qwen2.5 offline) - revisar antes de publicar",
                   motor=f"{LLM} + RAG {len(contexto)} fontes")

@app.route("/api/health")
def health():
    try:
        models = requests.get(f"{OLLAMA}/api/tags", timeout=5).json()
        names = [m["name"] for m in models.get("models", [])]
        idx_ok = os.path.exists(os.path.join(HERE, "corpus", "index.npz"))
        return jsonify(ok=True, ollama=True, modelos=names, rag_index=idx_ok)
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 503

if __name__ == "__main__":
    print("Content Factory OFFLINE -> http://localhost:5000")
    app.run(host="127.0.0.1", port=5000, debug=False)
