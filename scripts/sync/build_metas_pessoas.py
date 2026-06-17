#!/usr/bin/env python3
"""
build_metas_pessoas.py - le os 2 xlsx de metas (Bruna Yamagami / Data Intelligence
e Marlison / SDR Prospeccao) e gera public/api/metas-fy26.json estruturado.

Substitui as metas antigas (area-KPI FY26) pelas metas das duas pessoas.
Backup do json antigo fica em vault-backups/ (feito fora deste script).

Uso:  python scripts/sync/build_metas_pessoas.py [--apply]
      (sem --apply = dry-run, mostra resumo e nao grava)
"""
import json, sys, datetime
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "api" / "metas-fy26.json"
BRUNA = r"C:\Users\Ruds\Desktop\ROADMAP MKT OFFICE JUN 2026\.goals\Metas_SMART_Bruna_Yamagami_FY27.xlsx"
MARLISON = r"C:\Users\Ruds\Desktop\ROADMAP MKT OFFICE JUN 2026\.goals\Projeção - Metas MART + Prospeccao BIZDEV.xlsx"

def s(v):
    if v is None: return ""
    if isinstance(v, float) and pd.isna(v): return ""
    return str(v).strip()

def iso(v):
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.strftime("%Y-%m-%d")
    t = s(v)
    return "" if t in ("-", "") else t

def num(v):
    try:
        f = float(v)
        return int(f) if f == int(f) else f
    except (TypeError, ValueError):
        return None

# ---------- BRUNA: Data Intelligence & CRM ----------
def build_bruna():
    xl = pd.ExcelFile(BRUNA)
    painel = xl.parse("📊 Painel", header=None)
    smart = xl.parse("📋 Metas SMART", header=None)
    # SMART aba: header na linha 3, dados de 4 em diante. col0=#, 3=S,4=M,5=A,6=R,7=T,8=KPIs
    smart_by_id = {}
    for i in range(4, smart.shape[0]):
        rid = s(smart.iat[i, 0])
        if not rid: continue
        smart_by_id[rid] = {
            "especifico": s(smart.iat[i, 3]), "mensuravel": s(smart.iat[i, 4]),
            "atingivel": s(smart.iat[i, 5]), "relevante": s(smart.iat[i, 6]),
            "temporal": s(smart.iat[i, 7]), "kpis": s(smart.iat[i, 8]),
        }
    metas = []
    # Painel: header na linha 7, dados 8+. col0=#,1=objetivo,2=horizonte,3=prazo,5=status,6=%,7=obs,8=proxima
    for i in range(8, painel.shape[0]):
        rid = s(painel.iat[i, 0])
        objetivo = s(painel.iat[i, 1])
        if not rid or not objetivo: continue
        pct = num(painel.iat[i, 6]) or 0
        sm = smart_by_id.get(rid, {})
        metas.append({
            "responsavel": "Bruna Yamagami",
            "area": "Data Intelligence & CRM (Bruna)",
            "id": rid,
            "submeta": "." in rid or rid.startswith("B"),
            "label": objetivo,
            "horizonte": s(painel.iat[i, 2]),
            "prazo": iso(painel.iat[i, 3]),
            "status": s(painel.iat[i, 5]) or "Não Iniciado",
            "valor": pct, "unidade": "%", "periodo": "projeto",
            "kpis": sm.get("kpis", ""),
            "smart": {k: sm.get(k, "") for k in ("especifico","mensuravel","atingivel","relevante","temporal")},
            "obs": s(painel.iat[i, 7]),
            "proxima_acao": s(painel.iat[i, 8]),
            "fonte": "Metas SMART FY27 (Bruna)",
            "status_fonte": "manual",
        })
    return metas

# ---------- MARLISON: SDR / Prospeccao ----------
def build_marlison():
    xl = pd.ExcelFile(MARLISON)
    sm = xl.parse("Metas SMART", header=None)
    # Frentes SMART: header linha 2, dados 3-8. col0=Frente,1=Meta(S),2=Indicador(M),3=Como(A),4=PorQue(R),5=Prazo(T)
    frentes = {}
    for i in range(3, 9):
        fr = s(sm.iat[i, 0])
        if not fr: continue
        frentes[fr.lower()] = {
            "meta_s": s(sm.iat[i, 1]), "indicador": s(sm.iat[i, 2]),
            "como": s(sm.iat[i, 3]), "porque": s(sm.iat[i, 4]), "prazo_t": s(sm.iat[i, 5]),
        }
    # Metas Diarias (referencia): bloco a partir da linha 12. col0=Frente,1=Diaria,2=Mensal
    diarias = []
    start = None
    for i in range(sm.shape[0]):
        if s(sm.iat[i, 0]).lower().startswith("frente") and num(sm.iat[i, 1]) is None and i > 5:
            start = i + 1; break
    if start:
        for i in range(start, sm.shape[0]):
            fr = s(sm.iat[i, 0]); d = num(sm.iat[i, 1]); m = num(sm.iat[i, 2])
            if not fr or d is None: continue
            diarias.append((fr, d, m))
    # casa cada KPI diario com a frente SMART (match por palavra-chave)
    def match_frente(nome):
        n = nome.lower()
        for k, v in frentes.items():
            if k in n or n.split(" ")[0] in k: return v
        if "ligaç" in n or "ligac" in n: return frentes.get("ligações") or frentes.get("ligacoes")
        if "reuni" in n: return frentes.get("reuniões qualificadas") or frentes.get("reunioes qualificadas")
        if "handover" in n: return frentes.get("handover para ae")
        return {}
    metas = []
    cat = {"Ligações":"sdr_ligacoes","WhatsApp":"sdr_whatsapp","LinkedIn - Conexões":"sdr_li_conexoes",
           "LinkedIn - Mensagens":"sdr_li_msgs","Email":"sdr_email","Reuniões Qualificadas":"sdr_reunioes",
           "Handover para AE":"sdr_handover"}
    unid = {"Ligações":"ligações","WhatsApp":"msgs","LinkedIn - Conexões":"conexões",
            "LinkedIn - Mensagens":"msgs","Email":"emails","Reuniões Qualificadas":"reuniões","Handover para AE":"handovers"}
    for fr, d, m in diarias:
        fdef = match_frente(fr)
        metas.append({
            "responsavel": "Marlison (SDR)",
            "area": "SDR · Prospecção (Marlison)",
            "label": fr,
            "valor": d, "valor_mes": m, "unidade": unid.get(fr, ""),
            "periodo": "diário",
            "kpis": fdef.get("indicador", ""),
            "meta_s": fdef.get("meta_s", ""),
            "como": fdef.get("como", ""), "porque": fdef.get("porque", ""),
            "categoria": cat.get(fr, "sdr_outro"),
            "fonte": "Apollo/Zoho (manual)",
            "status": "Alinhado",
            "status_fonte": "manual",
        })
    return metas

def main():
    apply = "--apply" in sys.argv
    bruna = build_bruna()
    marlison = build_marlison()
    metas = marlison + bruna
    out = {
        "fonte": "Metas pessoais FY27 — Bruna Yamagami (Data Intelligence & CRM) + Marlison (SDR/Prospecção BIZDEV)",
        "ano_fiscal": "FY27",
        "periodo_fiscal": "FY27",
        "gerado_em": datetime.datetime.now().isoformat(timespec="seconds"),
        "total_metas": len(metas),
        "responsaveis": ["Marlison (SDR)", "Bruna Yamagami"],
        "areas": sorted({m["area"] for m in metas}),
        "por_status_fonte": {"manual": len(metas)},
        "metas": metas,
    }
    print(f"[metas-pessoas] Marlison: {len(marlison)} KPIs | Bruna: {len(bruna)} metas | total {len(metas)}")
    for m in marlison:
        print(f"  SDR  {m['label']:<24} {m['valor']}/dia · {m.get('valor_mes')}/mês")
    for m in bruna[:6]:
        print(f"  DI   {m['id']:<4} {m['label'][:40]:<42} {m['status']} {m['valor']}%")
    print(f"  ... (+{max(0,len(bruna)-6)} metas Bruna)")
    if apply:
        OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[metas-pessoas] GRAVADO em {OUT}")
    else:
        print("[metas-pessoas] DRY-RUN (use --apply para gravar)")

if __name__ == "__main__":
    main()
