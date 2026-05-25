# OFFICE ENGINE — Briefing para Design
**Projeto:** EPI-USE Voices Platform · Módulo Homepage  
**Versão atual:** v3.0 (em desenvolvimento ativo, sprint v3.1 em andamento)  
**Responsável técnico:** Claude Code (sessão autônoma)  
**Destinatário deste doc:** Claude Design  
**Última atualização:** Mai 2026

---

## O que é o Office Engine

Homepage interativa da plataforma interna **EPI-USE Voices**. Funciona como ponto de entrada para todas as ferramentas de Marketing/RevOps da EPI-USE Brasil, entregue em dois modos que o usuário escolhe no spawn gate:

| Modo | Descrição |
|---|---|
| **🎮 Game (WASD)** | Escritório 2D pixel art estilo Gather.town. O usuário anda pelo escritório e interage com zonas para abrir ferramentas |
| **📊 Dashboard** | War Room clássico com cards, KPIs, roadmap e calendário de eventos |

A escolha é feita numa tela de entrada (spawn gate) onde o usuário digita seu nome.

---

## Arquitetura de arquivos

```
modulo-a-profile-optimizer/
├── server.js                  ← Express Node.js, serve tudo
├── public/
│   ├── api/voices.json        ← Dados dos Voices (perfis executivos)
│   ├── optimizer.html         ← Profile Optimizer (ferramenta principal)
│   ├── voices.html            ← Galeria + perfil individual dos Voices
│   ├── painel.html            ← Painel de gestão interno
│   └── dashboard.html         ← War Room (modo dashboard)
├── dashboard-escritorio.html  ← Office Engine 2D (modo game) ← AQUI
└── _versoes-office/           ← Snapshots históricos de versões anteriores
```

Deploy: **Railway** (https://epiuse-voices-optimizer.up.railway.app)  
Dev local: `http://localhost:3000`

---

## Rotas disponíveis

| URL | O que abre |
|---|---|
| `/` | Spawn gate (escolha Game ou Dashboard) |
| `/game` | Modo Game direto |
| `/dashboard` | War Room clássico |
| `/optimizer` | Profile Optimizer (Voices) |
| `/hub` | Marketing Hub |
| `/painel` | Painel interno |
| `/voices` | Galeria de Voices |
| `/_versoes-office/` | Histórico de versões para comparação |

---

## Modo Game — Estado atual (v3.0)

### Mapa
- **Tamanho:** 50×30 tiles × 32px = mundo 1600×960px
- **Câmera:** lerp(0.10), segue o player, clamped nas bordas
- **Colisão:** AABB, hitbox 14×14 do player

### Player
- Avatar EPI-USE (cor azul)
- Animação de caminhada 4 frames + bob
- Direção renderiza olhos, cabelo, sapatos
- Tag com nome do usuário sobre o avatar
- Velocidade: 180px/s, diagonal normalizada

### Áreas com carpetes coloridos

| Área | Cor |
|---|---|
| Voices | Azul |
| SAP Lab | Roxo |
| Optimizer | Esmeralda |
| Duda's Office | Mogno (sala fechada com porta ao sul) |
| Coffee Corner | Espresso |
| Events | Teal |
| ERP.ngo | Verde floresta |
| Marketing Hub | Violeta |

### Zonas interativas (14 total)
Quando o player chega perto, aparece um badge "E" pulsante. Ao pressionar E, a zona dispara uma ação.

| Zona | Ação |
|---|---|
| ☕ Coffee Corner | Modal de info (lore do programa) |
| 📺 Marketing Hub | iframe abre `/hub` |
| Anderson Costa | Modal com perfil do Voice |
| Carlos Furigo | Modal com perfil do Voice |
| Vagas ③④⑤⑥⑦ | Toast "em breve" |
| 🪪 Profile Optimizer | iframe abre `/optimizer` |
| 🐘 ERP.ngo Memorial | Abre erp.ngo em nova aba |
| 📊 Duda's Office | Toast "Módulo C a caminho" |
| 📅 Agenda de Eventos | Modal rico com calendário Q3–Q4 |
| ⚗️ SAP Lab | Toast "integração campanhas em breve" |

### HUD
- **Topo esquerda:** Logo "EPI-USE OFFICE" + nome da zona ativa
- **Topo direita:** Tag do usuário
- **Rodapé:** Versão + link para histórico de versões
- **Minimap:** Canto inferior direito (zonas coloridas + dot do player)
- **Interação:** Badge "E" pulsante com tooltip pill sobre zona ativa

### Modal iframe
- 93vw × 93vh
- Fecha com botão ✕ ou ESC ou click no backdrop

### Implementação técnica
- **Stack:** HTML5 Canvas + JS vanilla (zero frameworks, zero dependências externas)
- **Arquivo único:** CSS + JS embutidos no HTML (compatibilidade Google Drive)
- **Renderização:** `ctx.fillRect` (programmer art — sem arquivos PNG externos)
- **Single-file:** `dashboard-escritorio.html`

---

## Modo Dashboard — Estado atual (v3.0)

Arquivo: `dashboard-classic.html`

### Componentes
- 7 cards de projetos com status e progresso
- Bloco Voices Ativos com barra de progresso animada + 5 voice cards
- Roadmap com 5 prioridades + countdown (ex: 33d para SAP NOW)
- Time com 8 membros
- 4 alertas (warn/info)
- Calendário 2026 com 30 eventos organizados por mês, tags LoB coloridas
- Seção Histórico de Versões com links para versões anteriores
- Link 🎮 Modo Game no topo direito

---

## Ferramentas integradas (iframes/links)

### Profile Optimizer (`/optimizer`)
- Analisa screenshot de perfil LinkedIn de executivos (Voices)
- Gera kit completo com 12 seções: Headline, Sobre, Estratégia de Idioma, Linha Editorial 90 dias, Social Selling, KPIs, etc.
- Voices cadastrados: Anderson Costa, Carlos Furigo (+ vagas)
- Powered by Claude claude-opus-4-6, max_tokens: 8192

### Marketing Hub (`/hub`)
- Portal de marketing interno
- Acesso a templates, briefings, campanhas

### Painel (`/painel`)
- Gestão interna de Voices
- KPIs, status de dados (confirmados vs provisórios)
- Próxima versão: tabela de posts trackados + engajamento

---

## Sprints ativos

### v3.1 (em andamento)
- **Email de inscrição:** Notificação automática via Resend para `ruda.costa@epiuse.com.br` quando alguém preenche formulário "Seja um Voice"
- **Dados provisórios:** Banner amarelo visível nos perfis com campos não confirmados pelos executivos
- **Plausible Analytics:** Documentação de setup para ativar coleta (scripts já inseridos, conta pendente)

### v3.2 (planejado)
- **Voice Post Tracker:** Extensão Chrome que os Voices instalam, scrapa métricas dos próprios posts no LinkedIn e envia para o backend
- Dashboard de engajamento por post/Voice com histórico de snapshots
- Arquivo: `extension-chrome/` (Manifest V3, content script + service worker + popup)

---

## Histórico de versões (para comparação)

Cada versão anterior fica em `_versoes-office/` acessível via `/_versoes-office/nome-da-versao.html`. O footer do game e a seção do dashboard têm links para todas as versões — o objetivo é **comparar versões lado a lado** para não perder features entre iterações.

| Versão | O que tinha de notável |
|---|---|
| v2.0 | Primeiro game engine funcional (snapshot base) |
| v2.1 | Spawn gate com escolha Game/Dashboard, calendário de eventos, monitores animados |
| v3.0 | Maximalist sprint — Voices gallery, painel, LP, design completo |

---

## O que o Claude Design precisa saber

O **Office Engine é o hub central** da plataforma. Tudo passa por ele:

```
Usuário → Spawn Gate → [Game ou Dashboard]
                              ↓
                    Zonas / Cards → Optimizer · Hub · Voices · Painel
```

**Prioridades de design para próximas iterações:**
1. Melhorar densidade visual do mapa 2D (mesas mais próximas, ambientes mais definidos)
2. Consistência visual entre modo Game e modo Dashboard (mesma linguagem de marca)
3. Modal de eventos alinhado com o dashboard clássico (single source of truth = planilha SharePoint)
4. Onboarding visual da extensão Chrome (v3.2) dentro do perfil do Voice

**Restrição técnica importante:** o modo game é **single-file HTML** (sem build, sem bundler). Qualquer componente visual precisa ser implementável via `ctx.fillRect`, CSS embutido ou CDN público. Sem imagens externas no MVP.

---

*Documento gerado em: Mai 2026 | Fonte: Claude Code session logs + EPI-USE-OFFICE-MASTER-BRIEF.md*
