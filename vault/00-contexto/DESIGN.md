---
version: "3.0"
name: EPI-USE Brasil Office Design System (Codex)
description: v3.0 (30/mai/2026) — adota a paleta operacional Codex (#013A6A primary + Open Sans + surfaces claras), decisão Rudá. Preserva marcas oficiais (GE · EPI-USE navy #001844 · ERP.ngo) como sub-paletas e o tema DARK completo. Camada clean p/ produto digital sobre a base de marca.

# ============================================================================
# COLORS — 3 hierarquias oficiais (Group Elephant > EPI-USE > ERP.ngo)
# ============================================================================
colors:
  # ────────────────────────────────────────────────────────────────────────
  # GROUP ELEPHANT (holding mãe — GE Colour Palette 2019)
  # ────────────────────────────────────────────────────────────────────────
  ge-blue:           "#1C478A"  # CMYK 100/84/16/2 · RGB 28/71/138 · PRIMARY master holding
  ge-brown:          "#A37D57"  # CMYK 33/48/71/10 · RGB 163/125/87 · PRIMARY accent
  ge-dark-blue:      "#111B42"  # secondary
  ge-light-blue:     "#DCF1F9"  # secondary
  ge-grey:           "#ABACAB"  # secondary
  ge-red:            "#CC1F45"  # secondary

  # ────────────────────────────────────────────────────────────────────────
  # EPI-USE BRASIL (Brand Guide V1.1 + confirmado uso real PPT Template Jan 2026)
  # ────────────────────────────────────────────────────────────────────────
  primary-navy:        "#001844"  # Brand Guide V1.1 · 17x no template · cor MASTER EPI-USE
  primary-red:         "#cd1543"  # Brand Guide V1.1 · 32x no template · accent corporate
  primary-charcoal:    "#272F3A"  # 80x no template real (mais usada) · body text
  secondary-blue-light: "#869ec3" # Brand Guide V1.1 oficial
  secondary-blue-soft:  "#8eafc6" # 26x no template (variação prática ≈3% drift)
  secondary-blue-mid:   "#395170" # 16x no template · azul médio
  secondary-grey:       "#cfd1d3" # Brand Guide V1.1
  bg-light-1:           "#f7f7f7" # background off-white
  bg-light-2:           "#ebebeb" # background light grey

  # ────────────────────────────────────────────────────────────────────────
  # CODEX OPERATIONAL SCALE (v0.7.0 — paleta do produto digital, decisão Rudá 30/mai)
  # Camada operacional mais clean p/ UI. Preserva #001844 como primary-900 (marca master).
  # ────────────────────────────────────────────────────────────────────────
  primary-50:   "#f0f4f8"  # surface-blue (fundo claro base)
  primary-100:  "#dcEaf5"
  primary-300:  "#6797b7"  # Codex secondary (azul claro)
  primary-400:  "#0070bf"  # Codex primary-bright
  primary-500:  "#013a6a"  # ★ Codex PRIMARY — cor principal do produto
  primary-600:  "#002f5c"
  primary-700:  "#002355"  # Codex primary-dark
  primary-900:  "#001844"  # = primary-navy EPI-USE (marca master preservada)
  secondary-300: "#8faec4"
  secondary-500: "#6797b7"  # Codex secondary
  secondary-700: "#174485"  # Codex secondary-dark
  secondary-technical: "#046594"  # Codex (azul técnico)

  # ────────────────────────────────────────────────────────────────────────
  # ERP.ngo (Brand Guide V1.0 — Copyright 2016)
  # ────────────────────────────────────────────────────────────────────────
  erp-blue:        "#131B41"  # CMYK 100/93/43/48 · RGB 19/27/65 · PRIMARY master ERP.ngo
  erp-blue-mid:    "#0066B2"  # CMYK 93/61/0/0 · RGB 0/102/178
  erp-blue-light:  "#BFDCF3"  # CMYK 23/5/0/0 · RGB 191/220/243
  erp-brown-mid:   "#74685B"  # CMYK 42/43/53/32 · RGB 116/104/91
  erp-brown-light: "#BBA997"  # CMYK 23/27/36/6 · RGB 187/169/151

  # ────────────────────────────────────────────────────────────────────────
  # SEMANTIC (UI status indicators)
  # ────────────────────────────────────────────────────────────────────────
  success-300: "#6ee7b7"
  success-500: "#059669"  # Codex (verde)
  warning-300: "#fcd34d"
  warning-500: "#d97706"  # Codex (laranja)
  danger-300:  "#fca5a5"
  danger-500:  "#dc2626"  # Codex (vermelho)
  info-300:    "#6797b7"  # Codex secondary
  info-500:    "#0070bf"  # Codex primary-bright (azul info)
  ia-purple-300: "#c4b5fd"
  ia-purple-500: "#a78bfa"
  accent-purple-300: "#c4b5fd"
  accent-purple-500: "#a78bfa"  # alias usado pelo gen_tokens (--purple)
  service-now-purple: "#6a1b9a"  # Codex (ServiceNow brand)

  # ────────────────────────────────────────────────────────────────────────
  # NEUTRAL DARK (tema padrão Office UI)
  # ────────────────────────────────────────────────────────────────────────
  neutral-dark-bg:         "#0a1525"
  neutral-dark-bg-2:       "#050d18"
  neutral-dark-surface:    "#0f1e35"
  neutral-dark-surface-2:  "#142547"
  neutral-dark-border:     "rgba(134,158,195,0.18)"
  neutral-dark-text:       "#e6ebf2"
  neutral-dark-text-dim:   "#c0ccd9"
  neutral-dark-text-muted: "#869ec3"
  neutral-dark-text-dimmest: "#6e8099"
  neutral-dark-border-2:   "rgba(134,158,195,0.10)"
  neutral-dark-divider:    "rgba(134,158,195,0.10)"

  # ────────────────────────────────────────────────────────────────────────
  # NEUTRAL LIGHT (tema claro corporate — usa cores oficiais)
  # ────────────────────────────────────────────────────────────────────────
  neutral-light-bg:        "#f0f4f8"   # Codex surface-blue (fundo claro base)
  neutral-light-bg-2:      "#e7e6e6"   # Codex neutral-200
  neutral-light-surface:   "#ffffff"
  neutral-light-surface-2: "#f5f7fa"   # Codex surface-muted
  neutral-light-border:    "#d7dad6"   # Codex neutral-300
  neutral-light-border-2:  "#e7e6e6"   # Codex neutral-200
  neutral-light-text:      "#1f2933"   # Codex neutral-950
  neutral-light-text-dim:  "#424242"   # Codex neutral-800
  neutral-light-text-muted: "#797979"  # Codex neutral-700
  neutral-light-text-dimmest: "#8faec4" # Codex neutral-500
  neutral-light-divider:   "#e7e6e6"

# ============================================================================
# TYPOGRAPHY — hierarquia de fontes por brand
# ============================================================================
# WEB STACK FINAL (decisão Rudá 28/mai):
#   PRIMARY (headlines): Open Sans (self-hosted) → Maven Pro (Brand Guide ideal) → System fallback
#   SECONDARY (body):    Open Sans (self-hosted, confirmada por Rudá) → Verdana → Arial
#   CODE/NUMBERS:        JetBrains Mono → Consolas
#   PIXEL (só /game):    Press Start 2P
# ============================================================================
typography:
  display-lg:    { fontFamily: "Open Sans, Maven Pro, Verdana, Arial, sans-serif", fontSize: "40px", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em" }
  display-md:    { fontFamily: "Open Sans, Maven Pro, Verdana, Arial, sans-serif", fontSize: "32px", fontWeight: 700, lineHeight: 1.15 }
  headline-lg:   { fontFamily: "Open Sans, Maven Pro, Verdana, Arial, sans-serif", fontSize: "26px", fontWeight: 700, lineHeight: 1.2 }
  headline-md:   { fontFamily: "Open Sans, Maven Pro, Verdana, Arial, sans-serif", fontSize: "20px", fontWeight: 700, lineHeight: 1.3 }
  headline-sm:   { fontFamily: "Open Sans, Maven Pro, Verdana, Arial, sans-serif", fontSize: "16px", fontWeight: 700, lineHeight: 1.4 }
  body-lg:       { fontFamily: "Open Sans, Verdana, Arial, sans-serif", fontSize: "16px", fontWeight: 400, lineHeight: 1.55 }
  body-md:       { fontFamily: "Open Sans, Verdana, Arial, sans-serif", fontSize: "14px", fontWeight: 400, lineHeight: 1.5 }
  body-sm:       { fontFamily: "Open Sans, Verdana, Arial, sans-serif", fontSize: "12px", fontWeight: 400, lineHeight: 1.45 }
  label-md:      { fontFamily: "Open Sans, Verdana, Arial, sans-serif", fontSize: "13px", fontWeight: 600, lineHeight: 1.4 }
  label-sm:      { fontFamily: "Open Sans, Verdana, Arial, sans-serif", fontSize: "11px", fontWeight: 700, lineHeight: 1.4, letterSpacing: "0.06em", textTransform: "uppercase" }
  code-md:       { fontFamily: "JetBrains Mono, Consolas, monospace", fontSize: "12px", fontWeight: 500, lineHeight: 1.4 }
  code-sm:       { fontFamily: "JetBrains Mono, Consolas, monospace", fontSize: "10px", fontWeight: 500, lineHeight: 1.4 }
  pixel-display: { fontFamily: "'Press Start 2P', monospace", fontSize: "11px", fontWeight: 400, letterSpacing: "0.06em" }

# ============================================================================
# SPACING · ROUNDED · ELEVATION (consistentes)
# ============================================================================
spacing:   { none: "0", xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "24px", 2xl: "32px", 3xl: "48px", 4xl: "64px" }
rounded:   { none: "0", sm: "4px", md: "8px", lg: "12px", xl: "16px", full: "9999px" }
elevation:
  none: "none"
  sm:   "0 1px 2px rgba(0,24,68,0.08)"
  md:   "0 4px 12px rgba(0,24,68,0.12)"
  lg:   "0 8px 24px rgba(0,24,68,0.20)"
  xl:   "0 14px 40px rgba(0,24,68,0.30)"

# ============================================================================
# LOGO RULES (por brand)
# ============================================================================
logo-rules:
  epi-use:
    min-width-digital: "56px"     # Brand Guide V1.1 página 4
    min-width-print:   "15mm"
    isolation:         "height of letter E in the logo, all sides"
    file-svg-blue:     "/assets/logos-epi-use/(a copiar)"
    nunca:
      - Alterar cor
      - Usar sem trademark ™
      - Remover elementos
      - Reverse em foto/bg busy
  erp-ngo:
    min-width-digital: "38px"     # ERP Brand Guide V1.0 página 4
    min-width-print:   "10mm"
    isolation:         "height of letter E in ERP, all sides"
    file-svg-blue:     "/assets/logos-erp-ngo/erp-logo-blue.svg"
    file-svg-white:    "/assets/logos-erp-ngo/erp-logo-white.svg"
    tagline:           "Dedicated to protecting elephants and rhinos in the wild through alleviating poverty"
    domain:            "erp.ngo (SEMPRE lowercase)"
    co-branding:       "Divider line primary blue equivalente a 2d, centre vertically"
  group-elephant:
    file-svg:          "/assets/logos-group-elephant/ge-logo.svg"

# ============================================================================
# COMPONENTS
# ============================================================================
components:
  button-primary:        { backgroundColor: "{colors.primary-navy}", textColor: "#ffffff", typography: "{typography.label-md}", rounded: "{rounded.md}", padding: "10px 18px" }
  button-primary-red:    { backgroundColor: "{colors.primary-red}", textColor: "#ffffff", typography: "{typography.label-md}", rounded: "{rounded.md}", padding: "10px 18px" }
  button-secondary:      { backgroundColor: "rgba(134,158,195,0.12)", textColor: "{colors.secondary-blue-light}", typography: "{typography.code-md}", rounded: "{rounded.md}", padding: "8px 14px" }
  card:                  { backgroundColor: "{colors.neutral-dark-surface}", rounded: "{rounded.lg}", padding: "{spacing.lg}", elevation: "{elevation.sm}" }
  badge-real:            { backgroundColor: "rgba(16,185,129,0.12)",  textColor: "{colors.success-300}" }
  badge-manual:          { backgroundColor: "rgba(251,191,36,0.10)",  textColor: "{colors.warning-300}" }
  badge-pending:         { backgroundColor: "rgba(249,115,22,0.10)",  textColor: "#fdba74" }
  badge-aguarda:         { backgroundColor: "rgba(167,139,250,0.12)", textColor: "{colors.ia-purple-300}" }
  badge-ia:              { backgroundColor: "rgba(167,139,250,0.10)", textColor: "{colors.ia-purple-300}" }
  badge-projecao:        { backgroundColor: "rgba(134,158,195,0.10)", textColor: "{colors.secondary-blue-light}" }
  alert-warn:            { backgroundColor: "rgba(251,191,36,0.08)", textColor: "{colors.warning-300}", rounded: "{rounded.md}", padding: "12px 16px" }
  alert-info:            { backgroundColor: "rgba(134,158,195,0.10)", textColor: "{colors.secondary-blue-light}", rounded: "{rounded.md}", padding: "12px 16px" }
  alert-danger:          { backgroundColor: "rgba(205,21,67,0.08)", textColor: "#fca5a5", rounded: "{rounded.md}", padding: "12px 16px" }
---

# EPI-USE Brasil — Office Design System v2.0 (28/mai/2026)

> **Refeito do zero** após auditoria de 3 brand guides oficiais.
> Fontes em `vault/00-contexto/brand-guide-oficial/`:
> - `epiuse/EPIUSE Brand Guide V1.1.pdf`
> - `erp-ngo/ERP _ ERPA Branding Standards Guide.pdf`
> - `group-elephant/Group Elephant Brand Guide_April 2024.pdf`
> - `group-elephant/GE Colour Palette.pdf`
> - `Reports/.../EPI-USE_PPT_Template (Effective Jan 2026).pdf` (uso real)

## Hierarquia de 3 brands

```
Group Elephant Limited (holding)         GE Blue #1C478A · GE Brown #A37D57
    ├── EPI-USE Brasil (operadora SAP)   Navy #001844 · Red #cd1543 · Charcoal #272F3A
    └── ERP.ngo (NGO institucional)      ERP Blue #131B41 · Mid Blue #0066B2 · Browns
```

**Regra ouro:** **NUNCA misturar tokens das 3 marcas**. Cada brand tem seu papel:
- Group Elephant — holding · usado em material corporativo do grupo
- EPI-USE — operação BR · usado no Office (`primary-*` tokens)
- ERP.ngo — institucional NGO · usado em referências ao programa de impacto

## Tipografia (decisão final 28/mai)

| Camada | Fonte | Onde |
|---|---|---|
| Primary headlines/body | **Open Sans** (self-hosted `/assets/fonts/open-sans/`) | UI inteira do Office |
| Fallback corporate | Maven Pro (EPI-USE Brand Guide) → Verdana (template real) → Arial | quando Open Sans não carrega |
| Code/Numbers | JetBrains Mono → Consolas | tokens técnicos, dados |
| Pixel | Press Start 2P | apenas `/game` |

**Importante:** Open Sans **confirmada pelo Rudá** como fonte oficial secundária (28/mai/2026). Substitui a sugestão anterior (Avenir do Brand Guide V1.1 — que era aspiracional e não-Google-Fonts).

## Logos (3 SVGs disponíveis em `/assets/logos-*/`)

| Brand | Path | Min digital | Isolação |
|---|---|---|---|
| EPI-USE | `/assets/logos-epi-use/(a copiar)` | 56px | altura do "E" |
| ERP.ngo Blue | `/assets/logos-erp-ngo/erp-logo-blue.svg` | 38px | altura do "E" de ERP |
| ERP.ngo White | `/assets/logos-erp-ngo/erp-logo-white.svg` | 38px | (fundos escuros) |
| Group Elephant | `/assets/logos-group-elephant/ge-logo.svg` | — | — |

## Do's and Don'ts

### ✅ Do
- Usar **Open Sans** em toda UI (web)
- Usar tokens semânticos (`var(--color-primary-navy)`) — nunca hex hardcoded
- **Preservar separação 3 brands** — nunca usar GE Blue onde deveria ser EPI-USE Navy
- ERP.ngo tagline **sempre completa** quando aparecer
- Domínio `erp.ngo` **sempre lowercase**
- Badges semânticas pra dados (Regra 7)

### ❌ Don't
- Não usar Inter, Roboto, Lato (não-oficiais)
- Não inventar variantes locais — adicionar no DESIGN.md primeiro
- Não misturar Group Elephant Blue (`#1C478A`) com EPI-USE Navy (`#001844`) — são marcas distintas
- Não publicar logos sem trademark ™ / ®
- Não usar verde em fotos ERP.ngo (regra brand guide: "dull the green tone")

---

> **Workflow:** mudou tokens? Editar este arquivo → rodar `python modulo-a-profile-optimizer/scripts/design/gen_tokens.py` → reload. Validar em `/design`.

> **Versão:** 2.0 OFICIAL (refeito 28/mai/2026 com 3 brand guides + Open Sans confirmada).
