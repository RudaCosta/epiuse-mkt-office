#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""build_artigos_scores.py - calcula SEO/GEO reais p/ todos artigos e grava em artigos.json."""
import json, re, sys, datetime
from pathlib import Path

ROOT   = Path(__file__).resolve().parents[2]
ARTS   = ROOT / "public" / "api" / "artigos.json"
REPORT = ROOT / "data" / "metas" / "artigos_seo_geo_scores.json"

def calcular_seo_geo(a):
    titulo = a.get("titulo","") or ""
    url    = a.get("url","") or ""
    funil  = a.get("etapa_funil","") or ""
    lob    = a.get("linha_de_negocio","") or ""
    seo = 0
    tlen = len(titulo)
    if 45 <= tlen <= 65: seo += 25
    elif 35 <= tlen < 45 or 65 < tlen <= 75: seo += 15
    elif tlen < 35: seo += 5
    else: seo += 8
    slug = url.rstrip("/").split("/")[-1] if url else ""
    if 20 <= len(slug) <= 60: seo += 20
    elif len(slug) < 20: seo += 12
    else: seo += 8
    kws_sap = ["sap","s/4hana","hcm","signavio","successfactors","ariba","cloud","erp","crm","ia","inteligência","inteligencia","processo","btm","observabilidade"]
    kws = sum(1 for k in kws_sap if k in titulo.lower())
    seo += min(20, kws*5)
    if "Fundo" in funil: seo += 15
    elif "Meio" in funil: seo += 10
    else: seo += 5
    if re.search(r"\d+|%|ROI|SAP \w+|S/4", titulo): seo += 10
    else: seo += 3
    seo = min(100, seo)
    geo = 0
    if kws >= 2: geo += 30
    elif kws == 1: geo += 18
    else: geo += 5
    q = ["como","o que","por que","porque","quando","qual","quais","onde"]
    if any(w in titulo.lower() for w in q): geo += 25
    else: geo += 10
    nicho = ["SAP ERP","HCM","Signavio","ServiceNow","Observabilidade","BTM","Valcann"]
    if any(n in lob for n in nicho): geo += 20
    else: geo += 8
    rico = ["ebook","e-book","webinar","whitepaper","guia","relatório","relatorio","pesquisa"]
    if any(f in titulo.lower() for f in rico): geo += 15
    else: geo += 5
    if re.search(r"202[4-6]", titulo): geo += 10
    else: geo += 3
    geo = min(100, geo)
    return seo, geo

FUNDO = ["solicite","demo","consultoria","proposta","pricing","fale com especialista","agende","contratar","orçamento","orcamento","kick-off","kick off","go-live","go live","assine","adquira","solicitar demo"]
MEIO  = ["comparativo","roi","case de sucesso","case:","ebook","e-book","whitepaper","guia","como escolher","como migrar","como implementar","como reduzir","por que migrar","por que adotar","benefícios do","beneficios do","vantagens","redução de custos","reducao de custos","webinar","release h","novidades do","riscos de adiar","riscos ocultos"]
TOPO  = ["o que é","o que e","o que são","tendências","tendencias","o futuro","dia do","dia da","dia internacional","parceria","premiação","premiacao","prêmio","premio","retrospectiva","cobertura","aniversário","aniversario"]

def sugerir_funil(a):
    t = (a.get("titulo","") or "").lower()
    atual = a.get("etapa_funil","")
    if any(k in t for k in FUNDO): return "Fundo (Decisão)", "sinal de conversão/ação direta"
    if any(k in t for k in MEIO): return "Meio (Consideração)", "material de avaliação/comparação ou formato rico"
    if any(k in t for k in TOPO): return "Topo (Aprendizado)", "conteúdo educativo/evento/institucional"
    return atual, "sem sinal claro"

def main():
    apply = "--apply" in sys.argv
    d = json.load(open(ARTS, encoding="utf-8"))
    arts = d["artigos"]
    total = len(arts)
    scores, funil_changes = [], []
    for a in arts:
        seo, geo = calcular_seo_geo(a)
        scores.append({"id": a["id"], "seo": seo, "geo": geo})
        sug, razao = sugerir_funil(a)
        if sug != a.get("etapa_funil"):
            funil_changes.append({"id": a["id"], "titulo": a.get("titulo",""), "de": a.get("etapa_funil"), "para": sug, "razao": razao})
        if apply:
            a["seo_score"] = seo
            a["geo_score"] = geo
            a["score_metodo"] = "heuristica-v1"
            for k in ("score_antes","score_depois","ganho"): a.pop(k, None)
            if sug != a.get("etapa_funil"):
                a["etapa_funil_original"] = a.get("etapa_funil")
                a["etapa_funil"] = sug
    media_seo = round(sum(s["seo"] for s in scores)/total, 1)
    media_geo = round(sum(s["geo"] for s in scores)/total, 1)
    def dist(vals):
        return {"0-30":sum(1 for v in vals if v<=30),"31-50":sum(1 for v in vals if 31<=v<=50),"51-65":sum(1 for v in vals if 51<=v<=65),"66-80":sum(1 for v in vals if 66<=v<=80),"81+":sum(1 for v in vals if v>80)}
    report = {"fonte":"Estimativa heuristica SEO/GEO (titulo+url+funil+LOB).","gerado_em":datetime.datetime.now().isoformat(timespec="seconds"),"total":total,"media_seo":media_seo,"media_geo":media_geo,"distribuicao_seo":dist([s["seo"] for s in scores]),"distribuicao_geo":dist([s["geo"] for s in scores]),"scores":scores,"funil_reclassificacoes":funil_changes,"total_reclassificado":len(funil_changes)}
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    open(REPORT,"w",encoding="utf-8").write(json.dumps(report, ensure_ascii=False, indent=2))
    print("Total:",total,"| SEO medio:",media_seo,"| GEO medio:",media_geo)
    print("SEO dist:",report["distribuicao_seo"])
    print("GEO dist:",report["distribuicao_geo"])
    print("Funil reclassificado:",len(funil_changes))
    if apply:
        d["gerado_em"] = datetime.datetime.now().isoformat(timespec="seconds")
        d["scoring_seo_geo"] = {"media_seo":media_seo,"media_geo":media_geo,"metodo":"heuristica-v1"}
        open(ARTS,"w",encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2))
        print("[APPLY] artigos.json atualizado")
    else:
        print("[DRY-RUN] use --apply")

if __name__ == "__main__":
    main()
