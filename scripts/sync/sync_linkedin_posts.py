#!/usr/bin/env python3
"""
sync_linkedin_posts.py — F4 da revisão de conteúdo (jul/2026)

Lê a aba BASE da planilha de análise LinkedIn da Bruna
("EPIUSE_Analise_LinkedIn_May_2025__May_2026.xlsx" — 214 posts com colunas
LOB / Solução / Tema / Funil) e gera public/api/linkedin-posts.json com os
posts normalizados na taxonomia canônica (public/api/taxonomia-conteudo.json).

⚠️ Este script NÃO re-julga classificações — só traduz pra slug canônico via
aliases. Todo valor SEM alias vira linha no report de validação
(data/metas/linkedin_posts_validacao.json) — esse report É a ferramenta de
conferência da Bruna no F4. O re-tag de funil (critério unificado:
evento-cobertura = topo) é trabalho humano com ela.

Uso:
  python scripts/sync/sync_linkedin_posts.py             # dry-run (só report)
  python scripts/sync/sync_linkedin_posts.py --apply     # grava o JSON
  python scripts/sync/sync_linkedin_posts.py --xlsx <path>  # fonte explícita
"""
import json, os, sys, datetime
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
TAXO = ROOT / "public" / "api" / "taxonomia-conteudo.json"
OUT = ROOT / "public" / "api" / "linkedin-posts.json"
REPORT = ROOT / "data" / "metas" / "linkedin_posts_validacao.json"

XLSX_CANDIDATES = [
    # Pasta ROADMAP (Bruna atualiza aqui)
    r"C:/Users/Ruds/Desktop/ROADMAP MKT OFFICE JUN 2026/03 LinkedIn Boost/EPIUSE_Analise_LinkedIn_May_2025__May_2026.xlsx",
    r"C:/Users/rudac/Desktop/ROADMAP MKT OFFICE JUN 2026/03 LinkedIn Boost/EPIUSE_Analise_LinkedIn_May_2025__May_2026.xlsx",
    # Fallbacks
    r"C:/Users/Ruds/Desktop/EPIUSE_Analise_LinkedIn_May_2025__May_2026.xlsx",
    r"C:/epiuse-mkt-office/vault/00-contexto/conteudo/analise-linkedin-mai25-mai26.xlsx",
]


def find_xlsx():
    if "--xlsx" in sys.argv:
        return sys.argv[sys.argv.index("--xlsx") + 1]
    for p in XLSX_CANDIDATES:
        if os.path.exists(p):
            return p
    return None


def main():
    apply_ = "--apply" in sys.argv
    fp = find_xlsx()
    if not fp:
        print("ERRO: xlsx da análise LinkedIn não encontrado. Candidatos:")
        for p in XLSX_CANDIDATES:
            print("  -", p)
        sys.exit(1)

    taxo = json.load(open(TAXO, encoding="utf-8"))
    alias_lob = taxo["aliases"]["lob"]
    alias_funil = taxo["aliases"]["funil"]
    alias_oferta = taxo["aliases"]["oferta"]
    ofertas_por_rotulo = {}
    for o in taxo["ofertas"]:
        ofertas_por_rotulo[o["rotulo"].lower()] = o["slug"]

    print(f"[linkedin-posts] lendo {fp}")
    df = pd.read_excel(fp, sheet_name="BASE")
    df = df[df["Título (120 caracteres)"].notna()]
    print(f"[linkedin-posts] {len(df)} posts na BASE")

    posts, sem_mapa_lob, sem_mapa_funil, sem_mapa_solucao = [], {}, {}, {}
    for _, r in df.iterrows():
        lob_raw = str(r.get("LOB", "") or "").strip()
        funil_raw = str(r.get("Funil", "") or "").strip()
        solucao_raw = str(r.get("Solução", "") or "").strip()

        lob = alias_lob.get(lob_raw)
        if lob_raw and lob is None and lob_raw not in alias_lob:
            sem_mapa_lob[lob_raw] = sem_mapa_lob.get(lob_raw, 0) + 1
        funil = alias_funil.get(funil_raw)
        if funil_raw and funil is None:
            sem_mapa_funil[funil_raw] = sem_mapa_funil.get(funil_raw, 0) + 1
        # Solução → oferta: alias (nomes do GUIA_LOB) > rótulo exato; resto vai pro report
        oferta = alias_oferta.get(solucao_raw) or ofertas_por_rotulo.get(solucao_raw.lower())
        if solucao_raw and oferta is None:
            sem_mapa_solucao[solucao_raw] = sem_mapa_solucao.get(solucao_raw, 0) + 1

        data_pub = r.get("Data")
        posts.append({
            "data": str(pd.Timestamp(data_pub).date()) if pd.notna(data_pub) else None,
            "titulo": str(r.get("Título (120 caracteres)", "")).strip()[:160],
            "formato": str(r.get("Formato", "") or "").strip(),
            "tema": str(r.get("Tema", "") or "").strip(),
            "lob": lob,
            "oferta": oferta,
            "funil": funil,
            "lob_original": lob_raw,
            "solucao_original": solucao_raw,
            "funil_original": funil_raw,
            "impressoes": int(r["Impressões"]) if pd.notna(r.get("Impressões")) else None,
            "eng_total": int(r["Eng.Total"]) if pd.notna(r.get("Eng.Total")) else None,
            "taxa_engaj": round(float(r["Taxa Engaj. (%)"]), 2) if pd.notna(r.get("Taxa Engaj. (%)")) else None,
            "link": str(r.get("Link", "") or "").strip(),
            # Classificação veio da planilha da Bruna = revisão humana
            "classificacao_metodo": "humano",
        })

    from collections import Counter
    agregados = {
        "total": len(posts),
        "por_lob": dict(Counter(p["lob"] for p in posts if p["lob"]).most_common()),
        "por_funil": dict(Counter(p["funil"] for p in posts if p["funil"]).most_common()),
        "sem_lob": sum(1 for p in posts if not p["lob"]),
        "sem_funil": sum(1 for p in posts if not p["funil"]),
    }

    report = {
        "fonte": fp,
        "gerado_em": datetime.datetime.now().isoformat(timespec="seconds"),
        "taxonomia_versao": taxo.get("versao"),
        "total_posts": len(posts),
        "agregados": agregados,
        "valores_sem_mapa": {
            "lob": sem_mapa_lob,
            "funil": sem_mapa_funil,
            "solucao": sem_mapa_solucao,
        },
        "_obs": "valores_sem_mapa = o que a Bruna precisa mapear (adicionar alias no taxonomia-conteudo.json) ou corrigir na planilha.",
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[linkedin-posts] LOB: {agregados['por_lob']}")
    print(f"[linkedin-posts] Funil: {agregados['por_funil']} · sem funil: {agregados['sem_funil']}")
    for dim, vals in report["valores_sem_mapa"].items():
        if vals:
            print(f"[linkedin-posts] ⚠️ {dim} sem mapa ({len(vals)}): {vals}")
    print(f"[linkedin-posts] report: {REPORT}")

    if apply_:
        payload = {
            "fonte": os.path.basename(fp),
            "gerado_em": report["gerado_em"],
            "taxonomia_versao": taxo.get("versao"),
            "criterio_funil": "planilha-bruna-v1 — ⚠️ pendente re-tag F4 (critério unificado: evento-cobertura = topo)",
            "agregados": agregados,
            "posts": posts,
        }
        OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[linkedin-posts] OK · {len(posts)} posts · {OUT}")
    else:
        print("[DRY-RUN] use --apply pra gravar public/api/linkedin-posts.json")


if __name__ == "__main__":
    main()
