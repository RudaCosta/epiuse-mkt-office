# Decisões — Área Brand Experience / Voices

- **"Automático" = muda em prod sem ninguém rodar nada.** Tudo que o time faz dentro do Office (pautas, links, inscrições, Voices publicados) é dado vivo. Campos digitados no `voices.json` (SSI, posts do mês, kit, pendência) não são — saíram e viraram link pro `/voices`.
- **Calendário editorial: refeito em vez de cortado.** A permissão do Graph já estava liberada; faltava o servidor buscar sozinho. Agora roda no boot + 6h (desliga com `EDITORIAL_AUTO=0`; não roda na máquina local). O bloco só aparece com a leitura ligada e um sync ok nas últimas 26h — sem isso, vira card-link (nunca mostra calendário velho como se fosse atual).
- **Cases fica dentro:** a tarefa diária 07:00 manda direto pro Railway (provado em 09/jun). Mesmo assim depende do PC ligado, então a página mostra o frescor e alerta com >36h.
- **Calendário da Duda (`editorial_calendar`) fica fora:** também depende do PC; o calendário oficial do LinkedIn é o da planilha do marketing (Módulo 25), que agora é automático.
- **"Posts" = uma URL.** Junta a URL colada na pauta publicada e o post registrado no tracker, sem duplicar. Não usa `posts_mes_atual` do `voices.json`.
- **Cliques = só os do Voice.** Tokens das pautas liberadas (o link nasce no nome do Voice, Módulo 20) + links criados pelo e-mail do Voice. Robôs fora (`bot=0`), igual ao Módulo 18.
- **Meta de posts:** 2/semana por Voice (`voices.json` → `meta_posts_mes`, que na prática é por semana — mesma leitura do painel antigo) e 40/mês na área (`areas.json`). O anel de cada Voice usa 2 × 52 / 12 ≈ 9/mês.
- **Seguidores atribuídos (meta 800):** sem fonte automática → card `⏳ Aguarda integração LinkedIn`, sem número (regra 7).
- **Inscrições sem nomes:** a área mostra só contagens, área e origem. Nomes ficam na triagem (`/admin/inscricoes`).
- **Voice e colaborador não veem a área:** a API traz pautas e cliques de todos os Voices; o Módulo 20 garante que um Voice só vê as próprias pautas. Role `voice` e `hub` → 403 na API.
- **Cores fixas por etapa da esteira** (enviada → publicada) e por status de Case, nunca pelo ranking.
- **Constelação:** uma órbita até 7 nós (2 órbitas encostavam no núcleo); partículas na taxa proporcional aos cliques reais de cada Voice, número exibido é sempre o real.
