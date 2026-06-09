#!/usr/bin/env python3
"""
parse_field_template.py
Parseia o "cronograma_gantt_eventos v1.xlsx" (template de processo de eventos
B2B da Isabela) → public/api/field-template.json.
Gera: fases[] (com tarefas: tipo/tarefa/responsavel/prazo), checklist[], planos_b[].
Roda 1x (ou quando o template mudar). NAO depende de evento real.
"""
import json, sys, io, warnings
from pathlib import Path
import pandas as pd

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
warnings.filterwarnings('ignore')

CANDIDATES = [
    r"C:/Users/Ruds/Desktop/ROADMAP MKT OFFICE JUN 2026/07 Field Marketing/cronograma_gantt_eventos v1.xlsx",
    r"C:/Users/rudac/Desktop/ROADMAP MKT OFFICE JUN 2026/07 Field Marketing/cronograma_gantt_eventos v1.xlsx",
]
OUT = Path(__file__).resolve().parents[2] / "public" / "api" / "field-template.json"

def find():
    import os
    for p in CANDIDATES:
        if os.path.exists(p): return p
    return None

def main():
    fp = find()
    if not fp:
        print("ERRO: template nao encontrado"); sys.exit(1)
    print(f"[field] lendo {fp}")

    # ── GANTT: fases + tarefas ────────────────────────────────────────────────
    g = pd.read_excel(fp, sheet_name='📅 Gantt', header=None)
    fases = []
    fase_atual = None
    for i in range(3, len(g)):
        col0 = g.iloc[i, 0]
        tipo = g.iloc[i, 1]
        tarefa = g.iloc[i, 2]
        if pd.notna(col0) and 'FASE' in str(col0):
            fase_atual = {"nome": str(col0).strip(), "tarefas": []}
            fases.append(fase_atual)
            continue
        if pd.notna(tarefa) and fase_atual is not None:
            fase_atual["tarefas"].append({
                "tipo": str(tipo).strip() if pd.notna(tipo) else "",
                "tarefa": str(tarefa).strip(),
                "responsavel": str(g.iloc[i, 3]).strip() if pd.notna(g.iloc[i, 3]) else "",
                "prazo": str(g.iloc[i, 5]).strip() if pd.notna(g.iloc[i, 5]) else "",
            })

    # ── CHECKLIST D-Day ───────────────────────────────────────────────────────
    c = pd.read_excel(fp, sheet_name='✅ Checklist', header=None)
    checklist = []
    for i in range(3, len(c)):
        item = c.iloc[i, 1]
        if pd.notna(item) and str(item).strip():
            checklist.append({
                "item": str(item).strip(),
                "responsavel": str(c.iloc[i, 2]).strip() if pd.notna(c.iloc[i, 2]) else "",
            })

    # ── PLANOS B ──────────────────────────────────────────────────────────────
    p = pd.read_excel(fp, sheet_name='🔀 Planos B', header=None)
    planos_b = []
    for i in range(2, len(p)):
        risco = p.iloc[i, 0]
        if pd.notna(risco) and str(risco).strip():
            planos_b.append({
                "risco": str(risco).strip(),
                "plano_b": str(p.iloc[i, 1]).strip() if pd.notna(p.iloc[i, 1]) else "",
                "gatilho": str(p.iloc[i, 2]).strip() if pd.notna(p.iloc[i, 2]) else "",
                "responsavel": str(p.iloc[i, 3]).strip() if pd.notna(p.iloc[i, 3]) else "",
            })

    payload = {
        "fonte": "cronograma_gantt_eventos v1.xlsx (Isabela · Field Marketing)",
        "gerado_em": pd.Timestamp.now().isoformat(),
        "fases": fases,
        "checklist_dday": checklist,
        "planos_b": planos_b,
        "total_tarefas": sum(len(f["tarefas"]) for f in fases),
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[field] OK · {len(fases)} fases · {payload['total_tarefas']} tarefas · {len(checklist)} checklist · {len(planos_b)} planos B · {OUT.stat().st_size//1024}KB")

if __name__ == "__main__":
    main()
