# Changelog — Área Intelligence

## v1.0 · 03/out/2026
- `/area/intelligence` sai do template genérico `area.html` e ganha página própria na linguagem do `/onboarding`: fundo com rede de dados animada, hero com anel de atribuição, hub de fontes com partículas, gauges de metas, saúde da base Zoho, donut de origens, deals por mês, audiência, roadmap e ferramentas com tilt.
- Home do `zoho-leads-snapshot.json` (antes não exibido em nenhuma tela).
- Tracking "quem viu o quê" (`kind='intel'`) + painel owner-only `/admin/intelligence`.

## v1.1 · 03/out/2026 — página de trabalho
- Feedback Rudá: v1.0 tinha "cara de página de apresentação"; a Bruna precisa trabalhar nela.
- **Atalhos no topo:** ferramentas da área + "Do dia a dia" (Brindes, UTM & Links, Meus Links, Campanhas, Loja), lidos do `personas.json` — os mesmos da Home dela.
- **Recuperado da página antiga:** lista de pedidos/entregas do agente (ex.: auditoria do site HubSpot), que na v1.0 virou só contagem.
- **Nova fila "Precisa de atenção"** derivada dos dados (higiene, fontes paradas, metas sem fonte).
- Topo compacto com frescor das 4 fontes; dados em **abas** (Saúde · Atribuição · Deals · Audiência · Fontes); números e metas compactos.
- Saúde da base sem os cards de achados (agora ficam só na fila). Painel `/admin/intelligence` com rótulos dos novos blocos.
- Seção "Workflows" da página antiga não voltou: `/api/workflows` está desligado (Cowork, 503) e ela já vinha vazia em produção.

