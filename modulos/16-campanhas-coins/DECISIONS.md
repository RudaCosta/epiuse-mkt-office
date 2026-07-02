# Decisões — Módulo 16 · Campanhas + ERP Coins

## 02/jul/2026 — v0.72.0

1. **Coins em SILÊNCIO total** (pedido explícito do Rudá) — nenhuma UI de usuário mostra saldo, ganho ou existência dos coins. Só o head vê (`/admin/coins`). O anúncio + resgate (brindes/dinheiro) é uma decisão futura de campanha.
2. **"Share" = clique de intenção, não share confirmado.** O LinkedIn não expõe confirmação de share sem app parceiro (Community Management API). Registrar o clique no CTA é o dado honesto disponível hoje; a taxa de conversão clique→share real é desconhecida e NÃO deve ser apresentada como "N compartilhamentos" em relatório — apresentar como "N cliques de compartilhamento". (Regra 7 do CLAUDE.md.)
3. **Anti-farm por dia, não por vida** — `UNIQUE(email,evento,ref,dia)`: a pessoa pode compartilhar a mesma campanha de novo amanhã (comportamento desejado — recorrência), mas não farmar 50 cliques num dia.
4. **Valores server-side** (share 10 · golplaca 10 · quest 50) — o cliente nunca manda a quantidade; evita adulteração via console. 10 do golplaca espelha os "10 pontos por elogio" da campanha oficial do People.
5. **Fonte das campanhas = JSON curado** (não API do LinkedIn): automação exige aprovação no LinkedIn Marketing Developer Platform (semanas + admin da page). Curadoria manual custa ~1 min por campanha e é 100% real. Scraping = viola ToS, descartado.
6. **Identidade = sessão SSO** — anônimo não acumula (401). Evita ledger poluído e dá o email real pro resgate futuro.
7. **Persistência**: não há risco — o Railway Volume em `/data` já está montado e provado em produção desde 09/jun/2026 (`vault/00-contexto/pendencias.md`, item D1). Os coins vivem no mesmo SQLite que cases/eventos/calendário, que já sobrevivem a deploy. `backup`/`restore` por editor token seguem como utilitário de export manual, não como mitigação de um risco real.
8. **Fante 🐘** — mascote renomeada (era Ellie). Veste camisa 10 verde-amarela automaticamente enquanto `golplaca.ativa:true` no JSON — remoção da campanha despe o kit sem deploy de código.
9. **Link do form Gol de Placa** = tracker RD original do email (t.rdsv2.net) — egress do ambiente bloqueou a resolução da URL limpa. Trocar pela URL direta do form quando o Rudá passar (os cliques via Office inflam levemente a métrica de clique do email da Daniela).
