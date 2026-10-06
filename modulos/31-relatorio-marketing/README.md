# Módulo 31 — Relatório de Marketing ao vivo

**Status:** ✅ v2.0 · só fontes automáticas + PPT/PDF no padrão EPI-USE + tracking só do dono (06/out/2026) · **Rota:** `/relatorio` · **Dono:** Rudá
**Propósito:** o relatório mensal da diretoria montado sozinho. Só entra o que se atualiza sem ninguém rodar nada; o resto virou link. Sai em PowerPoint (padrão do PPT EPI-USE, Brand Guide 2026) e PDF.

## Arquivos-chave
| Arquivo | Papel |
|---|---|
| `public/relatorio.html` | Página (vanilla, tokens do DESIGN.md). Topo com rio de sinais animado, seletor de 12 meses com indicador deslizante, status ao vivo das fontes, pulso do mês (contadores + sparklines), fluxo "do alcance à conversa" (partículas ∝ volume), blocos por fonte com gráficos SVG animados, fontes dentro × fora, CTA de exportação |
| `routes/relatorio.js` | `GET /api/relatorio/live?mes=` (agrega só fontes automáticas) · `GET /api/relatorio/export?formato=pptx\|pdf` · `GET /api/relatorio/capacidades` · `GET/POST/DELETE /api/relatorio/template` (só o dono) · agenda do GA4 por mês e da foto diária do RD |
| `scripts/relatorio/gerar_pptx.py` | v2.0: monta o PPTX no padrão EPI-USE a partir do JSON do `/live` (capa e encerramento Deep Blue, Verdana, vermelho só de acento, rodapé © Group Elephant, gráficos nativos editáveis). Usa o template oficial se houver |
| `scripts/integrations/ga4_fetch.js` | **Bug corrigido:** casava o período pela posição da linha e às vezes gravava o mês anterior no lugar do atual. Agora casa pelo nome (`fetch_v: 2`) |
| `scripts/integrations/rd_fetch.js` | Passa a gravar `enviados_por_mes` (base do histórico mensal de disparos) |
| `routes/analytics.js` | `AREA_TRACK.relatorio` → beacon `kind='relatorio'`, painel `/admin/relatorio` |
| `private/admin-area-tracking.html` | Config `relatorio` (seções, fontes, rótulos de download/mês/número) |
| `public/office-nav.js` | Link "👁️ Tracking · Relatório" só quando `/api/analytics/owner` = true |
| `public/assets/logos-epi-use/epi-use-logo-rgb.png` | Logo colorido em PNG (o PPT não aceita SVG) |
| `Dockerfile` | LibreOffice Impress headless + DejaVu (PDF no Railway) |

## Fontes: dentro × fora
| Fonte | Na página? | Mecanismo |
|---|---|---|
| **Site · GA4** | ✅ | Servidor busca boot + 12h; cada mês fica no SQLite (`app_blobs['relatorio.ga4']`), sobrevive a deploy. Mês buscado antes de fechar é rebuscado. Mês aberto = "parcial", sem variação |
| **E-mail & base · RD** | ✅ | Refresh diário do server.js + foto diária em `relatorio_rd_hist` → posição de fim de mês e variação da base. Sem histórico do mês: mostra a posição com a data |
| **Outbound · Apollo** | ✅ | Refresh 6h (Módulo 29) + `apollo_hist`: mês = fim do mês − fim do mês anterior |
| **Voices** (pautas, posts, inscrições) | ✅ ao vivo | `voice_pautas`, `posts`, `recruitment_applications` |
| **Links rastreados** | ✅ ao vivo | `utm_clicks` sem robôs |
| **Cases** | ✅ | `cs_clientes` (sync diário 07:00), com frescor |
| **Calendário editorial** | ✅ se o auto-sync Graph estiver ok | Módulo 25; sem sync ok, vira link |
| LinkedIn da empresa | ↗ `/linkedin` | Export manual (XLS) |
| Zoho CRM | ↗ `/area/intelligence` | Sync manual |
| Eventos | ↗ `/area/eventos` | Calendário editado à mão |
| SAP 4 ME | ↗ `/clientes-sap-4me` | Planilha enviada do PC |
| Metas FY27 | ↗ `/metas-fy27` | Planilha oficial, sync manual |
| Instagram, KPIs dos reports antigos | saiu | Sem integração |
| `rd-canais.json` (Análise/Performance de canais) | **cortado** | JSON estático com modo "simulado" |
| `relatorio-outreach.json` | **cortado** | Foto parada do Apollo — substituída pelo Apollo ao vivo |

## Blocos (`data-sec` do tracking)
`hero` · `pulso` · `jornada` · `site` · `email` · `outbound` · `voices` · `editorial` · `cases` · `fontes` · `exportar`

## Exportação
- **PPTX:** `python3 gerar_pptx.py --data <json> --output <pptx> [--template <oficial.pptx>]`. Slides: capa · agenda · resumo · site · e-mail · outbound · Voices & links · calendário · cases · fontes e método · encerramento (ERP.ngo). Fonte sem dado → slide sai e a fonte aparece em "Fontes e método".
- **PDF:** o mesmo PPTX convertido pelo LibreOffice (`soffice --headless`, perfil por execução). Sem LibreOffice, `/capacidades` diz `pdf:false` e o botão desativa.
- **Template oficial:** o `.pptx` da marca não vai pro git (repo público). O dono sobe pelo próprio `/relatorio` (rodapé do bloco Exportar) → `DATA_DIR/templates/`. Precisa dos layouts `Title-slide_Elephant`, `Content-slide_white-bg-blank`, `End-slide_Elephant`; senão o gerador usa o padrão do guia.
- À mão no PC: `python scripts/relatorio/gerar_pptx.py --mes 2026-09 --pdf` (lê `/api/relatorio/live` com `EDITOR_TOKEN` no header).

## Rastreamento (quem viu o quê)
- **Abriu:** `logPageView` (`kind='view'`, `/relatorio`). **Tempo total:** beacon do office-nav.
- **Passos** (`kind='relatorio'`): `sec.<id>` · `tempo.<id>.<s>` · `scroll.N` · `mes.<AAAA-MM>` · `kpi.<id>` · `node.<fonte>` · `fora.<fonte>` · `flow.<etapa>` · `grafico.site` · `pagina.*` · `funil.*` · `seq.<n>` · `voice.<id>` · `origem.*` · `campanha.*` · `dia.<dd>` · `case.*` · `caselob.*` · `cta.*`.
- **Downloads:** gravados pelo servidor quando o arquivo sai: `export.<pptx|pdf>.<AAAA-MM>`.
- **Painel:** `/admin/relatorio` — `requireOwner` (sessão = `ruda.costa@epiuse.com.br`) + `/admin/*` só super admin. Link no menu e chip na página só pro dono.

## Acesso
- `/relatorio` e `/api/relatorio/*`: time de Marketing (`acesso.js`, área `time`). Diretoria e colaborador não abrem a página — recebem o PPT/PDF.
- `/api/relatorio/template`: só o dono (403 pro resto, inclusive time).
