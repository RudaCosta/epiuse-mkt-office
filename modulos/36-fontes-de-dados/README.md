# Módulo 36 — Central de Fontes · tudo que vem de fora, sempre atualizado

**Status:** ✅ v1.0 · 14/out/2026 (0.100.0) · **Rota:** `/fontes` (time de Marketing) · **Dono:** Rudá Costa
**Propósito:** pedido do Rudá — *"todas as planilhas, MCPs, APIs, integrações, calendários, tudo que for fora do Claude que necessite beber de alguma fonte, quero que você atualize e bole um meio de ser sempre atualizado"*.

Antes, cada fonte se atualizava de um jeito: tarefa agendada no PC do Rudá, JSON commitado à mão, sessão do Claude com MCP, refresh no servidor. Ninguém via o conjunto, e dado parado meses passava batido. Na auditoria de 14/out:
- histórico do LinkedIn parado desde jun;
- eventos, artigos e rotina do LinkedIn parados desde jun;
- leads do Zoho parados desde ago;
- Redatoria sem as abas de jul/set (leitor com abas fixas);
- consulta de oportunidades do Zoho quebrada (campo renomeado).

## As três peças
1. **Registro** (`routes/fontes.js`, lista `FONTES`). Cada fonte de fora tem dona, área, telas que usam, modo de atualização e prazo. A "última atualização" é **lida do próprio dado** (tabela do SQLite, campo de data do JSON, estado do motor), nunca digitada.
2. **Motor no servidor.** Baixa a planilha da nuvem e roda o **mesmo parser do PC**:
   - OneDrive/SharePoint, pelo Graph, com o app do Azure do SSO (`Files.Read.All` liberado em 02/out);
   - Google Sheets, pelo link de exportação.
   Também roda as integrações por API (Zoho). Planilha com o mesmo hash não é reprocessada: só registra que conferiu. Depois disso, nada depende do PC ligado.
3. **Cobrança.**
   - `/fontes` mostra a saúde de tudo, filtrada pelas áreas de cada pessoa.
   - O que atrasa ou quebra vira alerta para a área dona (regra `fontes.registro` do Módulo 34).
   - Fonte curada à mão ganha lembrete de revisão.
   - Os relatórios semanal e mensal listam a saúde das fontes a partir do registro.

## Modos
| Modo | O que é | Exemplos |
|---|---|---|
| `servidor` | integração com motor próprio em outro módulo; aqui só lê o estado e oferece "atualizar agora" | Apollo, GA4, RD, calendário editorial |
| `motor` | este módulo baixa e roda o parser | Cases, Redatoria, Eventos, Artigos, SAP for Me, Metas, rotina do LinkedIn, Calendário da Duda, Zoho (oportunidades e leads) |
| `pc` | ainda no PC (muitos arquivos locais) | histórico do LinkedIn (xls + 13 PPTs) |
| `manual` | curada à mão; prazo de revisão e botão "marcar como revisada" | Development Funds, Prazos SAP, Voices, Time, Campanhas, Datas especiais, KB de Clientes, KB do JARVIS, Gantt de eventos, calendário LATAM |
| `pendente` | ainda não integrada; diz o que falta | HubSpot CMS, Search Console, Instagram, LinkedIn API, agenda do Outlook, Trello |

## Status
`em-dia` · `atrasada` (passou do prazo) · `erro` (última leitura falhou) · `aguarda` (falta algo humano: link, credencial) · `revisar` (curada à mão vencida) · `pendente`.
Só gera alerta o que **já teve dado e parou**, ou que dá erro. Fonte que nunca atualizou fica só em `/fontes`: nada de aviso a partir de dado inexistente.

## Onde a planilha mora (link)
- Padrão: caminho no OneDrive do Rudá (`onedrive:/MARKETING/...`, o mesmo do PC). Se `MARKETING` for atalho de pasta compartilhada, o motor resolve o atalho.
- Caminho padrão que não existe vira "aguarda: cole o link", não erro. O motor tenta de novo 1x por dia.
- O super admin cola o link em `/fontes` (OneDrive/SharePoint `https://…sharepoint.com/…` ou Google Sheets). Só esses três tipos entram: o servidor nunca busca URL qualquer.
- Também dá por variável: `FONTE_<ID>_URL` (ex.: `FONTE_SAP4ME_URL`).

## Arquivos-chave
| Arquivo | Papel |
|---|---|
| `routes/fontes.js` | registro, motor (Graph/Google/API), fila, agendador, avaliação, API, `paraAlertas()`/`paraRelatorio()` |
| `public/fontes.html` | página (vanilla, tokens do DESIGN.md), filtros por status/área/busca, atualizar agora, marcar revisada, link (super admin) |
| `scripts/lib/zoho-api.js` | OAuth "Self Client" + COQL pela API REST (sem sessão do Claude) |
| `scripts/sync/*` | os parsers de sempre, agora aceitando `FONTE_ARQUIVO` (cópia baixada da nuvem) |
| `scripts/sync/requirements.txt` | pandas + openpyxl na imagem do Railway (parsers em Python) |
| `routes/alertas.js` | regra `fontes.registro` + bloco "Saúde das fontes" dos relatórios vindo do registro |
| `scripts/tests/fontes.js` | ponta a ponta com Graph/Google/Zoho de mentira (34 verificações) |
| `scripts/tests/fontes-cobertura.js` | todo script de sync e todo JSON de `public/api/` precisa estar no registro |

## API
`GET /api/fontes` (time; cada um vê as áreas que abre, gestão vê tudo) · `POST /api/fontes/:id/atualizar` (área da fonte; 1x por minuto) · `POST /api/fontes/:id/revisado` (curadas à mão) · `PUT /api/fontes/:id/config` (só super admin).

## Variáveis
| Variável | Para quê |
|---|---|
| `AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET` | já existem (SSO): Graph para planilhas do OneDrive/SharePoint |
| `ZOHO_CLIENT_ID/CLIENT_SECRET/REFRESH_TOKEN` + `ZOHO_DC` | Zoho pela API (oportunidades e leads) |
| `FONTES_ONEDRIVE_UPN` | dono do OneDrive dos caminhos padrão (padrão: 1º e-mail de `SUPER_ADMIN_EMAILS`) |
| `FONTE_<ID>_URL` | link da planilha por variável (o da tela tem prioridade) |
| `FONTES_AUTO=0` / `FONTES_AGENDADOR=false` | desliga o motor (no PC do Rudá já fica desligado: lá as tarefas do Windows cuidam; `FONTES_AUTO_LOCAL=1` liga) |

## Como adicionar uma fonte
1. Entrada nova em `FONTES` (`routes/fontes.js`) com `areas`, `dona`, `modo`, prazo (`sla_h` ou `revisar_dias`), `ultima()` lendo o dado real, `scripts` e `arquivos`.
2. Planilha: `motor: { tipo: 'planilha', locais, cmds, postar?, persistir? }`. O parser lê `process.env.FONTE_ARQUIVO` antes dos caminhos locais.
3. `node scripts/tests/fontes-cobertura.js` e `node scripts/tests/fontes.js`.
