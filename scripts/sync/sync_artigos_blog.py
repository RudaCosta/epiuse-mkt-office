#!/usr/bin/env python3
"""
sync_artigos_blog.py — v0.5.0
Lê o xlsx "Conteudos Blog EUBR 2026 (via manus).xlsx" e gera public/api/artigos.json

Fonte (em ordem de prioridade):
  1) C:/Users/Ruds/OneDrive - EPI USE BRASIL.../EPI-USE Voices/estudo/Conteudos Blog EUBR 2026 (via manus).xlsx
  2) G:/Meu Drive/Claude MKT EUBR/vault/00-contexto/artigos/Conteudos Blog EUBR 2026 (via manus).xlsx

Saída: modulo-a-profile-optimizer/public/api/artigos.json
       (consumida por GET /api/artigos no server.js)

Uso:
  python scripts/sync/sync_artigos_blog.py
"""
import json, os, sys
from pathlib import Path
import pandas as pd

CANDIDATES = [
    r"C:/Users/Ruds/OneDrive - EPI USE BRASIL SERVIÇOS EM SISTEMAS LTDA/MARKETING/Projetos/EPI-USE Voices/estudo/Conteudos Blog EUBR 2026 (via manus).xlsx",
    r"G:/Meu Drive/Claude MKT EUBR/vault/00-contexto/artigos/Conteudos Blog EUBR 2026 (via manus).xlsx",
]

OUT = Path(__file__).resolve().parents[2] / "public" / "api" / "artigos.json"


def find_xlsx():
    for p in CANDIDATES:
        if os.path.exists(p):
            return p
    return None


def slug_from_url(url: str) -> str:
    if not isinstance(url, str): return ""
    return url.rstrip("/").rsplit("/", 1)[-1]


def main():
    fp = find_xlsx()
    if not fp:
        print("ERRO: xlsx Manus não encontrado nos paths candidatos.")
        for p in CANDIDATES: print("  -", p)
        sys.exit(1)
    print(f"[artigos] lendo {fp}")
    df = pd.read_excel(fp, sheet_name=0)
    print(f"[artigos] {len(df)} linhas lidas")

    artigos = []
    for _, r in df.iterrows():
        artigos.append({
            "id": slug_from_url(r.get("url", "")) or str(r.get("slug_atual", "")),
            "titulo": str(r.get("tituloa", "")).strip(),
            "url": str(r.get("url", "")).strip(),
            "slug_atual": str(r.get("slug_atual", "")).strip(),
            "slug_hubspot": str(r.get("slug_hubspot", "")).strip(),
            "etapa_funil": str(r.get("etapa_funil", "")).strip(),
            "linha_de_negocio": str(r.get("linha_de_negocio", "")).strip(),
            "linhas_de_negocio_multi": str(r.get("linhas_de_negocio_multi", "")).strip(),
            "ativos_nutricao": str(r.get("ativos_nutricao", "")).strip(),
            "regua_eventos": str(r.get("regua_eventos", "")).strip(),
            "cta_automacao_sugerido": str(r.get("cta_automacao_sugerido", "")).strip(),
            "oferta_especifica": str(r.get("oferta_especifica", "")).strip(),
            "score_antes": int(r.get("score_antes", 0)) if pd.notna(r.get("score_antes")) else None,
            "score_depois": int(r.get("score_depois", 0)) if pd.notna(r.get("score_depois")) else None,
            "ganho": str(r.get("ganho", "")).strip(),
            "problemas": str(r.get("problemas", "")).strip() if pd.notna(r.get("problemas")) else "",
            "requer_atualizacao": bool(r.get("requer_atualizacao", False)),
            # Campos auxiliares vazios — preenchidos depois por classificacao IA / user
            "status_reaproveitamento": None,   # "reescrever" | "voice" | "arquivar" | "atualizar_cta"
            "score_relevancia_2026": None,     # 0-100 (Sonnet preenche)
            "voice_atribuido": None,           # slug do Voice (manual ou IA)
            "favorito_voices": [],             # lista de slugs que favoritaram
        })

    # Agregações úteis pra UI
    from collections import Counter
    agg = {
        "total": len(artigos),
        "por_etapa_funil": dict(Counter(a["etapa_funil"] for a in artigos if a["etapa_funil"])),
        "por_linha_negocio": dict(Counter(a["linha_de_negocio"] for a in artigos if a["linha_de_negocio"])),
        "por_oferta": dict(Counter(a["oferta_especifica"] for a in artigos if a["oferta_especifica"])),
        "por_regua_evento": dict(Counter(a["regua_eventos"] for a in artigos if a["regua_eventos"])),
    }

    payload = {
        "fonte": fp,
        "gerado_em": pd.Timestamp.now().isoformat(),
        "agregados": agg,
        "artigos": artigos,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[artigos] OK · {len(artigos)} artigos · {OUT.stat().st_size//1024}KB · {OUT}")
    print(f"[artigos] etapas: {agg['por_etapa_funil']}")
    print(f"[artigos] linhas: {agg['por_linha_negocio']}")


if __name__ == "__main__":
    main()
