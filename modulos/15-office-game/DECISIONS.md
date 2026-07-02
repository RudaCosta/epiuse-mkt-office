# Decisões — Módulo 15 · Office Game

## 02/jul/2026 — v3.0 "Fable Edition"

1. **Engine compartilhado em vez de 2 arquivos duplicados.** As v1 eram ~1104 linhas 95% idênticas (engine copiado). A v3 extrai os sistemas pra `public/js/office-engine-v3.js` e deixa cada HTML só com o `window.WORLD` (conteúdo). Corrigir um bug do engine agora é 1 lugar.
2. **V2 substitui as rotas** (decisão do Rudá) — `/game` e `/game-hub` continuam sendo as URLs; v1 arquivada em `_versoes-office/` (regra: nunca deletar).
3. **Presença multiplayer EM MEMÓRIA** (decisão do Rudá: incluir) — `Map` no server, TTL 8s, cap 600, polling 2s. **Nada no SQLite**: presença é efêmera por natureza e o SQLite do Railway não persiste entre deploys de qualquer forma (P0 conhecido). Identidade = email da sessão SSO → nome real no jogo.
4. **Shell do mapa fixo no engine** (60×36, mesmas paredes/portas nos 2 mundos). Trocar o layout físico exigiria revisitar colisões/pathfinding — o ganho da v3 está no conteúdo e nos sistemas, não na planta. Mundos customizam rugs, nomes, móveis, zonas e NPCs.
5. **NPCs fora do expediente vão embora** (rotina pela hora real) — mantém o princípio "sem status online fake" da v1: o escritório à noite fica vazio de verdade (com 2-3 "late workers" determinísticos pra não ficar morto, com fala explícita de que estão terminando algo).
6. **Falas de NPC = flavor de personagem, não dados.** Frases curtas de tom (ex.: "teste A/B rodando 🧪") — nunca números/métricas, pra não violar a regra 7 (REAL DATA ONLY). Dados reais só nos cartões (team.json/office-desks.json) e painéis (events/changelog).
7. **Mascote Ellie 🐘 no game do colaborador** — recepcionista fixa. É personagem fictícia DA MARCA (ERP.ngo), claramente não-humana (sprite de elefantinha), evitando inventar uma "pessoa" fake.
8. **Sons off por padrão** — WebAudio procedural só liga no toggle 🔊 (respeita ambiente corporativo/mobile).
9. **Clock do emote = epoch do cliente emissor** — skew de relógio entre máquinas pode atrasar/pular emote remoto; aceito (NTP cobre o caso comum) pra manter o servidor burro.
