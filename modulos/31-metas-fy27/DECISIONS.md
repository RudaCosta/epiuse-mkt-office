# Decisões — Metas FY27

- **"Automático" = muda em prod sem ninguém rodar nada** (mesma régua das áreas 27–30). Apollo (servidor busca a cada 6h), GA4 (servidor busca todo dia) e o que o time faz dentro do Office. JSON estático que só muda com deploy não entra.
- **Meta vem do arquivo, realizado vem da fonte.** O alvo é lido da planilha da equipe e do funil de cada área por rótulo — se a planilha mudar, o placar acompanha. Sem alvo encontrado, o card mostra "sem meta definida".
- **Metas repetidas viram uma só.** "E-mails personalizados/dia (30)" = "E-mails entregues 30d (660 = 30 × 22)"; reuniões/semana e /mês = "Reuniões marcadas 30d"; "Eventos executados no ano" = "Eventos BR realizados".
- **Eventos realizados = kanban do Office, não data do calendário.** O `events.json` é export manual do SharePoint; o status no kanban (pós-evento/concluído) é gravado pelo Field na hora. Evento que aconteceu e não foi movido não conta — o card diz isso.
- **Ritmo linear para metas do ano.** Esperado hoje = % do ano já passado (FY ou ano-calendário, conforme a meta). Metas de janela (7/30 dias) e de estoque esperam 100%.
- **Premissas marcadas:** "Tráfego (site) 15.000" lido como sessões/mês do GA4 e "Pautas 25" lido como mensal levam `⚠️ Estimativa — premissa`. Se a leitura estiver errada, corrigir o rótulo/alvo no `areas.json`.
- **Janela curta do Apollo:** enquanto o `apollo_hist` não cobre os 7/30 dias, a meta é proporcional e marcada `⚠️ Estimativa` (mesma regra do Módulo 29).
- **GA4 sem mês anterior no cache:** mostra o último mês disponível com aviso explícito, nunca como "último mês fechado".
- **RD Station é automático, mas fica como link:** a API que o Office usa não traz MQL, abertura nem CTR, que são as metas da Bruna.
- **Regras de processo saem do placar** (cadências, regras do DDF, etapas do design, comitês): não têm número a medir. A página mostra quantas saíram e a lista.
- **Link do painel só pelo e-mail do dono:** o menu consulta `/api/analytics/owner` (além de super admin). Se outro e-mail virar super admin, não vê o link nem abre o painel.
- **Cores fixas por área e por status**, nunca pelo ranking.
