#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""build_artigos_taxonomia.py — F3 da revisão de conteúdo (jul/2026).

Adiciona campos canônicos (lob, oferta, funil) aos artigos de
public/api/artigos.json usando a taxonomia mestra
public/api/taxonomia-conteudo.json, SEM tocar nos campos legados do Manus
(linha_de_negocio, etapa_funil, oferta_especifica etc. são read-only).

Método (Regra 6/7 — tudo etiquetado):
  1. alias determinístico  -> classificacao_metodo=heuristica, confianca=alta
  2. heurística por keywords (título+slug+url) -> heuristica, confianca=media
  3. fallback IA em lote (--ia, claude-haiku-4-5) -> ia, confianca=baixa
  Artigos com classificacao_metodo=humano NUNCA são sobrescritos.
  Toda classificação não-humana carrega classificacao_pendente_revisao=true.

Uso:
  python scripts/sync/build_artigos_taxonomia.py              # dry-run (só report)
  python scripts/sync/build_artigos_taxonomia.py --apply      # grava artigos.json
  python scripts/sync/build_artigos_taxonomia.py --apply --ia # + fallback Anthropic
  python scripts/sync/build_artigos_taxonomia.py --limit 50   # amostra

Report: data/metas/artigos_reclassificacao.json
"""
import json, sys, datetime
from pathlib import Path

ROOT   = Path(__file__).resolve().parents[2]
ARTS   = ROOT / "public" / "api" / "artigos.json"
TAXO   = ROOT / "public" / "api" / "taxonomia-conteudo.json"
REPORT = ROOT / "data" / "metas" / "artigos_reclassificacao.json"

# Mesma heurística de intenção do build_artigos_scores.py (fonte única do critério)
FUNDO = ["solicite","demo","consultoria","proposta","pricing","fale com especialista","agende","contratar","orçamento","orcamento","kick-off","kick off","go-live","go live","assine","adquira","solicitar demo"]
MEIO  = ["comparativo","roi","case de sucesso","case:","ebook","e-book","whitepaper","guia","como escolher","como migrar","como implementar","como reduzir","por que migrar","por que adotar","benefícios do","beneficios do","vantagens","redução de custos","reducao de custos","webinar","release h","novidades do","riscos de adiar","riscos ocultos"]
TOPO  = ["o que é","o que e","o que são","tendências","tendencias","o futuro","dia do","dia da","dia internacional","parceria","premiação","premiacao","prêmio","premio","retrospectiva","cobertura","aniversário","aniversario"]
POS   = ["renovação","renovacao","release notes","comunidade de clientes","programa de clientes"]


def load_taxonomia():
    t = json.load(open(TAXO, encoding="utf-8"))
    if t.get("status") not in ("vigente",):
        print(f"[warn] taxonomia status={t.get('status')!r} — classificação segue, mas valide antes de publicar")
    return t


def texto_de(a):
    return " ".join([
        a.get("titulo", "") or "",
        a.get("slug_atual", "") or "",
        a.get("url", "") or "",
    ]).lower()


def classificar_lob(a, taxo):
    """-> (slug|None, metodo, confianca)"""
    aliases = taxo["aliases"]["lob"]
    heur = taxo["heuristica_lob"]
    # 1. alias determinístico do campo legado
    legado = (a.get("linha_de_negocio") or "").strip()
    if legado in aliases and aliases[legado]:
        return aliases[legado], "heuristica", "alta"
    # 2. sinal secundário: linhas_de_negocio_multi (primeiro valor mapeável)
    multi = (a.get("linhas_de_negocio_multi") or "").split(",")
    for m in multi:
        m = m.strip()
        if m in aliases and aliases[m]:
            return aliases[m], "heuristica", "media"
    # 3. heurística por keywords, na ordem de avaliação (institucional antes de erp)
    txt = texto_de(a)
    for lob in heur["_ordem_avaliacao"]:
        if any(k in txt for k in heur[lob]):
            return lob, "heuristica", "media"
    return None, None, None


def classificar_oferta(a, taxo, lob):
    aliases = taxo["aliases"]["oferta"]
    legado = (a.get("oferta_especifica") or "").strip()
    if legado in aliases and aliases[legado]:
        return aliases[legado]
    txt = texto_de(a)
    # só ofertas do LOB detectado (evita falso positivo cross-LOB)
    for of in taxo["ofertas"]:
        if lob and of["lob"] != lob and not of.get("cross_lob"):
            continue
        if any(k in txt for k in of.get("keywords", [])):
            return of["slug"]
    return None


def classificar_funil(a, taxo):
    """Alias do rótulo Manus, corrigido pela heurística de intenção."""
    aliases = taxo["aliases"]["funil"]
    base = aliases.get((a.get("etapa_funil") or "").strip())
    t = (a.get("titulo") or "").lower()
    if any(k in t for k in POS):   return "pos", base
    if any(k in t for k in FUNDO): return "fundo", base
    if any(k in t for k in MEIO):  return "meio", base
    if any(k in t for k in TOPO):  return "topo", base
    return base, base


def classificar_ia(pendentes, taxo):
    """Fallback em lote via Anthropic (claude-haiku-4-5, convenção do repo).
    Retorna {id: {lob, oferta, funil}} validado contra os slugs da taxonomia."""
    try:
        from anthropic import Anthropic
    except ImportError:
        print("[ia] SDK anthropic não instalado — pip install anthropic. Pulando fallback IA.")
        return {}
    client = Anthropic()  # ANTHROPIC_API_KEY do env
    lobs = {l["slug"] for l in taxo["lobs"]}
    ofertas = {o["slug"] for o in taxo["ofertas"]}
    funis = {f["slug"] for f in taxo["funil"]}
    guia = "\n".join(f'- {l["slug"]}: {l["rotulo"]}' for l in taxo["lobs"])
    out = {}
    BATCH = 20
    for i in range(0, len(pendentes), BATCH):
        lote = pendentes[i:i+BATCH]
        itens = "\n".join(f'{a["id"]} :: {a.get("titulo","")}' for a in lote)
        prompt = (
            "Classifique cada artigo de blog da EPI-USE Brasil (consultoria SAP) "
            "por linha de negócio, oferta e etapa de funil.\n"
            f"LOBs válidos:\n{guia}\n"
            f"Funil válido: topo (aprendizado) | meio (consideração) | fundo (decisão) | pos (pós-venda).\n"
            "Responda SOMENTE um array JSON: "
            '[{"id": "...", "lob": "slug|null", "oferta": "slug|null", "funil": "slug"}]\n'
            f"Artigos (id :: título):\n{itens}"
        )
        try:
            resp = client.messages.create(
                model="claude-haiku-4-5",
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )
            txt = resp.content[0].text.strip()
            if txt.startswith("```"):
                txt = txt.strip("`").lstrip("json").strip()
            for item in json.loads(txt):
                lob = item.get("lob") if item.get("lob") in lobs else None
                of  = item.get("oferta") if item.get("oferta") in ofertas else None
                fu  = item.get("funil") if item.get("funil") in funis else None
                if lob or fu:
                    out[item["id"]] = {"lob": lob, "oferta": of, "funil": fu}
        except Exception as e:
            print(f"[ia] lote {i//BATCH+1} falhou: {e}")
    print(f"[ia] {len(out)}/{len(pendentes)} classificados via IA (etiquetados 'ia' + pendente_revisao)")
    return out


def recalc_agregados(arts):
    from collections import Counter
    def cnt(field):
        return dict(Counter(str(a.get(field)) for a in arts if a.get(field) is not None).most_common())
    return {
        "total": len(arts),
        # chaves legadas (artigos.html depende delas) — recontadas do array
        "por_etapa_funil": cnt("etapa_funil"),
        "por_linha_negocio": cnt("linha_de_negocio"),
        "por_oferta": cnt("oferta_especifica"),
        "por_regua_evento": cnt("regua_eventos"),
        # blocos canônicos novos
        "por_lob": cnt("lob"),
        "por_funil": cnt("funil"),
        "por_oferta_canonica": cnt("oferta"),
        "por_metodo": cnt("classificacao_metodo"),
        "nao_classificados": sum(1 for a in arts if not a.get("lob")),
        "pendentes_revisao": sum(1 for a in arts if a.get("classificacao_pendente_revisao")),
        "total_artigos": len(arts),
    }


def main():
    apply_ = "--apply" in sys.argv
    use_ia = "--ia" in sys.argv
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])

    taxo = load_taxonomia()
    d = json.load(open(ARTS, encoding="utf-8"))
    arts = d["artigos"][:limit] if limit else d["artigos"]
    now = datetime.datetime.now().isoformat(timespec="seconds")

    stats = {"alias": 0, "heuristica": 0, "ia": 0, "humano_preservado": 0, "sem_lob": 0}
    funil_divergencias, pendentes_ia = [], []

    for a in arts:
        if a.get("classificacao_metodo") == "humano":
            stats["humano_preservado"] += 1
            continue
        lob, metodo, conf = classificar_lob(a, taxo)
        funil, funil_manus = classificar_funil(a, taxo)
        oferta = classificar_oferta(a, taxo, lob)
        if funil and funil_manus and funil != funil_manus:
            funil_divergencias.append({"id": a["id"], "titulo": a.get("titulo", ""), "manus": funil_manus, "heuristica": funil})
        a_new = {
            "lob": lob, "oferta": oferta, "funil": funil,
            "classificacao_metodo": metodo, "classificacao_confianca": conf,
            "classificacao_em": now, "classificacao_pendente_revisao": True,
        }
        if lob is None:
            stats["sem_lob"] += 1
            pendentes_ia.append(a)
        elif conf == "alta":
            stats["alias"] += 1
        else:
            stats["heuristica"] += 1
        if apply_:
            a.update(a_new)

    if use_ia and pendentes_ia:
        ia_out = classificar_ia(pendentes_ia, taxo)
        for a in pendentes_ia:
            r = ia_out.get(a["id"])
            if not r:
                continue
            stats["ia"] += 1
            stats["sem_lob"] -= 1
            if apply_:
                a.update({
                    "lob": r["lob"], "oferta": r["oferta"], "funil": r["funil"] or a.get("funil"),
                    "classificacao_metodo": "ia", "classificacao_confianca": "baixa",
                    "classificacao_em": now, "classificacao_pendente_revisao": True,
                })

    from collections import Counter
    dist_lob = Counter()
    for a in arts:
        if apply_:
            dist_lob[a.get("lob") or "(sem lob)"] += 1
        else:
            lob, _, _ = classificar_lob(a, taxo)
            dist_lob[lob or "(sem lob)"] += 1

    report = {
        "fonte": "build_artigos_taxonomia.py — reclassificação canônica (heurística + IA etiquetada)",
        "gerado_em": now,
        "aplicado": apply_,
        "taxonomia_versao": taxo.get("versao"),
        "total": len(arts),
        "stats": stats,
        "distribuicao_lob": dict(dist_lob.most_common()),
        "funil_divergencias_manus_vs_heuristica": funil_divergencias,
        "fila_revisao_sem_lob": [{"id": a["id"], "titulo": a.get("titulo", "")} for a in arts if apply_ and not a.get("lob")],
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    open(REPORT, "w", encoding="utf-8").write(json.dumps(report, ensure_ascii=False, indent=2))

    print(f"Total: {len(arts)} | alias: {stats['alias']} | heurística: {stats['heuristica']} | IA: {stats['ia']} | sem lob: {stats['sem_lob']} | humano preservado: {stats['humano_preservado']}")
    print("Distribuição LOB:", dict(dist_lob.most_common()))
    print(f"Divergências de funil (Manus vs heurística): {len(funil_divergencias)}")
    print(f"Report: {REPORT}")

    if apply_:
        d["agregados"] = recalc_agregados(d["artigos"])
        d["taxonomia_versao"] = taxo.get("versao")
        d["reclassificado_em"] = now
        open(ARTS, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2))
        print("[APPLY] artigos.json atualizado (campos legados intocados, agregados recalculados)")
    else:
        print("[DRY-RUN] use --apply pra gravar")


if __name__ == "__main__":
    main()
