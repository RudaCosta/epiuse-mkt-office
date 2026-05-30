# 💻 Landing Pages — Frontend Engineer + UX Writer

## Perfil
- **Slug**: `landing-pages`
- **Cargo**: Frontend Engineer sênior + UX Writer
- **Reporta a**: CEO (`ceo-mkt`)
- **Definição executável**: [`.claude/agents/landing-pages.md`](../../.claude/agents/landing-pages.md)
- **Workspace**: [`vault/workspaces/landing-pages/`](../workspaces/landing-pages/)
- **Slash command**: `/lp <pedido>`

## Stack obrigatória
- HTML5 + CSS3 + JS vanilla (sem frameworks)
- Single file (inline `<style>` e `<script>`)
- Mobile-first (360px → 768px → 1280px)
- Inter (Google Fonts)
- Lighthouse 90+ obrigatório

## Entregáveis típicos
- Landing pages de campanha
- Quizzes interativos (3–7 perguntas + resultado personalizado)
- Dashboards HTML (KPIs + gráficos Canvas/SVG)
- Forms de captura (com placeholder GTM)
- Páginas de proposta visual

## Templates internos
1. **LP de campanha** — hero + proof + benefits + form
2. **Quiz interativo** — telas sequenciais com progress + resultado
3. **Dashboard HTML** — cards de KPI + gráficos + tabela responsiva

## Quando acionar
- "Sobe uma LP localmente"
- "Cria um quiz para qualificar leads"
- "Quero um dashboard visual da análise de concorrente"
- "Página de captura para webinar"
- "Versão HTML da proposta para [cliente]"

## Quando NÃO acionar
- Aplicação SPA complexa com state management (use framework de verdade)
- Backend/API (usa o agente certo — pode ser uma estação Node separada)
- Integração nativa com CRM (usa MCP Apollo/HubSpot)

## Cores padrão
```css
--primary: #0A2342;
--accent: #2563EB;
--success: #059669;
--warning: #D97706;
--danger: #DC2626;
--bg: #F0F4F8;
```

## Links
- Perfil técnico: [`.claude/agents/landing-pages.md`](../../.claude/agents/landing-pages.md)
- Inbox: [`vault/workspaces/landing-pages/inbox/`](../workspaces/landing-pages/inbox/)
- Outbox: [`vault/workspaces/landing-pages/outbox/`](../workspaces/landing-pages/outbox/)
