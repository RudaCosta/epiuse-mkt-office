# Decisões — Cafezinho

## 03/out/2026 · Tracking
- **Reaproveitar o módulo 17 pra aberturas e tempo.** `analytics_events` já loga `/cafezinho` server-side com histórico; duplicar seria ruído. A tabela nova `cafe_tracking` guarda só o "viu o quê".
- **"Viu" = tempo mínimo na tela** (IntersectionObserver), não carregamento da página. Cartão: 60%/1,2s. Post: 50%/1,5s. Seção: cabeçalho 100%/0,8s (seção alta nunca bate ratio alto). Evento de visualização é 1x por carregamento.
- **Gate estrito, 404 em vez de 403.** Pedido explícito: só o perfil do Rudá. Sem fallback de editor token. 404 esconde que o painel existe.
- **URL do painel só sai do servidor** (`feed.painel` pro dono). Nem menu, nem HTML/JS público.
- **HTML do painel em `private/`**, fora do `express.static`.
- **Meus acessos fora por padrão** no painel (toggle "Incluir meus acessos").

## 03/out/2026 · Visual
- Mesma linguagem do `/onboarding` (pedido do Rudá). Tudo com tokens do DESIGN.md; transparências via `color-mix`.
- Animação de entrada nunca usa `transform` em elemento que é posicionado por `transform` (roda do zodíaco usa `scale`; cartões têm camadas separadas pra entrada, tilt e flip).
- `data-tip` é estilizado globalmente fora da página (forçava `position:relative`); a linha do ano usa `data-nv`.
