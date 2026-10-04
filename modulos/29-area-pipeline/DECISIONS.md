# Decisões — Área Pipeline

- **"Automático" = atualiza em prod sem ninguém rodar nada.** O Apollo tinha tarefa agendada no PC do Rudá, mas gravava um JSON estático que só chegava em prod no deploy — na prática, manual. Solução: o próprio servidor busca na API (mesmo padrão do refresh diário de GA4/RD), gravando no volume (`app_blobs`).
- **Zoho fora:** o sync de deals depende de sessão do Claude via MCP. Enquanto não houver OAuth no servidor, a área só linka o Zoho (e a Curva ABC). Projeto registrado no `areas.json`.
- **Metas: só com realizado automático.** Sequências ativas (funil `areas.json`), e-mails 30d (660 = 30/dia × 22 dias úteis), reuniões 30d (12) e contas novas/semana (20, `metas-fy26.json`). Oportunidades e vendas = card-link pro Zoho, sem número.
- **Janelas de 7/30 dias pelo histórico próprio** (`apollo_hist`, 1 linha/dia). O Apollo devolve totais acumulados por sequência; a diferença entre dias dá o período. Enquanto o histórico não cobre a janela inteira, a meta é proporcional e marcada `⚠️ Estimativa`.
- **"Reuniões" = `unique_demoed` do Apollo** (reuniões marcadas nas sequências). Não cobre reunião marcada fora do Apollo — dito no card.
- **Botão "Atualizar agora" aberto a quem está logado,** com trava de 10 min e refresh único em andamento. Só lê o Apollo; não escreve nada lá.
- **Partículas da máquina usam a taxa real de cada etapa** (com piso visual de 22% pra animação não morrer); o número exibido é sempre o real.
- **Cores por canal fixas** (e-mail auto, manual, ligação, LinkedIn, tarefa), nunca pelo ranking.
- **JARVIS com etiqueta de IA:** dores/objeções/gatilhos e resumos são extraídos por IA das calls reais → `🤖 revisar` (regra 6).
- **Estágios da base são opcionais:** dependem da permissão da chave em `/contact_stages`; sem acesso, o bloco some (não mostra vazio).
