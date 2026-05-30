#!/usr/bin/env python3
"""
sync_metas_fy26.py — v0.5.1
Lê o docx oficial "Metas EPI-USE FY26.docx" → public/api/metas-fy26.json

Cada meta vira um objeto estruturado com:
- area · meta_label · valor_meta · periodo · unidade
- fonte_dado_real (qual API/script alimenta o "realizado")
- categoria_match (chave pra cruzar com dados ao vivo)

Uso:
  python scripts/sync/sync_metas_fy26.py
"""
import json, os, sys
from pathlib import Path

CANDIDATES = [
    r"G:/Meu Drive/Claude MKT EUBR/vault/00-contexto/metas/metas-fy26-oficial.docx",
    r"C:/Users/Ruds/OneDrive - EPI USE BRASIL SERVIÇOS EM SISTEMAS LTDA/MARKETING/Planejamento/2025/Metas EPI-USE FY26.docx",
]

OUT = Path(__file__).resolve().parents[2] / "public" / "api" / "metas-fy26.json"


def find():
    for p in CANDIDATES:
        if os.path.exists(p): return p
    return None


def main():
    fp = find()
    if not fp:
        print("ERRO: docx FY26 não encontrado.")
        sys.exit(1)
    print(f"[metas-fy26] lendo {fp}")

    try:
        from docx import Document
    except ImportError:
        print("ERRO: python-docx não instalado. Rode: pip install python-docx")
        sys.exit(1)

    doc = Document(fp)
    # Parse simples: cada parágrafo é uma meta OU um header de área
    # Estruturado a partir da leitura prévia (40 KPIs em 6 áreas):
    AREAS_DETECTADAS = [
        "Aquisição e Geração de Demanda",
        "Conteúdo",
        "Branding",
        "Relacionamento",
        "Programas Especiais",
        "Eventos",
        "Branding/Premiações",
    ]
    metas = []
    area_atual = None
    for p in doc.paragraphs:
        t = p.text.strip()
        if not t: continue
        # Detecta header de área
        if t in AREAS_DETECTADAS or t == "EPI-USE FY26 - Marketing":
            area_atual = t if t in AREAS_DETECTADAS else area_atual
            continue
        if not area_atual: continue
        # Trata sub-itens hierárquicos (ex: "2 SAP ERP" abaixo de "9 cases")
        metas.append({
            "area": area_atual,
            "texto": t,
            "_raw": t,
        })

    # Classificação manual em dados estruturados (mapeia cada texto pra valor + unidade + fonte)
    # Esta é a parte que faz a tela /metas ter números trabalháveis ao invés de só texto
    METAS_STRUCT = [
        # AQUISIÇÃO E GERAÇÃO DE DEMANDA
        {"area": "Aquisição & Demanda", "label": "Leads/mês", "valor": 60, "valor_ano": 720, "unidade": "leads", "periodo": "mensal", "fonte": "Apollo/CRM (pending)", "categoria": "leads_mes", "status_fonte": "pending"},
        {"area": "Aquisição & Demanda", "label": "Oportunidades/mês", "valor": 5, "valor_ano": 60, "unidade": "ops", "periodo": "mensal", "fonte": "CRM (pending)", "categoria": "ops_mes", "status_fonte": "pending"},
        {"area": "Aquisição & Demanda", "label": "Reuniões/mês", "valor": 8, "valor_ano": 96, "unidade": "reuniões", "periodo": "mensal", "fonte": "Apollo + Calendar (pending)", "categoria": "reunioes_mes", "status_fonte": "pending"},
        {"area": "Aquisição & Demanda", "label": "Ligações/mês", "valor": 40, "valor_ano": 480, "unidade": "ligações", "periodo": "mensal", "fonte": "Apollo (pending)", "categoria": "ligacoes_mes", "status_fonte": "pending"},
        {"area": "Aquisição & Demanda", "label": "E-mails enviados", "valor": 200, "valor_ano": 2400, "unidade": "emails", "periodo": "mensal", "fonte": "Apollo Emailer (pending)", "categoria": "emails_mes", "status_fonte": "pending"},
        {"area": "Aquisição & Demanda", "label": "CRM atualizado", "valor": 100, "unidade": "%", "periodo": "constante", "fonte": "CRM (pending)", "categoria": "crm_health", "status_fonte": "pending"},
        {"area": "Aquisição & Demanda", "label": "Vendas origem MKT/ano", "valor": 10, "unidade": "vendas", "periodo": "anual", "fonte": "CRM (pending)", "categoria": "vendas_mkt_ano", "status_fonte": "pending"},
        {"area": "Aquisição & Demanda", "label": "Tráfego site (ano)", "valor": 70000, "unidade": "users", "periodo": "anual", "fonte": "Google Analytics (Bloco D)", "categoria": "site_users_ano", "status_fonte": "aguarda_integracao"},
        {"area": "Aquisição & Demanda", "label": "Crescimento views mensais", "valor": 40, "unidade": "%", "periodo": "anual", "fonte": "GA4 (Bloco D)", "categoria": "site_views_mom", "status_fonte": "aguarda_integracao"},
        {"area": "Aquisição & Demanda", "label": "Tráfego orgânico", "valor": 60, "unidade": "% do total", "periodo": "anual", "fonte": "GA4 (Bloco D)", "categoria": "trafego_organico_pct", "status_fonte": "aguarda_integracao"},
        {"area": "Aquisição & Demanda", "label": "Tráfego paid", "valor": 40, "unidade": "% do total", "periodo": "anual", "fonte": "GA4 (Bloco D)", "categoria": "trafego_paid_pct", "status_fonte": "aguarda_integracao"},

        # CONTEÚDO
        {"area": "Conteúdo", "label": "Conteúdos únicos/mês", "valor": 24, "valor_ano": 288, "unidade": "conteúdos", "periodo": "mensal", "fonte": "Calendar Duda (B2 pendência)", "categoria": "conteudos_mes", "status_fonte": "aguarda_integracao", "detalhe": "20 Redatoria + 4 MKT"},
        {"area": "Conteúdo", "label": "Ebooks", "valor": 2, "unidade": "ebooks", "periodo": "anual", "fonte": "manual (RD/HubSpot)", "categoria": "ebooks_ano", "status_fonte": "manual"},
        {"area": "Conteúdo", "label": "Posts com colaboradores/mês", "valor": 10, "valor_ano": 120, "unidade": "posts", "periodo": "mensal", "fonte": "Voices post_tracker (parcial)", "categoria": "posts_colaboradores_mes", "status_fonte": "parcial"},

        # BRANDING
        {"area": "Branding", "label": "Seguidores LinkedIn", "valor": 15000, "unidade": "seguidores", "periodo": "anual (acumulado)", "fonte": "xls Sergio + linkedin-historical", "categoria": "linkedin_seguidores_totais", "status_fonte": "real"},
        {"area": "Branding", "label": "Seguidores Instagram", "valor": 3000, "unidade": "seguidores", "periodo": "anual", "fonte": "Instagram Graph API (pending)", "categoria": "instagram_seguidores_totais", "status_fonte": "aguarda_integracao"},

        # RELACIONAMENTO
        {"area": "Relacionamento", "label": "Cases de sucesso/ano", "valor": 9, "unidade": "cases", "periodo": "anual", "fonte": "OneDrive Roberto via sync_cases", "categoria": "cases_publicados_ano", "status_fonte": "real"},
        {"area": "Relacionamento", "label": "Cases SAP ERP (S/4, RISE)", "valor": 2, "unidade": "cases", "periodo": "anual", "fonte": "cases.linha_negocio=SAP ERP", "categoria": "cases_sap_erp_ano", "status_fonte": "real"},
        {"area": "Relacionamento", "label": "Cases SAP SuccessFactors", "valor": 4, "unidade": "cases", "periodo": "anual", "fonte": "cases.linha_negocio=SuccessFactors", "categoria": "cases_successfactors_ano", "status_fonte": "real"},
        {"area": "Relacionamento", "label": "Cases WorkForce Software", "valor": 1, "unidade": "cases", "periodo": "anual", "fonte": "cases.linha_negocio=WorkForce", "categoria": "cases_workforce_ano", "status_fonte": "real"},
        {"area": "Relacionamento", "label": "Cases ServiceNow", "valor": 1, "unidade": "cases", "periodo": "anual", "fonte": "cases.linha_negocio=ServiceNow", "categoria": "cases_servicenow_ano", "status_fonte": "real"},
        {"area": "Relacionamento", "label": "Cases Process Excellence", "valor": 1, "unidade": "cases", "periodo": "anual", "fonte": "cases.linha_negocio=Process", "categoria": "cases_process_ano", "status_fonte": "real"},
        {"area": "Relacionamento", "label": "Empresas Transformadoras gravadas", "valor": 6, "unidade": "gravações", "periodo": "anual", "fonte": "manual (planilha Roberto)", "categoria": "transformadoras_ano", "status_fonte": "manual"},

        # PROGRAMAS ESPECIAIS
        {"area": "Programas Especiais", "label": "Programas de incentivo", "valor": 2, "unidade": "programas", "periodo": "anual", "fonte": "manual", "categoria": "programas_incentivo_ano", "status_fonte": "manual"},

        # EVENTOS
        {"area": "Eventos", "label": "Execução dos eventos planejados", "valor": 100, "unidade": "%", "periodo": "anual", "fonte": "events.json + checklist", "categoria": "eventos_execucao_pct", "status_fonte": "manual"},
        {"area": "Eventos", "label": "SLA cobertura redes pós-evento", "valor": 24, "unidade": "horas máx", "periodo": "por evento", "fonte": "manual (post_tracker)", "categoria": "eventos_sla_cobertura_h", "status_fonte": "manual"},
        {"area": "Eventos", "label": "Eventos próprios EPI-USE", "valor": 2, "unidade": "eventos", "periodo": "anual", "fonte": "events.json type=proprio", "categoria": "eventos_proprios_ano", "status_fonte": "real"},

        # BRANDING / PREMIAÇÕES
        {"area": "Branding/Premiações", "label": "Reconhecimentos SAP", "valor": 4, "unidade": "prêmios", "periodo": "anual", "fonte": "manual (planilha reconhecimentos)", "categoria": "reconhecimentos_sap_ano", "status_fonte": "manual"},
        {"area": "Branding/Premiações", "label": "Reconhecimentos analistas (ISG/Gartner/Forrester/IDC/Top of Mind)", "valor": 2, "unidade": "prêmios", "periodo": "anual", "fonte": "manual", "categoria": "reconhecimentos_analistas_ano", "status_fonte": "manual"},
    ]

    # Agregados úteis pra UI
    from collections import Counter
    payload = {
        "fonte": fp,
        "ano_fiscal": "FY26",
        "periodo_fiscal": "mar/2025 a fev/2026",  # FY EPI-USE — confirmar com Rudá
        "gerado_em": __import__("datetime").datetime.now().isoformat(),
        "total_metas": len(METAS_STRUCT),
        "areas": sorted(set(m["area"] for m in METAS_STRUCT)),
        "por_status_fonte": dict(Counter(m["status_fonte"] for m in METAS_STRUCT)),
        "raw_texto_docx": [m["texto"] for m in metas],
        "metas": METAS_STRUCT,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[metas-fy26] OK · {len(METAS_STRUCT)} metas · {OUT.stat().st_size//1024}KB")
    print(f"[metas-fy26] status_fonte: {payload['por_status_fonte']}")
    print(f"[metas-fy26] áreas: {payload['areas']}")


if __name__ == "__main__":
    main()
