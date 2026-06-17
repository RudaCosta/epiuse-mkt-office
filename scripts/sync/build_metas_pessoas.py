#!/usr/bin/env python3
"""
build_metas_pessoas.py - le Metas_Equipe_EUBR_RevOps_v2.xlsx e gera public/api/metas-fy26.json

Fonte: data/metas/Metas_Equipe_EUBR_RevOps_v2.xlsx  (copiar xlsx atualizado pra la)
Uso:
  python scripts/sync/build_metas_pessoas.py          # dry-run
  python scripts/sync/build_metas_pessoas.py --apply  # grava JSON
"""
import json, sys, datetime
from pathlib import Path
import pandas as pd

ROOT  = Path(__file__).resolve().parents[2]
XLSX  = ROOT / "data" / "metas" / "Metas_Equipe_EUBR_RevOps_v2.xlsx"
OUT   = ROOT / "public" / "api" / "metas-fy26.json"

def s(v):
    if v is None: return ""
    if isinstance(v, float) and pd.isna(v): return ""
    return str(v).strip()

def num(v):
    t = s(v).replace("~","").replace("+","").replace("€","").replace("k","000").replace("≥","").replace("<","").replace("%","").strip()
    try: f = float(t); return int(f) if f == int(f) else f
    except: return None

SECTION_PREFIXES = ("🎯","📞","🌐","🌐","✅","🚫","🔑","🗓","📐","📥","📅","💰","🗂","EPI-USE")

# ── MARLISON ─────────────────────────────────────────────────────────────────
def build_marlison(xl):
    df = xl.parse("Marlison — SDR", header=None)
    metas = []
    SECOES = [
        # (secao_label, start_row, col_mensal_plena, periodo)
        ("Atividade Outbound",  9, 5, "diário"),
        ("Resultado",          17, 5, "mensal"),
        ("Presença Digital",   25, 2, "mensal"),
    ]
    for sec, start, cv, periodo in SECOES:
        for i in range(start, df.shape[0]):
            label = s(df.iat[i, 1])
            if not label or label.startswith(SECTION_PREFIXES) or label in ("META (SMART)","O QUE VALIDAR","Fonte"): break
            valor_raw = s(df.iat[i, cv])
            if not valor_raw or valor_raw == "nan": continue
            n = num(valor_raw)
            unidade = label.rsplit("/", 1)[-1].strip().rstrip(")") if "/" in label else ""
            metas.append({
                "responsavel": "Marlison Estrela",
                "area": "SDR · Prospecção (Marlison)",
                "label": label, "secao": sec,
                "valor": n if n is not None else valor_raw,
                "unidade": unidade, "periodo": periodo,
                "fonte": "Apollo / Zoho CRM",
                "status": "Alinhado", "status_fonte": "manual",
            })
    return metas

# ── BRUNA ─────────────────────────────────────────────────────────────────────
def build_bruna(xl):
    df = xl.parse("Bruna — MKT & CRM", header=None)
    metas = []
    for i in range(9, df.shape[0]):
        label = s(df.iat[i, 1])
        if not label or label.startswith(SECTION_PREFIXES) or label in ("META (SMART)","VALOR","Bruna"): continue
        valor = s(df.iat[i, 2])
        prazo = s(df.iat[i, 3]) if df.shape[1] > 3 else ""
        fonte = s(df.iat[i, 4]) if df.shape[1] > 4 else ""
        if not valor or valor in ("nan","VALOR","PRAZO"): continue
        metas.append({
            "responsavel": "Bruna Yamagami",
            "area": "Data Intelligence & CRM (Bruna)",
            "label": label, "valor": valor,
            "prazo": prazo, "fonte": fonte or "RD Station / HubSpot / Zoho",
            "status": "Alinhado", "status_fonte": "manual",
            "periodo": prazo.lower() if prazo else "mensal",
        })
    return metas

# ── ISABELA ───────────────────────────────────────────────────────────────────
def build_isabela(xl):
    df = xl.parse("Isabela — Eventos & MDF", header=None)
    metas = []
    for i in range(9, df.shape[0]):
        label = s(df.iat[i, 1])
        if not label or label.startswith(SECTION_PREFIXES) or label in ("META (SMART)","VALOR","Isabela"): continue
        valor = s(df.iat[i, 2])
        prazo = s(df.iat[i, 3]) if df.shape[1] > 3 else ""
        criterio = s(df.iat[i, 4]) if df.shape[1] > 4 else ""
        if not valor or valor in ("nan","VALOR","META","CRITÉRIO"): continue
        metas.append({
            "responsavel": "Isabela de Oliveira",
            "area": "Eventos & Field Marketing (Isabela)",
            "label": label, "valor": valor,
            "prazo": prazo, "criterio": criterio,
            "fonte": "Manual / relatório pós-evento",
            "status": "Alinhado", "status_fonte": "manual",
            "periodo": prazo.lower() if prazo else "anual",
        })
    return metas

# ── DESIGNER ──────────────────────────────────────────────────────────────────
def build_designer(xl):
    df = xl.parse("Designer — Visual", header=None)
    metas = []
    for i in range(9, df.shape[0]):
        label = s(df.iat[i, 1])
        if not label or label.startswith(SECTION_PREFIXES) or label in ("ENTREGÁVEL","PRAZO","Designer"): continue
        valor = s(df.iat[i, 2])
        prazo = s(df.iat[i, 3]) if df.shape[1] > 3 else ""
        criterio = s(df.iat[i, 4]) if df.shape[1] > 4 else ""
        if not valor or valor in ("nan","META","PRAZO"): continue
        metas.append({
            "responsavel": "Designer Pleno/Sênior",
            "area": "Envelopamento Visual (Designer)",
            "label": label, "valor": valor,
            "prazo": prazo, "criterio": criterio,
            "fonte": "Canva / entrega manual",
            "status": "Alinhado", "status_fonte": "manual",
            "periodo": prazo.lower() if prazo else "mensal",
        })
    return metas

# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    apply = "--apply" in sys.argv
    if not XLSX.exists():
        print(f"[ERRO] Planilha não encontrada: {XLSX}")
        print("Copie o xlsx atualizado para data/metas/ e rode novamente.")
        sys.exit(1)

    xl       = pd.ExcelFile(str(XLSX))
    marlison = build_marlison(xl)
    bruna    = build_bruna(xl)
    isabela  = build_isabela(xl)
    designer = build_designer(xl)
    metas    = marlison + bruna + isabela + designer

    por_status = {}
    for m in metas:
        k = m["status_fonte"]
        por_status[k] = por_status.get(k, 0) + 1

    out = {
        "fonte": "Metas Equipe RevOps EUBR FY27 — Marlison (SDR) · Bruna (MKT & CRM) · Isabela (Eventos) · Designer",
        "ano_fiscal": "FY27",
        "periodo_fiscal": "FY27",
        "gerado_em": datetime.datetime.now().isoformat(timespec="seconds"),
        "total_metas": len(metas),
        "responsaveis": ["Marlison Estrela", "Bruna Yamagami", "Isabela de Oliveira", "Designer Pleno/Sênior"],
        "areas": sorted({m["area"] for m in metas}),
        "por_status_fonte": por_status,
        "metas": metas,
    }

    print(f"\n[metas] Marlison: {len(marlison)} | Bruna: {len(bruna)} | Isabela: {len(isabela)} | Designer: {len(designer)} | TOTAL: {len(metas)}")
    for m in metas[:8]:
        print(f"  {m['area'][:30]:<30} {m['label'][:40]:<40} {str(m['valor'])[:15]}")
    if len(metas) > 8: print(f"  ... (+{len(metas)-8} metas)")

    if apply:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\n[metas] GRAVADO -> {OUT}")
    else:
        print(f"\n[metas] DRY-RUN (use --apply para gravar)")

if __name__ == "__main__":
    main()
