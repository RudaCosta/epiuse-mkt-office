# INBOUND ENGINE — Handoff para Claude Code

**De:** Claude Design (sessão EUBR Inbound)
**Para:** Claude Code (sessão Office Engine)
**Versão:** v1.0 · Mai 2026
**Assunto:** Plugar o módulo **Inbound Engine** dentro do Office Engine como módulo F

---

## TL;DR — o que fazer

1. Copiar **7 arquivos** desta sessão para a pasta `public/inbound/` do Office Engine (lista exata abaixo).
2. Adicionar **6 rotas** ao `server.js` apontando pra esses arquivos.
3. Adicionar **1 zona** no `dashboard-escritorio.html` (mapa 2D) → "Inbound HQ".
4. Adicionar **1 card** no `dashboard-classic.html` (war room) → status do módulo.

Pronto. Tudo dark mode, fontes/paleta puxadas de `colors_and_type.css` (que o Office já carrega), sem build, sem bundler, sem dependência nova exceto `html2canvas` (CDN).

---

## O que é o Inbound Engine

Módulo da plataforma EPI-USE Voices dedicado a **produção e governança de social media** (LinkedIn principalmente).

```
Office Engine (você está aqui)
├── Module A · Profile Optimizer  → /optimizer
├── Module B · Voice Agents       → /voices
├── Module C · Painel             → /painel
├── Module D · Marketing Hub      → /hub
├── Module E · Voice Post Tracker → (Chrome extension, v3.2)
└── Module F · INBOUND ENGINE  ← novo  → /inbound
    ├── /inbound          → Hub (landing das 4 ferramentas)
    ├── /inbound/brief    → Brief → Post (Claude-powered)
    ├── /inbound/calendar → Calendário editorial
    ├── /inbound/studio   → Template Studio (PNG export)
    └── /inbound/playbook → Deck do playbook editorial
```

**Resolve a dor real:** cada EPI-USE no mundo (BR, DACH, USA, UK, ZA, AU…) publica em estilo próprio. Não há padrão visual nem editorial. Este módulo consolida:
- O **playbook** (deck de 19 slides — sistema visual, 7 categorias, 2 modos institucional/campanha, look-book por LOB, do/don't).
- 3 **ferramentas vivas** que aplicam o playbook (Brief→Post, Calendar, Studio).
- Uma **navegação dedicada** dentro do Office, mas pertencente à mesma plataforma.

---

## Arquivos a copiar

Da pasta atual desta sessão (`/projects/<inbound-id>/`) → para `public/inbound/` no Office Engine:

| Arquivo origem | Destino no Office Engine | Descrição |
|---|---|---|
| `colors_and_type.css` | `public/inbound/colors_and_type.css` | (já existe na raiz do Office — pode linkar via `../colors_and_type.css` ao invés de duplicar) |
| `inbound-shell.css` | `public/inbound/inbound-shell.css` | Tema dark compartilhado por todas as telas do módulo |
| `inbound-hub.html` | `public/inbound/index.html` | Landing do módulo |
| `inbound-brief.html` | `public/inbound/brief.html` | Brief → Post (usa `window.claude.complete`) |
| `inbound-calendar.html` | `public/inbound/calendar.html` | Calendário editorial |
| `inbound-studio.html` | `public/inbound/studio.html` | Template Studio + PNG export |
| `EUBR Inbound Playbook.html` | `public/inbound/playbook.html` | Deck 1920×1080 (deck_stage.js) |
| `deck-stage.js` | `public/inbound/deck-stage.js` | Web component do deck (já usado no playbook) |
| `styles.css`, `styles-2.css`, `styles-3.css` | `public/inbound/` | CSS do playbook (mantém o deck self-contained) |
| `refs/*.png` | `public/inbound/refs/` | Imagens de referência usadas no playbook (collage do slide 03, do/don't slide 17) |
| `assets/logos/*` | `public/inbound/assets/logos/` | Logos (já replicados de `assets/logos/` original) |

**Atalho:** copiar a pasta inteira como `public/inbound/`. Os caminhos relativos das CSS/JS já estão corretos.

> **Importante:** o `inbound-shell.css` faz `@import url('colors_and_type.css')` por caminho relativo. Se for linkar pro `colors_and_type.css` da raiz do Office, troque para `@import url('/colors_and_type.css')`.

---

## Rotas a adicionar no `server.js`

```javascript
// ============================================================
// MODULE F · INBOUND ENGINE
// Social media playbook + tools (brief→post, calendar, studio)
// ============================================================
const inboundDir = path.join(__dirname, 'public', 'inbound');

// landing (Hub)
app.get('/inbound', (req, res) => {
  res.sendFile(path.join(inboundDir, 'index.html'));
});

// brief → post (Claude-powered)
app.get('/inbound/brief', (req, res) => {
  res.sendFile(path.join(inboundDir, 'brief.html'));
});

// editorial calendar
app.get('/inbound/calendar', (req, res) => {
  res.sendFile(path.join(inboundDir, 'calendar.html'));
});

// template studio + PNG export
app.get('/inbound/studio', (req, res) => {
  res.sendFile(path.join(inboundDir, 'studio.html'));
});

// playbook (deck 1920×1080)
app.get('/inbound/playbook', (req, res) => {
  res.sendFile(path.join(inboundDir, 'playbook.html'));
});

// static assets (CSS, JS, images) — mounted under /inbound
app.use('/inbound', express.static(inboundDir));
```

> **Ordem importa:** as rotas específicas (`/inbound/brief` etc) precisam vir **antes** do `app.use('/inbound', express.static(...))`. Senão o static middleware intercepta e retorna 404 para arquivos sem extensão.

---

## Integração no Modo Game (`dashboard-escritorio.html`)

Adicionar **1 nova zona** ao mapa 2D. Sugestão de posição: parede norte, perto do Marketing Hub.

### 1. Adicionar carpete colorido
No bloco onde os outros carpetes são desenhados (`drawCarpets()` ou similar), adicionar:

```javascript
// Inbound HQ — bg cinza-azulado, accent azul EPI-USE
ctx.fillStyle = '#14213D';
ctx.fillRect(28*TS, 4*TS, 12*TS, 6*TS);  // 12×6 tiles à direita do Marketing Hub
ctx.strokeStyle = '#5BBCEB';
ctx.lineWidth = 2;
ctx.strokeRect(28*TS, 4*TS, 12*TS, 6*TS);

// Label "INBOUND HQ" centralizada no carpete
ctx.fillStyle = '#5BBCEB';
ctx.font = 'bold 14px monospace';
ctx.textAlign = 'center';
ctx.fillText('INBOUND HQ', 34*TS, 7*TS);
```

### 2. Adicionar interactable
Onde as outras zonas estão registradas:

```javascript
{
  id: 'inbound-hq',
  name: '📡 Inbound HQ',
  x: 32, y: 6,           // posição em tiles dentro do carpete
  radius: 2.5,
  onInteract: () => {
    openIframe('/inbound');  // abre o hub do módulo dentro do modal iframe 93vw×93vh
  }
}
```

### 3. Atualizar minimap
No render do minimap, adicionar o retângulo do carpete na cor `#5BBCEB` semi-transparente.

---

## Integração no Modo Dashboard (`dashboard-classic.html`)

Adicionar **1 card de projeto** no bloco "Projetos & Status". Replicar exatamente a estrutura dos outros cards (Profile Optimizer, Marketing Hub, etc):

```html
<div class="proj-card">
  <div class="proj-head">
    <div class="proj-ico" style="background: rgba(91, 188, 235, 0.12); color: #5BBCEB;">📡</div>
    <span class="badge ok">✓ Pronto</span>
  </div>
  <h3>Inbound Engine</h3>
  <p class="proj-sub">Módulo F · v1.0 lançada</p>
  <p class="proj-meta">
    Playbook editorial + 3 ferramentas (Brief→Post · Calendar · Studio).
    Padrão visual unificado pros 10 países da EPI-USE.
  </p>
  <a href="/inbound" class="proj-link">Abrir →</a>
</div>
```

E **opcionalmente** adicionar a próxima entrega no Roadmap:

```html
<div class="roadmap-item">
  <span class="rm-num">6</span>
  <div class="rm-content">
    <h4>📡 Inbound Engine — Brief→Post v1</h4>
    <p class="rm-meta">Form + Claude + render. Próximo: importar feed do LinkedIn Brand.</p>
  </div>
  <span class="badge ok">✓ Entregue</span>
</div>
```

---

## Como cada ferramenta funciona (resumo técnico)

### `/inbound` — Hub
- 4 tools cards + 2 painéis de status (balanço LOB últimos 30d, pipeline próximos 14d).
- Nav superior persistente (tabs entre as 4 telas + voltar para Office).
- Dark theme matching do war room.
- Dados de exemplo hardcoded — substituir por consumo de API quando ligar ao SharePoint/Plausible.

### `/inbound/brief` — Brief → Post **(MVP usa `window.claude.complete`)**
- Form à esquerda: categoria, LOB, modo (institucional/campanha), brief bruto, cliente, métrica, persona, autor pra reshare.
- Preview à direita: card 1080×1350 ao vivo + tabs (Card | Copy).
- Botão **"Gerar com Claude"** dispara prompt estruturado, espera JSON de volta com `{headline, heroNumber, context, linkedinCopy, hashtags, distribution}`.
- LocalStorage: `inbound.brief.draft` persiste o brief entre sessões.

> **⚠️ Se quiser usar o backend do Office em vez de `window.claude.complete`** (mais barato, controle de prompt, etc), crie um endpoint:
> ```javascript
> app.post('/api/inbound/generate', async (req, res) => {
>   const { brief, cat, lob, mode, client, metric, persona, author } = req.body;
>   const completion = await anthropic.messages.create({
>     model: 'claude-haiku-4-5',
>     max_tokens: 1500,
>     messages: [{ role: 'user', content: buildPrompt({ brief, cat, lob, mode, client, metric, persona, author }) }]
>   });
>   const text = completion.content[0].text;
>   const json = JSON.parse(text.replace(/^```(json)?/i,'').replace(/```$/,'').trim());
>   res.json(json);
> });
> ```
> Depois trocar dentro do `inbound-brief.html` a chamada `window.claude.complete(prompt)` por `fetch('/api/inbound/generate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(state) }).then(r => r.json())`.

### `/inbound/calendar` — Editorial Calendar
- Calendário tradicional mês-a-mês, navegação ←/→, botão "Hoje".
- Drag-and-drop nativo HTML5: arrasta um post-pill entre dias.
- Adicionar/editar via modal.
- Side panel: **alertas automáticos** (saturação, LOBs faltando, mês desbalanceado), **balanço por LOB** (bars), **balanço por categoria** vs metas mensais.
- Persistência: `localStorage` chave `inbound.calendar`. Seed com 9 posts de exemplo.

> **Próxima integração:** sync com SharePoint da Comunicação (single source of truth). Sugestão:
> 1. Endpoint `GET /api/inbound/calendar` que lê da planilha SharePoint via Graph API.
> 2. No frontend: hidratar `posts` desse endpoint na primeira carga, salvar no localStorage como cache, opcional `POST /api/inbound/calendar` pra fazer write-back.

### `/inbound/studio` — Template Studio
- 6 templates: `hero-num`, `quote`, `case`, `event`, `cta`, `award`.
- LOB picker controla cor de fundo + cor de acento.
- Form de conteúdo (headline com `*itálico*`, número-herói, contexto, categoria-label, autor).
- **Compliance check** automático: word count do headline, presença de itálico, comprimento do contexto, número-herói faltando em templates que pedem, âncoras institucionais.
- **PNG export 1080×1350** via `html2canvas` (CDN, sem build). Renderiza o stage em escala 2× pra sair em resolução final.
- Importar do Brief: lê `inbound.brief.draft` do localStorage e popula campos.

---

## Branding · Tokens

Todas as telas puxam de `colors_and_type.css` (sua single source of truth). O dark theme só **adiciona** tokens novos no `inbound-shell.css`:

```css
:root {
  --d-bg:        #0A1530;
  --d-bg-2:      #0E1B3D;
  --d-card:      #14213D;
  --d-card-2:    #182852;
  --d-border:    rgba(255,255,255,.08);
  --d-border-2:  rgba(255,255,255,.16);
  --d-ink:       #E2E8F4;
  --d-ink-2:     #A0AAC4;
  --d-ink-3:     #6B7A9F;
  --d-accent:    #5BBCEB;  /* sky — mesmo do war room */
  --d-warn:      #F5BB5C;
  --d-ok:        #4DE682;
  --d-bad:       #E5564D;
  --d-red:       var(--eu-red);  /* puxa do brand kit */
}
```

**LOB colors** (mantidas do brand kit, nunca inventadas):
- `--eu-lob-sfsf` `#FFC700` (HCM)
- `--eu-lob-btm` `#B6238D` (BTP)
- `--eu-lob-wfs` `#C8262E` (WorkForce)
- `--eu-lob-erp` `#5BBCEB` (Cloud ERP)
- `--eu-lob-cloud` `#F5841F` (Cloud / Valcann)
- `--eu-lob-sn` `#62BE5C` (ServiceNow)
- Signavio: `--eu-sec-teal` `#046595`
- Institucional / Group Elephant: `--eu-navy` `#003A6B`

---

## Estrutura de prompt do Brief → Post

Para você replicar/iterar do lado de cá. Variáveis em `{}` vêm do form:

```
Você é o redator do time de Marketing/RevOps da EPI-USE Brasil.
Siga o playbook editorial: foto humana > arte; número-herói > parágrafo; CTA no final.

CATEGORIA: {cat}
LOB: {lob}
MODO: {mode}                           // "Campanha United We Rise" ou "Institucional"
PERSONA-ALVO: {persona}                // CFO / CHRO / CIO / CEO / OPS
CLIENTE/REFERÊNCIA: {client}
NÚMERO-CHAVE: {metric}
AUTOR HUMANO (reshare): {author}

BRIEF BRUTO:
{brief}

Gere um objeto JSON com EXATAMENTE estas chaves:
{
  "headline":    "4-6 palavras · *termo* entre asteriscos para itálico",
  "heroNumber":  "string (ex: \"38%\") ou null",
  "context":     "1 linha · máx 12 palavras",
  "linkedinCopy":"PT-BR · 3-5 linhas curtas · gancho + CTA · sem emoji",
  "hashtags":    "5-7 hashtags separadas por espaço",
  "distribution":"PT-BR · 1 linha · diz se sai do perfil corporativo, executivo ou carrossel"
}

NÃO inclua nada antes ou depois do JSON. Apenas o objeto.
```

---

## Roadmap sugerido (depois do MVP)

| Sprint | Entrega | Onde |
|---|---|---|
| v1.1 | Backend endpoint `/api/inbound/generate` (move o Claude pro server) | server.js |
| v1.2 | Sync SharePoint → Calendar (Graph API) | server.js + calendar.html |
| v1.3 | Multi-slide carousel no Studio (renderiza N slides + zip de PNGs) | studio.html |
| v1.4 | Importar engagement do Plausible/LinkedIn → re-pinta o gráfico do hub com dados reais | hub.html |
| v1.5 | Compliance check passa a usar Claude pra revisar copy antes do export | studio.html |
| v2.0 | LOB-specific templates do playbook viram presets prontos do Studio | studio.html |

---

## Restrições técnicas mantidas

Tudo respeita o que você definiu:

- ✅ **Single-file HTML** por tela (CSS extraído pra um shell, mas nenhuma rota requer build)
- ✅ **Zero dependências externas** exceto `html2canvas` (CDN, single script tag, no studio só)
- ✅ **Dark mode consistente** com o war room (mesma `var(--d-bg)`, `--d-accent` sky, etc.)
- ✅ **Mesmas fontes** (Open Sans + JetBrains Mono — já carregadas via `colors_and_type.css`)
- ✅ **Compatível com modal-iframe** do modo game (93vw × 93vh) — toda tela é responsiva acima de 1280px

---

## Checklist para você (Claude Code)

- [ ] Copiar pasta `public/inbound/` (todos os arquivos listados na tabela)
- [ ] Adicionar bloco de rotas do Módulo F ao `server.js`
- [ ] Adicionar zona "Inbound HQ" + interactable no `dashboard-escritorio.html`
- [ ] Adicionar card "Inbound Engine" no `dashboard-classic.html`
- [ ] Testar `npm run dev` → `http://localhost:3000/inbound` carrega o hub
- [ ] Testar nav: hub → brief → calendar → studio → playbook → de volta ao Office
- [ ] Testar Brief→Post chamando `window.claude.complete` (precisa do contexto do artifact host — se rodando direto pelo Express, vai precisar do endpoint `/api/inbound/generate` antes)
- [ ] Testar Studio: alterar campos, exportar PNG, conferir 1080×1350 no arquivo baixado
- [ ] Commit + deploy Railway → snapshot vira `_versoes-office/v3.X-inbound-module-launch.html`

---

## Contato

Esta sessão: **Claude Design — EUBR Inbound**
Projeto Office Engine (matriz): `epiuse-voices-optimizer.up.railway.app`
Última atualização: 24 mai 2026

*United we post.* 🐘
