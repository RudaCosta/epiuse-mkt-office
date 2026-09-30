# Decisões — Módulo 25 · Calendário Editorial

## D1 · Tabela nova (`edt_calendario`) em vez de reusar `editorial_calendar`
A planilha tem colunas mais ricas (tipo, LOB, solução, narrativa, formato, CTA, copy, status,
semana) que não cabem no schema do `editorial_calendar` (calendário da Duda, grid mensal).
Misturar geraria conflito de `external_id` e poluição das duas fontes. Tabela dedicada mantém
os dois calendários independentes.

## D2 · Sync = mirror completo (delete + reinsert), não upsert incremental
A planilha é a fonte da verdade e o time deleta/reorganiza linhas. Upsert incremental deixaria
registros órfãos quando algo some da planilha. Mirror (apaga `fonte='planilha-editorial'` e
reinsere) garante fidelidade. Insights vira 1 linha (id=1) com as tabelas em JSON — é conteúdo
de leitura, não precisa de linha-por-métrica.

## D3 · 3 telas separadas (não abas numa tela só)
Decisão da Bruna. Cada aba tem natureza diferente (BI vs planejamento vs backlog) e públicos
diferentes (Insights = Intelligence; Calendário/Pautas = Brand/conteúdo). Telas separadas +
uma barra de tabs pra navegar entre elas.

## D4 · Aparece nas 2 áreas (Intelligence + Brand)
Pedido da Bruna. `areas.json` é data-driven, então bastou adicionar as 3 ferramentas em ambas.
No topo-nav: insights destaca a aba Intelligence; calendário/pautas destacam Brand.

## D5 · Fase 2 usa o app do Azure do SSO (client-credentials), não uma cópia local
A planilha PRECISA continuar na nuvem (time inteiro edita). Cópia local sincronizada foi
descartada pela Bruna. O Office já tem `AZURE_CLIENT_ID/TENANT_ID/CLIENT_SECRET` do SSO, então
o Graph (fluxo app-only) baixa o arquivo pelo link de compartilhamento sem cópia local —
funciona do localhost E do Railway. Custo: precisa da permissão de APLICATIVO `Files.Read.All`
(ou `Sites.Read.All`) + admin consent. É dependência de TI (ver PENDENCIAS).

## D6 · Fase 1 desacoplada da Fase 2
O resync/parser lê de `XLSX_PATHS` (cópia local no vault OU OneDrive sincronizado). A Fase 2 só
troca a ORIGEM do arquivo (Graph baixa por cima). Assim as telas já funcionam hoje com dado real,
e a Fase 2 é um upgrade transparente quando a TI liberar.

## D7 · Datas: corrigir offset de fuso
O `xlsx` com `cellDates:true` devolve `Date` em fuso local; converter direto via `toISOString`
voltava 1 dia. Fix: `Date.UTC(y,m,d)` a partir das partes locais.
