# Decisões arquiteturais — Módulo 14 Curva ABC

## D1 — Matriz 2D Fit × Propensão (não score único)
Decisão do Rudá: matriz visual (Alto/Médio/Baixo em cada eixo) em vez de score único 0-100. Mais fácil de explicar pro AE/SDR *por que* uma conta é A, e é o padrão do modelo ABM que a Cortex Intelligence usa como referência.

## D2 — Fit + Propensão, sem 3ª dimensão de valor potencial (por ora)
Ticket/valor potencial (ex: faturamento estimado × probabilidade) foi cogitado como 3º eixo mas descartado no MVP — faturamento real de conta ainda não está disponível de forma confiável (depende de enriquecimento Apollo, nem sempre presente). Reavaliar quando essa fonte estiver mais completa.

## D3 — Auto-score + override manual com audit trail
O sistema calcula `classificacao_calculada` a partir de sinais reais; AE/SDR pode setar `classificacao_final` diferente, mas precisa de motivo — grava em `curva_abc_historico`. Isso preserva conhecimento tácito do time sem esconder o cálculo original.

## D4 — Fontes: Zoho + Apollo desde o início (unificadas)
Ambos os canais entram na mesma tabela `curva_abc_contas`, com campo `fonte` (zoho|apollo|ambos) — uma conta pode existir nos dois, e nesse caso os sinais de propensão de ambos se somam (dado mais completo = classificação mais confiável).

## D5 — Thresholds do score (v1, ajustar com o Marlison)
**Fit** (0 a 4 pontos, converte pra Baixo/Médio/Alto):
- +1 vertical/LOB bate com força EPI-USE (HCM/SuccessFactors, ERP/S4, BTP, ServiceNow)
- +1 porte dentro da faixa-alvo (enterprise, via Apollo `estimated_num_employees`, quando disponível)
- +1 existe case de sucesso EPI-USE em vertical/subsegmento parecido (`cs_clientes`)
- +1 conta-irmã já usuária SAP ativa em outro país (`clientes_sap_4me`)
- 0-1 = Baixo · 2 = Médio · 3-4 = Alto

**Propensão** (0 a 4 pontos):
- +1 engajamento real Apollo (abriu/respondeu sequência, reunião marcada)
- +1 deal aberto avançando no Zoho (stage >= "Qualificação", não parado há +60 dias)
- +1 gatilho de urgência 2026 do playbook JARVIS bate com a conta/vertical
- +1 dor de campo real já ouvida em call pra essa conta/vertical (`jarvis_aprendizados`)
- 0-1 = Baixo · 2 = Médio · 3-4 = Alto

**Cruzamento final:**
- Fit Alto + Propensão Alta → **A**
- (Fit Alto + Propensão Média) OU (Fit Médio + Propensão Alta) → **B**
- Resto → **C**

Estes pesos são um ponto de partida documentado, não um modelo estatístico calibrado — ajustar após rodar em contas reais com o Marlison (ver PENDENCIAS.md).

## D6 — Gaps de dado não bloqueiam o cálculo
Quando um sinal não está disponível (ex: porte da empresa sem enriquecimento Apollo), esse ponto do eixo fica em branco (não conta a favor nem contra) e o campo aparece na UI com `⏳ aguarda enriquecimento` — Regra 7 (real data only): nunca simular o sinal ausente.

## D7 — Reuso total do padrão JARVIS/cases
Router Express aditivo (`routes/curva-abc.js`), tabelas SQLite criadas no boot via `CREATE TABLE IF NOT EXISTS`, `requireAuth` do `server-context.js`, página HTML single-file com `design-tokens.css`. Nenhum framework novo, nenhuma dependência nova.
