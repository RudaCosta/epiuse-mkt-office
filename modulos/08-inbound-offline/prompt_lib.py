#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
prompt_lib.py — Biblioteca de Prompts e Helpers de Geração (EPI-USE Brasil Offline)
"""
import os
import json
import re
import requests

OLLAMA = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
LLM = os.environ.get("LLM_MODEL", "qwen2.5:7b-instruct")

PERSONAS = {
    "cfo": {"nome": "CFO",
        "dor": "Reforma Tributaria (CBS/IBS em vigor em 2026, ano 2x mais complexo), fim do suporte ECC sem extensao, custo de processos manuais no financeiro, risco fiscal.",
        "pitch": "A sua infraestrutura de ERP esta preparada para a Reforma Tributaria ou seu time financeiro precisara de processos manuais?",
        "tom": "Numeros, risco quantificado, ROI, eficiencia. Zero jargao tecnico de TI; traduza tudo pra impacto financeiro. Hero number primeiro."},
    "chro": {"nome": "CHRO",
        "dor": "Experiencia do colaborador fragmentada, folha com erro (passivo trabalhista), retencao de talentos, RH operacional sem tempo pra estrategia.",
        "pitch": "Se sua empresa fosse um app, a experiencia dos colaboradores seria intuitiva ou eles o desinstalariam por ser frustrante?",
        "tom": "Gente primeiro, sistema depois. Casos concretos de experiencia do colaborador. SuccessFactors/HCM como meio, nao fim."},
    "cio": {"nome": "CIO",
        "dor": "Governanca de dados pra IA confiavel, Clean Core como pre-requisito de upgrades baratos (SAP Public Cloud), debito tecnico do ECC legado, integracao fragmentada.",
        "pitch": "Sua empresa investe em IA, mas seus dados e processos tem governanca suficiente para que as decisoes nao sejam baseadas em achismos operacionais?",
        "tom": "Arquitetura e trade-offs. Respeite a inteligencia tecnica do leitor. BTP/Clean Core/governanca com especificidade."},
}

def ollama(prompt, max_tokens=3000, temp=0.6):
    r = requests.post(f"{OLLAMA}/api/generate", json={
        "model": LLM, "prompt": prompt, "stream": False,
        "options": {"temperature": temp, "num_predict": max_tokens}
    }, timeout=300)
    r.raise_for_status()
    return r.json()["response"]

def parse_json(raw):
    s = raw.strip()
    s = re.sub(r"^```(json)?", "", s).strip()
    s = re.sub(r"```$", "", s).strip()
    a, b = s.find("{"), s.rfind("}")
    if a >= 0 and b > a:
        s = s[a:b+1]
    return json.loads(s)

def build_prompt(inp, persona_key, outputs, contexto):
    p = PERSONAS.get(persona_key)
    pedacos = []
    if outputs.get("post"):
        pedacos.append('"post": {"headline":"4-6 palavras com *destaque*","heroNumber":"numero do input ou null - NUNCA invente","context":"1 linha max 12 palavras","linkedinCopy":"PT-BR 3-5 linhas curtas, gancho na 1a linha, pergunta/CTA no fim, sem emoji","hashtags":"5-7 hashtags","distribution":"1 linha"}')
    if outputs.get("carousel"):
        pedacos.append('"carousel": {"cover":{"eyebrow":"ex GUIA CFO 2026","headline":"4-9 palavras com *destaque*","sub":"1 linha"},"slides":[4 itens {"tag":"PONTO 01","headline":"4-6 palavras com *destaque*","number":"so se no input senao \\"\\"","context":"1 linha ate 12 palavras","source":"instituto+ano se houver number senao \\"\\""}],"cta":{"headline":"verbo de acao com *destaque*","sub":"convite","url":"epiuse.com.br"}}')
    if outputs.get("single"):
        pedacos.append('"single": {"tag":"categoria","headline":"4-6 palavras com *destaque*","number":"se no input senao \\"\\"","context":"1 linha","source":"se houver number"}')
    if outputs.get("blogCover"):
        pedacos.append('"blogCover": {"eyebrow":"ex ARTIGO SAP S/4HANA","title":"titulo 6-10 palavras","sub":"subtitulo 1 linha"}')
    if outputs.get("article"):
        pedacos.append('"article": {"title":"titulo SEO 50-60 chars","intro":"abertura com a dor da persona","sections":[3-4 itens {"h2":"subtitulo","body":"2-3 paragrafos PT-BR especificos"}],"conclusion":"paragrafo final com CTA EPI-USE Brasil"}')

    ctx_block = ""
    if contexto:
        ctx_block = "\n\nCONTEXTO REAL (trechos de artigos publicados da EPI-USE - use pra ancorar a VOZ e os fatos, nao copie literal):\n" + \
            "\n".join(f"- [{c['titulo']}]: {c['chunk'][:600]}" for c in contexto)

    persona_block = (f"PERSONA-ALVO: {p['nome']}\nDOR: {p['dor']}\nPITCH: \"{p['pitch']}\"\nTOM: {p['tom']}"
                     if p else "PERSONA: detecte a melhor (CFO, CHRO ou CIO) pelo input.")

    return f"""Voce e o REDATOR B2B SENIOR do time de Marketing da EPI-USE Brasil.
EPI-USE Brasil: maior consultoria SAP HCM/Payroll do Brasil, 42+ anos (Group Elephant), evoluindo pra Transformacao Empresarial. 1% da receita vai pro ERP.ngo.

{persona_block}

REGRAS:
1. NUNCA invente numero/estatistica/fonte. So o que estiver no INPUT ou for fato publico (ECC fim 31/12/2027, Reforma Tributaria 2026). Sem dado = "".
2. PT-BR. Voz EPI-USE: sobria, confiante, especifica. Sem emoji. Sem "Hoje quero falar sobre".
3. Nunca cite concorrente nominal. Nunca cliente sem aprovacao.
4. Headline marca a palavra-chave com *asteriscos*.
5. No objeto 'estrategia', selecione e preencha exatamente UM valor para os campos: 'persona' (escolha entre cfo, chro ou cio), 'lob' (escolha entre HCM, S4HANA, BTP, Signavio, ServiceNow, Analytics ou Cross) e 'categoria' (escolha entre thought-leadership, case, produto, evento ou cultura). NUNCA coloque as barras ou a lista de opções inteira.
{ctx_block}

INPUT:
{inp}

Gere SOMENTE este JSON (sem markdown, sem texto antes/depois):
{{
  "estrategia": {{"persona":"cfo|chro|cio","dor":"dor atacada","angulo":"1 linha","lob":"HCM|S4HANA|BTP|Signavio|ServiceNow|Analytics|Cross","categoria":"thought-leadership|case|produto|evento|cultura"}},
  {",".join(pedacos)}
}}"""

def build_revisor(pacote, inp):
    return f"""Voce e o REVISOR SEO/GEO do time de Marketing da EPI-USE Brasil.
SEO: busca tradicional (Google BR). GEO: ser CITADO por LLMs (afirmacoes diretas, entidades nomeadas, perguntas respondidas).

CONTEUDO:
{json.dumps(pacote, ensure_ascii=False)[:4000]}

INPUT:
{inp[:1500]}

Gere SOMENTE este JSON:
{{
  "seo": {{"metaTitle":"50-60 chars com keyword","metaDescription":"140-155 chars com CTA","slug":"url-em-kebab","keywords":["5-8 keywords PT-BR"]}},
  "geo": {{"faq":[3 itens {{"q":"pergunta como executivo perguntaria a um LLM","a":"resposta direta 2-3 frases citavel com EPI-USE Brasil"}}],"ajustes":["ate 3 sugestoes or vazio"]}},
  "qualidade": {{"score":0-100,"alertas":["riscos: numero sem fonte, promessa absoluta, concorrente - ou vazio"]}}
}}"""
