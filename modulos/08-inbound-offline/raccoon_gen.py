#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
raccoon_gen.py — CLI para geração offline de pautas, propostas e copies.
Utiliza prompt_lib e rag localmente.
"""
import argparse
import sys
import json
import os

# Ajusta path para importar o módulo local
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import rag
from prompt_lib import PERSONAS, build_prompt, build_revisor, parse_json, ollama, LLM

def main():
    parser = argparse.ArgumentParser(description="Offline Rax Content Generator CLI")
    parser.add_argument("--tema", type=str, required=True, help="Tema ou pauta a ser redigida")
    parser.add_argument("--persona", type=str, default="auto", choices=["auto", "cfo", "chro", "cio"], help="Persona alvo")
    parser.add_argument("--lob", type=str, default=None, help="Linha de negócio específica (opcional)")
    parser.add_argument("--article", action="store_true", help="Gera artigo completo")
    parser.add_argument("--post", action="store_true", help="Gera post de LinkedIn")
    parser.add_argument("--carousel", action="store_true", help="Gera slides de carrossel")
    parser.add_argument("--single", action="store_true", help="Gera post único")
    parser.add_argument("--json", action="store_true", help="Força saída em JSON puro (padrão)")

    args = parser.parse_args()

    # Validação da persona
    persona_key = args.persona.lower()
    if persona_key not in PERSONAS and persona_key != "auto":
        persona_key = "auto"

    # RAG — Recuperação de artigos relacionados
    contexto = []
    try:
        contexto = rag.retrieve(args.tema, k=4, lob=args.lob)
    except Exception as e:
        print(f"[raccoon_gen] RAG indisponível: {e}", file=sys.stderr)

    # Determina saídas desejadas
    outputs = {
        "article": args.article,
        "post": args.post,
        "carousel": args.carousel,
        "single": args.single
    }
    # Se nenhum formato foi explicitado, gera os três principais por padrão
    if not any(outputs.values()):
        outputs = {"article": True, "post": True, "carousel": True}

    # 1. Redação do Conteúdo
    try:
        prompt_redator = build_prompt(args.tema, persona_key, outputs, contexto)
        max_tokens = 6000 if outputs.get("article") else 3000
        gen_raw = ollama(prompt_redator, max_tokens=max_tokens)
        pacote = parse_json(gen_raw)
    except Exception as e:
        err_res = {"success": False, "error": f"Erro na geração do Redator: {e}"}
        print(json.dumps(err_res, ensure_ascii=False))
        sys.exit(1)

    # 2. Revisão SEO/GEO
    revisao = None
    try:
        prompt_revisor = build_revisor(pacote, args.tema)
        revisao_raw = ollama(prompt_revisor, max_tokens=1800, temp=0.4)
        revisao = parse_json(revisao_raw)
    except Exception as e:
        print(f"[raccoon_gen] Falha na revisão SEO/GEO: {e}", file=sys.stderr)

    # Fontes formatadas
    fontes = [{"titulo": c["titulo"], "url": c["url"], "score": round(c["score"], 3)} for c in contexto]

    # Atributos planos para compatibilidade com o banco (content_pipeline)
    corpo = ""
    if pacote.get("article"):
        art = pacote["article"]
        corpo = f"<h1>{art.get('title', '')}</h1><p class='intro'>{art.get('intro', '')}</p>" + \
                "".join(f"<h2>{sec.get('h2', '')}</h2><p>{sec.get('body', '')}</p>" for sec in art.get('sections', [])) + \
                f"<p class='conclusion'>{art.get('conclusion', '')}</p>"
    elif pacote.get("single"):
        corpo = pacote["single"].get("context", "")

    copy_text = pacote.get("post", {}).get("linkedinCopy", "") if pacote.get("post") else ""

    cta_sugerido = ""
    if pacote.get("carousel") and pacote["carousel"].get("cta"):
        cta = pacote["carousel"]["cta"]
        cta_sugerido = f"{cta.get('headline', '')} - {cta.get('sub', '')}"

    # Resposta final consolidada
    result = {
        "success": True,
        "corpo": corpo,
        "copy_text": copy_text,
        "cta_sugerido": cta_sugerido,
        **pacote,
        "revisao": revisao,
        "fontes_rag": fontes,
        "etiqueta": "🤖 Gerado por IA local (Qwen2.5 offline) — revisar",
        "motor": f"{LLM} + RAG {len(contexto)} fontes"
    }

    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
