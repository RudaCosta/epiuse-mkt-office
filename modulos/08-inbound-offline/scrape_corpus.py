#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scrape_corpus.py — baixa os corpos dos 693 artigos do blog EPI-USE Brasil 1x
e grava em corpus/corpus.jsonl pra alimentar o RAG offline.

Fonte da lista: ../../public/api/artigos.json (metadado — titulo, url, funil, LOB).
Corpo do artigo: div.content-post-blog na pagina publica.

Uso: python scrape_corpus.py [--limit N] [--delay 0.3]
Roda 1x. Re-rodar atualiza o corpus (pega artigos novos/editados).
"""
import json, time, sys, os, re, warnings
warnings.filterwarnings("ignore")
import requests
from bs4 import BeautifulSoup

HERE = os.path.dirname(os.path.abspath(__file__))
ARTIGOS = os.path.join(HERE, "..", "..", "public", "api", "artigos.json")
OUT = os.path.join(HERE, "corpus", "corpus.jsonl")
UA = {"User-Agent": "Mozilla/5.0 (EPI-USE Office offline corpus builder)"}

def load_list():
    with open(ARTIGOS, encoding="utf-8") as f:
        data = json.load(f)
    arr = data if isinstance(data, list) else (data.get("artigos") or next(v for v in data.values() if isinstance(v, list)))
    return arr

def extract_body(html):
    soup = BeautifulSoup(html, "html.parser")
    el = soup.select_one("div.content-post-blog") or soup.select_one("div.htmlchars")
    body = el.get_text(" ", strip=True) if el else ""
    md = soup.find("meta", {"name": "description"})
    desc = (md.get("content") if md else "") or ""
    return re.sub(r"\s+", " ", body).strip(), desc.strip()

def main():
    args = sys.argv[1:]
    limit = int(args[args.index("--limit")+1]) if "--limit" in args else None
    delay = float(args[args.index("--delay")+1]) if "--delay" in args else 0.3
    arr = load_list()
    if limit: arr = arr[:limit]
    ok = skip = fail = 0
    with open(OUT, "w", encoding="utf-8") as out:
        for i, a in enumerate(arr, 1):
            url = a.get("url")
            if not url:
                skip += 1; continue
            try:
                r = requests.get(url, timeout=25, headers=UA)
                if r.status_code != 200:
                    fail += 1; print(f"[{i}/{len(arr)}] {r.status_code} {url}"); continue
                body, desc = extract_body(r.text)
                if len(body) < 300:
                    fail += 1; print(f"[{i}/{len(arr)}] corpo curto ({len(body)}) {url}"); continue
                rec = {
                    "id": a.get("id"), "titulo": a.get("titulo"), "url": url,
                    "etapa_funil": a.get("etapa_funil"), "lob": a.get("linha_de_negocio"),
                    "meta_desc": desc, "body": body[:12000]
                }
                out.write(json.dumps(rec, ensure_ascii=False) + "\n")
                ok += 1
                if i % 25 == 0: print(f"[{i}/{len(arr)}] ok={ok} fail={fail}")
            except Exception as e:
                fail += 1; print(f"[{i}/{len(arr)}] ERRO {e} {url}")
            time.sleep(delay)
    print(f"\nFIM · ok={ok} skip={skip} fail={fail} -> {OUT}")

if __name__ == "__main__":
    main()
