#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
linkedin_routine.py — le o xlsx da rotina diaria de LinkedIn (Cowork) e gera
public/api/linkedin-routine.json pro Office consumir.

Fonte: routines/Linkedin Follower Routine.xlsx (3 abas: Historico, Posts, Resumo)
Dados REAIS de admin (Regra 7). Roda 1x/dia via Tarefa Agendada.

Uso: python scripts/integrations/linkedin_routine.py
"""
import os, json, math, warnings, datetime
warnings.filterwarnings("ignore")
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
XLSX = os.path.join(ROOT, "routines", "Linkedin Follower Routine.xlsx")
OUT = os.path.join(ROOT, "public", "api", "linkedin-routine.json")

def clean(v):
    if v is None: return None
    if isinstance(v, float) and math.isnan(v): return None
    if isinstance(v, str):
        s = v.strip()
        return s or None
    return v

def num(v):
    v = clean(v)
    if v is None: return None
    if isinstance(v, (int, float)): return v
    s = str(v).replace(".", "").replace("%", "").replace("+", "").replace(",", ".").strip()
    try: return float(s) if "." in s else int(s)
    except: return None

def parse_historico(xl):
    raw = xl.parse("Histórico", header=None)
    rows, hdr = [], None
    for _, r in raw.iterrows():
        cells = [clean(c) for c in r.tolist()]
        if cells[0] == "Mês/Ano":
            hdr = True; continue
        if hdr and cells[0] and num(cells[1]) is not None:
            rows.append({
                "mes": cells[0], "seguidores": num(cells[1]),
                "novos_30d": num(cells[2]), "crescimento_liquido": num(cells[3]),
                "variacao_pct": clean(cells[4]),
                "impressoes": num(cells[5]), "reacoes": num(cells[6]),
            })
    return rows

def parse_posts(xl):
    raw = xl.parse("Posts_Jun2026", header=None)
    posts, started = [], False
    for _, r in raw.iterrows():
        c = [clean(x) for x in r.tolist()]
        if c[0] == "Data":
            started = True; continue
        if started and c[0]:
            posts.append({
                "data": str(c[0]), "resumo": c[1], "autor": c[2], "tipo": c[3],
                "impressoes": num(c[4]), "cliques": num(c[5]), "ctr": num(c[6]),
                "reacoes": num(c[7]), "comentarios": num(c[8]),
                "compartilhamentos": num(c[9]), "taxa_engaj": num(c[10]),
            })
    # ranking por taxa de engajamento (melhor performance)
    ranked = sorted([p for p in posts if p.get("taxa_engaj") is not None],
                    key=lambda p: p["taxa_engaj"], reverse=True)
    return posts, ranked

def parse_resumo(xl):
    raw = xl.parse("Resumo", header=None)
    out = {}
    for _, r in raw.iterrows():
        k, v = clean(r.iloc[0]), clean(r.iloc[1]) if len(r) > 1 else None
        if k and v is not None and "LinkedIn Analytics" not in str(k) and "Resumo Executivo" not in str(k):
            out[k] = v
    return out

def main():
    if not os.path.exists(XLSX):
        raise SystemExit(f"xlsx nao encontrado: {XLSX}")
    xl = pd.ExcelFile(XLSX)
    historico = parse_historico(xl)
    posts, ranked = parse_posts(xl)
    resumo = parse_resumo(xl)
    atual = historico[-1] if historico else {}
    payload = {
        "fonte": "LinkedIn Analytics (admin) via rotina Cowork — dados REAIS",
        "atualizado_em": datetime.datetime.now().isoformat(timespec="seconds"),
        "arquivo": "routines/Linkedin Follower Routine.xlsx",
        "seguidores_atual": atual.get("seguidores"),
        "mes_atual": atual.get("mes"),
        "historico": historico,
        "posts": posts,
        "top_posts": ranked[:5],
        "resumo": resumo,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"OK -> {OUT}")
    print(f"   seguidores: {payload['seguidores_atual']} ({payload['mes_atual']}) · "
          f"{len(posts)} posts · top: {ranked[0]['resumo'][:40] if ranked else '-'}")

if __name__ == "__main__":
    main()
