# Auditoria — novo site epiuse.com.br (HubSpot CMS)

> Fonte: HubSpot MCP · portal 50204216 "EPI-USE Brasil" · leitura em 25/set/2026 · período de tráfego 25/ago–25/set/2026.
> Todos os números abaixo são **dados reais do HubSpot**. Nada foi alterado no portal.

## Raio-X

| Item | Valor real |
|---|---|
| Plano | STANDARD — Campanhas bloqueadas por plano (`REQUIRES_ACCOUNT_MODIFICATION`) |
| Onboarding do portal | Não concluído |
| Site pages | 22 (tema `EPI-USE_Theme`, prefixo `FY27_BR-PT_`) |
| Landing pages | 0 |
| Blog posts | 783 (migrados em lote em 03/set) |
| Forms HubSpot | 4 (Newsletter, 2 de comentários, Meetings) |
| Contatos no CRM | 2 (origem Offline, estágio Lead) |
| Deals | 0 |
| Pageviews (30d) | 1.988 · bounce 84% · 84 s/página |
| Pageviews por semana | W35 380 · W36 748 · W37 430 · W38 412 |

## 🔴 Críticos

1. ~~Formulário RD na Home~~ → **correto por decisão (25/set):** HubSpot é só CMS; leads e marketing ficam no RD e vendas no Zoho. O que precisa: integrar os dados (ver `modulos/23-visao-unica-funil/`) e confirmar o script do RD no header do tema.
2. **A página /404 é a 2ª mais vista (513 de 1.988 views, 26%).** As URLs do site antigo e os backlinks não foram redirecionados. Isso perde SEO e leads. Ação: exportar as URLs antigas (Search Console) e criar redirects 301 em massa (CSV em Settings → Domains & URLs).
3. **Conteúdo duplicado indexável:** `/artigo`, `/pt-br/artigo` e `50204216.hs-sites.com/pt-br/artigo` estão todos recebendo views. Ação: redirect de `/pt-br/*` → canônico e bloquear o domínio `hs-sites.com`.
4. **Links quebrados ou placeholder na Home:**
   - card "Implementação e Conversão" aponta para `https://www.google.com/`
   - cards AMS, EPI-USE Labs, SAP HCM Cloud e "Evolução e Otimização" estão sem link
   - botão do header "Talk to an expert" em inglês e sem link
   - rodapé com texto "Lorem" e item "Title"
   - botões "Learn more" em inglês

## 🟡 Importantes

5. **Posts de ebook/webinar/relatório sem gate** (IDC, ISG, Guia RH Estratégico). Criar LP **no RD** e linkar a partir do post. São o maior ativo de captura e hoje estão parados.
6. **Blog com conteúdo velho:** Covid, Sapphire 2017–2020, releases 2020, Natal. Isso dilui a autoridade. Proposta: revisar os ~783 posts → **manter/atualizar** (evergreen de RH, S/4, eSocial), **consolidar** (releases → 1 hub) ou **despublicar + 301** (datados).
7. **2 rascunhos placeholder** "O título do seu post do blog aqui..." (criados em 16/set) — apagar.
8. **Bounce de 84% na Home** (811 views): o hero só tem o CTA "Falar com um especialista" (âncora #formulario). Faltam prova social acima da dobra, CTA por dor/LOB e um CTA secundário de conteúdo.
9. **Páginas de produto com pouco tráfego** (SuccessFactors 34, S/4 25, LeanIX 17 com 100% de bounce). Faltam CTA e form nativo em cada página de solução.

## 🟢 Oportunidades

- **Cases performam:** a listagem /cases tem 50% de bounce e o Case DPSP tem ~18 min/página. Vale colocar cases na Home e em cada página de solução.
- **Post SAP+ServiceNow** tem 313 s/página, o melhor engajamento em artigo. É o modelo a replicar no pipeline de conteúdo.
- **AEO (buscas em IA):** o MCP tem métricas de AEO (menções e citações em ChatGPT, Gemini e Perplexity) — a verificar se o plano Standard inclui.
- **Integração com o Office:** conteúdo e analytics do HubSpot → `/relatorio` (substitui os placeholders "⏳ Aguarda integração" do site).

## O que eu consigo executar via MCP (com aprovação)

| Ação | Tool |
|---|---|
| Corrigir links, textos Lorem e botões em inglês nas páginas | `manage_website_page` SET_MODULE_FIELDS |
| Title e meta description de todas as 22 páginas | SET_METADATA |
| Trocar o embed do RD por um form HubSpot nativo | INSERT `@hubspot/form` |
| Criar LPs com gate para os ebooks/relatórios | `manage_landing_page` |
| Reescrever, atualizar ou despublicar posts antigos | `manage_blog_post` |
| Criar posts via pipeline de conteúdo (pipe-artigo) | `manage_blog_post` CREATE (rascunho) |
| Criar segmentos e e-mails de nutrição | `manage_segment` / `manage_marketing_email` |
| Relatório semanal de tráfego/conversão no Office | `get_content_analytics_report` |

**Não dá via MCP:** redirects 301, configuração de domínio e robots, criação de forms (FORM é só leitura). Esses passos são manuais no painel.
