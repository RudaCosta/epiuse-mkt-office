# 🎬 EPI-USE Office · Remotion Engine

Engine de vídeos animados do EPI-USE Office. Todos os MP4/WebM que aparecem no app (heros, voice reels, daily digest, aniversários, intro do relatório) são gerados aqui.

## 📦 Setup (1ª vez)

```bash
cd C:/epiuse-mkt-office/remotion-engine
npm install        # ~150MB · baixa Remotion + React + Chromium headless
```

## 🚀 Workflow

### Opção A · Studio interativo (preview)
```bash
npm start          # abre Remotion Studio em http://localhost:3000
```
Você vê todas as compositions, arrasta timeline, ajusta props, exporta direto da UI.

### Opção B · Render tudo de uma vez (batch)
```bash
npm run build:all  # renderiza HomeHero, VoiceReel, Aniversario, DailyDigest, RelatorioIntro
                   # → ../public/videos/*.mp4
```

### Opção C · Render individual
```bash
npm run build:home              # HomeHero · 12s · 1920x400 (banner hero)
npm run build:home-webm         # mesmo, mas WebM (mais leve pra web)
npm run build:voice-reel        # template 30s 9:16
npm run build:aniversario       # template 6s 1:1
npm run build:daily             # daily digest 15s 1:1
npm run build:relatorio-intro   # intro 8s 16:9
```

## 🎨 Compositions disponíveis

| ID | Tamanho | Duração | Onde aparece no Office |
|---|---|---|---|
| `HomeHero` | 1920x400 | 12s loop | `/` (banner topo) |
| `VoiceReel` | 1080x1920 | 30s | LinkedIn pro Voice (Anderson, Furigo, etc) |
| `AniversarioCard` | 1080x1080 | 6s | Slack/Teams quando alguém faz aniversário |
| `DailyDigest` | 1080x1080 | 15s loop | `/painel` (canto, mute, autoplay) |
| `RelatorioIntro` | 1920x1080 | 8s | `/relatorio` (topo, antes dos cards) |

## 🔧 Render personalizado

Pra gerar um Voice Reel pro Carlos Furigo:

```bash
# 1. Cria props/furigo.json
echo '{
  "nome": "Carlos Furigo Cardoso",
  "cargo": "Service Line Director — Tech",
  "empresa": "EPI-USE Brasil",
  "ssi_baseline": 34,
  "ssi_atual": 58,
  "seguidores_atual": 1850,
  "posts_mes": 6,
  "pilares": ["SAP S/4HANA", "BTP", "Arquitetura de Integração"],
  "call_to_action": "Vamos conversar sobre SAP?"
}' > props/furigo.json

# 2. Renderiza
npx remotion render VoiceReel ../public/videos/voice-furigo.mp4 --props=./props/furigo.json
```

## 🌐 Onde os MP4s ficam embedados no app

| Arquivo | Onde é referenciado |
|---|---|
| `public/videos/home-hero.webm` | `public/home.html` — `<video>` no hero |
| `public/videos/voice-reel-template.mp4` | `public/voices.html` — preview do template |
| `public/videos/daily-digest.mp4` | `public/painel.html` — canto direito loop |
| `public/videos/relatorio-intro.mp4` | `public/relatorio.html` — topo antes dos cards |
| `public/videos/aniversario-template.mp4` | `public/remotion.html` — preview do template |

## 📁 Estrutura

```
remotion-engine/
├── package.json           ← deps Remotion + React
├── tsconfig.json
├── remotion.config.ts
├── src/
│   ├── index.ts           ← entry point
│   ├── Root.tsx           ← registra as 5 compositions
│   ├── lib/
│   │   └── brand.ts       ← Brand Guide V1.1 (cores + fontes + easing)
│   └── comps/
│       ├── HomeHero.tsx
│       ├── VoiceReel.tsx
│       ├── AniversarioCard.tsx
│       ├── DailyDigest.tsx
│       └── RelatorioIntro.tsx
├── scripts/               ← scripts utilitários (render-all.ps1)
└── out/                   ← outputs locais (gitignored)
```

## ⚠️ Restrições

- **Não funciona no Railway prod direto** — Remotion precisa Chromium headless (~350MB). Sempre **pré-renderiza local** e commita os MP4 em `public/videos/` (que aí o Railway serve normal).
- **CSS animations/transitions são proibidas dentro do Remotion** — use `interpolate()` + `Easing` em vez disso.
- **Tailwind também não** — só CSS inline ou módulos compilados.

## 🗺️ Roadmap

- ✅ S20: estrutura + 5 compositions + integração nas 4 telas principais
- 📅 S21: cron mensal que regenera todos os MP4 quando dados mudam (ex: novo Voice → re-render template)
- 📅 S22: endpoint `/api/videos/render?comp=X&props=Y` pra outros agentes (Cowork) invocarem
- 📅 S23: scheduled job semanal gera Relatório Semanal Animado e posta no Slack
- 📅 S24: integração com TTS (ElevenLabs) pra voiceover automático nos vídeos
