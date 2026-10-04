# Decisões — Área Eventos

- **Mesmo padrão do Módulo 27:** página dedicada registrada antes do `/area/:id`; as demais áreas seguem no `area.html`.
- **Tracking genérico em vez de copiar:** `AREA_TRACK = { intel, eventos }` em `routes/analytics.js` + um painel único parametrizado pela URL. Nova área com tracking = 1 linha no `AREA_TRACK` + 1 entrada `AREAS` no painel. Os endpoints do 27 (`/api/admin/analytics/intel…`, `/admin/intelligence`) continuam iguais.
- **Beacon só aceita kinds da lista** (`AREA_KINDS.includes`), nunca `AREA_TRACK[kind]` direto — evita chaves do protótipo (`constructor`, `__proto__`).
- **Regra 7:** todos os números vêm de `events.json`, `field_events` ou `development-funds.json`, com frescor visível. "Realizado" é calculado pela data do calendário (evento TBC conta pelo mês). Captura/ROI só aparece quando alguém registrou no Field Marketing; sem registro, a página diz isso e aponta onde preencher.
- **Cores de LOB fixas por LOB, nunca pelo ranking:** 6 spot colors do Brand Guide (Cross, ERP, Branding, HCM, BTM, BTP) + "Outros" (Cloud, Institucional, WFS, SN). Ordem validada com o `validate_palette` do dataviz no fundo escuro (CVD e contraste ok). Luminosidade/croma das spot colors ficam fora da faixa ideal por serem do guia (regra 8), então o nome da LOB aparece sempre em texto ao lado da cor.
- **MDF com valores em €:** a tela `/development-funds` já é aberta ao time; o dado é o mesmo. Data do snapshot lida do JSON de origem (o endpoint não devolve).
- **`mes.<mmm>` só conta rolagem feita pela pessoa** (ponteiro/roda/toque/teclado/setas), não o posicionamento automático no mês atual.
