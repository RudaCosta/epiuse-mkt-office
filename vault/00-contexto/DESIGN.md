---
version: "4.0"
name: EPI-USE Brasil Office Design System (Brand Guide 2026)
description: "v4.0 (25/set/2026) — refeito 100% dentro do EPI-USE Brand Guide 2026 (decisão Rudá: 'deixa tudo dentro do branding book'). Red #CE181E (Pantone 199C), 6 secundárias azuis oficiais, spot colors por serviço, Lato (primária) + Open Sans (web body) + Calibri/Verdana (fallback). Aposentados: Codex #013A6A, Poppins, Maven Pro, Avenir, sub-paleta Stratview (IA). Valores sem página no guia estão marcados como ⚠️ derivado (tint/shade linear de cor oficial)."

# ============================================================================
# COLORS
# Fonte: EPI-USE Brand Guide 2026 · seção 02 Colors (primary · secondary · tertiary · spot)
# Legenda: [BG] = valor literal do Brand Guide · [⚠️ derivado] = mistura linear de 2 cores [BG]
# ============================================================================
colors:
  # ────────────────────────────────────────────────────────────────────────
  # EPI-USE — BRAND GUIDE 2026 (nomes oficiais)
  # ────────────────────────────────────────────────────────────────────────
  # PRIMARY — "mostly blue with an accent of red"
  brand-deep-blue:        "#001844"  # [BG] CMYK 100/76/12/68 · RGB 0/24/68 · Pantone 2768 C · RAL 5013
  brand-red:              "#CE181E"  # [BG] CMYK 0/100/100/15 · RGB 206/24/30 · Pantone 199 C · RAL 3000
  # SECONDARY
  brand-service-line-blue: "#26476b" # [BG] Pantone 7694 C · RAL 5000
  brand-dark-slate-blue:  "#355b7e"  # [BG] Pantone 7700 C
  brand-royal-blue:       "#487494"  # [BG] Pantone 7698 C
  brand-steel-blue:       "#5585a3"  # [BG] Pantone 7697 C
  brand-cornflower-blue:  "#6797b8"  # [BG] Pantone 7696 C
  brand-stone-gray:       "#f2f2f2"  # [BG] Pantone Cool Gray 1 C
  # TEXTO (PowerPoint template)
  brand-text-dark-grey:   "#231f20"  # [BG] body do PPT template

  # SPOT COLORS — exclusivas de linha de serviço ("use them accordingly")
  spot-charcoal-black:    "#313131"  # [BG] Pantone 7540 C
  spot-french-blue:       "#1670b9"  # [BG] Pantone 7690 C
  spot-pex-purple:        "#28255e"  # [BG] Pantone 2756 C · PEX
  spot-azure-blue:        "#0980bb"  # [BG] Pantone 640 C
  spot-ai-services-blue:  "#2042b1"  # [BG] Pantone 7685 C · AI Services
  spot-teal-green:        "#009193"  # [BG] Pantone 7716 C
  spot-servicenow-green:  "#53bb41"  # [BG] Pantone 360 C · ServiceNow
  spot-canary-yellow:     "#fae200"  # [BG] Pantone 102 C
  spot-aws-orange:        "#f89921"  # [BG] Pantone 1375 C · AWS

  # ────────────────────────────────────────────────────────────────────────
  # ALIASES DE COMPATIBILIDADE (nomes usados pelas telas desde v2 — valores agora [BG])
  # ────────────────────────────────────────────────────────────────────────
  primary-navy:         "#001844"  # = brand-deep-blue
  primary-red:          "#CE181E"  # = brand-red (era #cd1543)
  primary-charcoal:     "#231f20"  # = brand-text-dark-grey (era #272F3A)
  secondary-blue-light: "#6797b8"  # = cornflower (era #869ec3)
  secondary-blue-soft:  "#5585a3"  # = steel (era #8eafc6)
  secondary-blue-mid:   "#355b7e"  # = dark slate (era #395170)
  secondary-grey:       "#f2f2f2"  # = stone gray (era #cfd1d3)
  bg-light-1:           "#f2f2f2"  # = stone gray
  bg-light-2:           "#e6e5e5"  # ⚠️ derivado: stone gray 94% + dark grey 6%

  # ESCALA OPERACIONAL (UI) — montada só com os azuis do guia
  primary-50:   "#f2f2f2"  # = stone gray
  primary-100:  "#e1eaf1"  # ⚠️ derivado: cornflower 20% + branco
  primary-300:  "#6797b8"  # = cornflower
  primary-400:  "#487494"  # = royal blue
  primary-500:  "#26476b"  # ★ PRIMARY DO PRODUTO = service line blue (substitui Codex #013a6a)
  primary-600:  "#19375e"  # ⚠️ derivado: service line → deep blue 33%
  primary-700:  "#0d2851"  # ⚠️ derivado: service line → deep blue 66%
  primary-900:  "#001844"  # = deep blue (marca master)
  secondary-300: "#6797b8" # = cornflower
  secondary-500: "#5585a3" # = steel
  secondary-700: "#355b7e" # = dark slate
  secondary-technical: "#0980bb"  # = spot azure

  # SEMÂNTICAS — mapeadas para spot colors oficiais
  success-300: "#a0da96"   # ⚠️ derivado: servicenow green 55% + branco
  success-500: "#53bb41"   # = spot servicenow green
  warning-300: "#fae200"   # = spot canary yellow
  warning-500: "#f89921"   # = spot aws orange
  danger-300:  "#e9979a"   # ⚠️ derivado: brand red 45% + branco
  danger-500:  "#CE181E"   # = brand red (erro é o único uso "cheio" do vermelho em UI)
  info-300:    "#6797b8"   # = cornflower
  info-500:    "#0980bb"   # = spot azure
  ia-purple-300: "#a6b3e0" # ⚠️ derivado: AI services blue 40% + branco
  ia-purple-500: "#2042b1" # = spot AI services blue (conteúdo IA → cor de AI Services)
  accent-purple-300: "#b4b3c7" # ⚠️ derivado: PEX purple 35% + branco
  accent-purple-500: "#28255e" # = spot PEX purple
  service-now-purple: "#53bb41" # DEPRECATED (nome legado) — ServiceNow no guia é VERDE; usar spot-servicenow-green

  # ────────────────────────────────────────────────────────────────────────
  # NEUTRAL DARK (tema escuro Office — base deep blue)
  # ────────────────────────────────────────────────────────────────────────
  neutral-dark-bg:         "#001844"  # = deep blue
  neutral-dark-bg-2:       "#00102c"  # ⚠️ derivado: deep blue 65% + preto
  neutral-dark-surface:    "#0b2650"  # ⚠️ derivado: deep blue 70% + service line 30%
  neutral-dark-surface-2:  "#153259"  # ⚠️ derivado: deep blue 45% + service line 55%
  neutral-dark-border:     "rgba(103,151,184,0.22)"  # cornflower @22%
  neutral-dark-border-2:   "rgba(103,151,184,0.12)"
  neutral-dark-divider:    "rgba(103,151,184,0.12)"
  neutral-dark-text:       "#f2f2f2"  # = stone gray
  neutral-dark-text-dim:   "#c1d2de"  # ⚠️ derivado: stone gray 65% + cornflower 35%
  neutral-dark-text-muted: "#6797b8"  # = cornflower (5.8:1 sobre deep blue)
  neutral-dark-text-dimmest: "#5585a3" # = steel

  # ────────────────────────────────────────────────────────────────────────
  # NEUTRAL LIGHT (tema claro — base branco + stone gray)
  # ────────────────────────────────────────────────────────────────────────
  neutral-light-bg:        "#f2f2f2"  # = stone gray
  neutral-light-bg-2:      "#e6e5e5"  # ⚠️ derivado
  neutral-light-surface:   "#ffffff"
  neutral-light-surface-2: "#f2f2f2"  # = stone gray
  neutral-light-border:    "#d9d9d9"  # ⚠️ derivado: stone gray 88% + dark grey 12%
  neutral-light-border-2:  "#e6e5e5"  # ⚠️ derivado
  neutral-light-divider:   "#e6e5e5"
  neutral-light-text:      "#231f20"  # = PPT dark grey
  neutral-light-text-dim:  "#313131"  # = charcoal black
  neutral-light-text-muted: "#7b7979" # ⚠️ derivado: dark grey 60% + branco (4.3:1)
  neutral-light-text-dimmest: "#5585a3" # = steel

  # ────────────────────────────────────────────────────────────────────────
  # SUB-MARCAS com brand guide PRÓPRIO (fora do guia EPI-USE — mantidas por serem oficiais)
  # Usar SÓ em material da respectiva marca. Nunca misturar com EPI-USE.
  # ────────────────────────────────────────────────────────────────────────
  # GROUP ELEPHANT (GE Colour Palette 2019)
  ge-blue:           "#1C478A"  # CMYK 100/84/16/2 · RGB 28/71/138 · PRIMARY master holding
  ge-brown:          "#A37D57"  # CMYK 33/48/71/10 · RGB 163/125/87 · PRIMARY accent
  ge-dark-blue:      "#111B42"  # secondary
  ge-light-blue:     "#DCF1F9"  # secondary
  ge-grey:           "#ABACAB"  # secondary
  ge-red:            "#CC1F45"  # secondary
  # ERP.ngo (Brand Guide V1.0 — Copyright 2016) · Brand Guide EPI-USE 2026 seção 08 exige o selo "1% revenue"
  erp-blue:        "#131B41"  # CMYK 100/93/43/48 · RGB 19/27/65 · PRIMARY master ERP.ngo
  erp-blue-mid:    "#0066B2"  # CMYK 93/61/0/0 · RGB 0/102/178
  erp-blue-light:  "#BFDCF3"  # CMYK 23/5/0/0 · RGB 191/220/243
  erp-brown-mid:   "#74685B"  # CMYK 42/43/53/32 · RGB 116/104/91
  erp-brown-light: "#BBA997"  # CMYK 23/27/36/6 · RGB 187/169/151

# ============================================================================
# TYPOGRAPHY — Brand Guide 2026 · seção 05
#   "We use Lato for headlines and body copy in all our marketing material" → DISPLAY + material
#   "Open Sans ... primarily used for body copy on the website"             → BODY web
#   "Where Lato and Open Sans are not available ... Calibri or Verdana"     → FALLBACK
#   PPT/Word: Verdana (título 24–32pt · corpo 12–16pt #231f20)
# Leading (seção 06): 12/22pt · 10/20pt · 10/16pt · tracking 10 (= 0.01em)
# Mono (código/dados) = funcional, fora do escopo do guia; mantido só para <code>.
# ============================================================================
typography:
  display-lg:    { fontFamily: "Lato, Open Sans, Calibri, Verdana, sans-serif", fontSize: "40px", fontWeight: 900, lineHeight: 1.1, letterSpacing: "0.01em" }
  display-md:    { fontFamily: "Lato, Open Sans, Calibri, Verdana, sans-serif", fontSize: "32px", fontWeight: 700, lineHeight: 1.15, letterSpacing: "0.01em" }
  headline-lg:   { fontFamily: "Lato, Open Sans, Calibri, Verdana, sans-serif", fontSize: "26px", fontWeight: 700, lineHeight: 1.2, letterSpacing: "0.01em" }
  headline-md:   { fontFamily: "Lato, Open Sans, Calibri, Verdana, sans-serif", fontSize: "20px", fontWeight: 700, lineHeight: 1.3, letterSpacing: "0.01em" }
  headline-sm:   { fontFamily: "Lato, Open Sans, Calibri, Verdana, sans-serif", fontSize: "16px", fontWeight: 700, lineHeight: 1.4, letterSpacing: "0.01em" }
  body-lg:       { fontFamily: "Open Sans, Lato, Calibri, Verdana, sans-serif", fontSize: "16px", fontWeight: 400, lineHeight: 1.8, letterSpacing: "0.01em" }   # ≈ 12/22pt
  body-md:       { fontFamily: "Open Sans, Lato, Calibri, Verdana, sans-serif", fontSize: "14px", fontWeight: 400, lineHeight: 1.6, letterSpacing: "0.01em" }   # = 10/16pt
  body-sm:       { fontFamily: "Open Sans, Lato, Calibri, Verdana, sans-serif", fontSize: "12px", fontWeight: 400, lineHeight: 1.6, letterSpacing: "0.01em" }
  label-md:      { fontFamily: "Lato, Open Sans, Calibri, Verdana, sans-serif", fontSize: "13px", fontWeight: 700, lineHeight: 1.4, letterSpacing: "0.01em" }
  label-sm:      { fontFamily: "Lato, Open Sans, Calibri, Verdana, sans-serif", fontSize: "11px", fontWeight: 700, lineHeight: 1.4, letterSpacing: "0.06em", textTransform: "uppercase" }
  ppt-title:     { fontFamily: "Verdana, sans-serif", fontSize: "28px", fontWeight: 400, lineHeight: 1.0 }   # [BG] 24–32pt
  ppt-body:      { fontFamily: "Verdana, sans-serif", fontSize: "14px", fontWeight: 400, lineHeight: 1.0 }   # [BG] 12–16pt #231f20
  code-md:       { fontFamily: "JetBrains Mono, Consolas, monospace", fontSize: "12px", fontWeight: 500, lineHeight: 1.4 }
  code-sm:       { fontFamily: "JetBrains Mono, Consolas, monospace", fontSize: "10px", fontWeight: 500, lineHeight: 1.4 }
  pixel-display: { fontFamily: "'Press Start 2P', monospace", fontSize: "11px", fontWeight: 400, letterSpacing: "0.06em" }   # só /game

# ============================================================================
# SPACING · ROUNDED · ELEVATION
# Guia não define grid de UI; mantido o 4px-based. Sombra oficial = Illustrator spec (logo).
# ============================================================================
spacing:   { none: "0", xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "24px", 2xl: "32px", 3xl: "48px", 4xl: "64px", social-border: "120px" }
rounded:   { none: "0", sm: "4px", md: "8px", lg: "12px", xl: "16px", full: "9999px", logo-holder: "0" }
elevation:
  none: "none"
  sm:   "0 1px 2px rgba(0,24,68,0.08)"
  md:   "0 4px 12px rgba(0,24,68,0.12)"
  lg:   "0 8px 24px rgba(0,24,68,0.20)"
  xl:   "0 14px 40px rgba(0,24,68,0.30)"
  logo: "-3px 7px 5px rgba(0,0,0,0.12)"   # [BG] Illustrator: Multiply 12% · X -3 · Y 7 · Blur 5 · Black

# ============================================================================
# LOGO RULES — Brand Guide 2026 · seção 01
# ============================================================================
logo-rules:
  epi-use:
    elementos:         "símbolo 'E' + logotipo + círculo vermelho + ® — nunca separar"
    min-width-digital: "56px"
    min-width-print:   "20mm"
    isolation:         "largura do ícone 'E' em todos os lados"
    holder:            "logo full-color sobre quadrado BRANCO de cantos retos em assets de marca"
    posicao-social:    "canto superior direito (esquerdo só em exceção)"
    dropshadow:        "só em fundos claros (cinza/branco) e banners sociais — ver elevation.logo"
    versao-branca:     "evitar; se usar, só sobre fundo primary/secondary e nunca em fundo claro"
    versao-azul-clara: "EXCLUSIVA do site epiuse.com"
    co-branding:       "usar logo com 'A MEMBER OF:' · isolamento do 'E' entre marcas · mesma altura"
    nunca:
      - Remover elementos
      - Alterar a cor ou usar cor fora do guia
      - Usar sem o ® (registered trademark)
      - Adicionar elementos
      - Usar o logo antigo com sublinhado vermelho (proibido desde 01/out/2021)
  erp-ngo:
    min-width-digital: "38px"     # ERP Brand Guide V1.0 página 4
    min-width-print:   "10mm"
    isolation:         "height of letter E in ERP, all sides"
    file-svg-blue:     "/assets/logos-erp-ngo/erp-logo-blue.svg"
    file-svg-white:    "/assets/logos-erp-ngo/erp-logo-white.svg"
    tagline:           "Dedicated to protecting elephants and rhinos in the wild through alleviating poverty"
    domain:            "erp.ngo (SEMPRE lowercase)"
  group-elephant:
    file-svg:          "/assets/logos-group-elephant/ge-logo.svg"

# ============================================================================
# FORMATOS OFICIAIS — Brand Guide 2026 · seção 07 Templates
# ============================================================================
formats:
  social-main:        { size: "2048x1039", border: "120px", headline-max-chars: 65, headline-font: "Lato", logo: "topo direito, holder branco 100%" }
  social-service-line: { tag: "quadrado 60x60px no topo esquerdo na spot color do serviço", accent: "spot color substitui o vermelho", logo: "EPI-USE + descriptor do serviço" }
  blog-cta:           { size: "2048x1039" }
  email-signature-banner: { size: "900x300" }
  email-header:       { size: "2000x830" }
  letterhead:         { font: "Verdana 9pt" }
  proposal:           { regra: "nunca submeter proposta em PowerPoint — deck só como anexo/oral" }

# ============================================================================
# COMPONENTS
# ============================================================================
components:
  button-primary:        { backgroundColor: "{colors.primary-navy}", textColor: "#ffffff", typography: "{typography.label-md}", rounded: "{rounded.md}", padding: "10px 18px" }
  button-primary-red:    { backgroundColor: "{colors.primary-red}", textColor: "#ffffff", typography: "{typography.label-md}", rounded: "{rounded.md}", padding: "10px 18px" }   # uso RESTRITO (1 CTA por tela)
  button-secondary:      { backgroundColor: "rgba(103,151,184,0.12)", textColor: "{colors.secondary-blue-light}", typography: "{typography.label-md}", rounded: "{rounded.md}", padding: "8px 14px" }
  card:                  { backgroundColor: "{colors.neutral-dark-surface}", rounded: "{rounded.lg}", padding: "{spacing.lg}", elevation: "{elevation.sm}" }
  badge-real:            { backgroundColor: "rgba(83,187,65,0.14)",  textColor: "{colors.success-300}" }
  badge-manual:          { backgroundColor: "rgba(250,226,0,0.10)",  textColor: "{colors.warning-300}" }
  badge-pending:         { backgroundColor: "rgba(248,153,33,0.12)", textColor: "{colors.warning-500}" }
  badge-aguarda:         { backgroundColor: "rgba(32,66,177,0.16)",  textColor: "{colors.ia-purple-300}" }
  badge-ia:              { backgroundColor: "rgba(32,66,177,0.16)",  textColor: "{colors.ia-purple-300}" }
  badge-projecao:        { backgroundColor: "rgba(103,151,184,0.12)", textColor: "{colors.secondary-blue-light}" }
  alert-warn:            { backgroundColor: "rgba(248,153,33,0.10)", textColor: "{colors.warning-300}", rounded: "{rounded.md}", padding: "12px 16px" }
  alert-info:            { backgroundColor: "rgba(9,128,187,0.10)", textColor: "{colors.secondary-blue-light}", rounded: "{rounded.md}", padding: "12px 16px" }
  alert-danger:          { backgroundColor: "rgba(206,24,30,0.10)", textColor: "{colors.danger-300}", rounded: "{rounded.md}", padding: "12px 16px" }
---

# EPI-USE Brasil — Office Design System v4.0 (25/set/2026)

> **Fonte única:** EPI-USE Brand Guide 2026 — Drive `EPI-USE Brand Guide 2026.pdf` (id `1TuOfKEr2SXG24MFpjdnXaeW3s2pYK56c`).
> Decisão Rudá 25/set: **tudo dentro do branding book**. Tokens sem página no guia estão marcados `⚠️ derivado` no YAML.
>
> ⚠️ O PDF ainda carrega nome interno `Brand Guide 2022_V1.1.indd` e trechos lorem ipsum (templates, service logos). Validar com a Duda/global se é a versão final aprovada.

## O que mudou vs v3.1

| Item | v3.1 | v4.0 (Brand Guide) |
|---|---|---|
| Vermelho | `#cd1543` | **`#CE181E`** (Pantone 199 C) |
| Primary do produto | Codex `#013a6a` | **Service line blue `#26476b`** |
| Secundárias | `#869ec3` · `#cfd1d3` | **6 azuis oficiais + stone gray `#f2f2f2`** |
| Spot colors | — | **9 cores por serviço** (PEX, AI, AWS, ServiceNow…) |
| Display font | Poppins → Maven Pro | **Lato** (self-hosted `/assets/fonts/lato/`) |
| Body web | Open Sans | **Open Sans** (mantida) |
| Fallback | Verdana | **Calibri → Verdana** |
| Semânticas | Tailwind-like | **Spot colors oficiais** |
| Stratview | sub-paleta IA | **Removida** (não existe no guia) |
| Logo mínimo print | 15mm | **20mm** |

## Cores — regras de uso

- **Composição:** "mostly blue with an accent of red". Deep blue domina; secundárias dão profundidade.
- **Vermelho = terciário/reservado.** Usar com parcimônia: bullets de proposta, acentos em ícone, erro em UI. **Nunca predominante em tabelas ou gráficos.**
- **Spot colors são de linha de serviço** (PEX `#28255e`, AI Services `#2042b1`, AWS `#f89921`, ServiceNow `#53bb41`…). Em material de serviço, a spot substitui o vermelho.
- **Dataviz:** série principal deep blue / service line; séries seguintes na ordem `#26476b → #487494 → #6797b8 → #355b7e → #5585a3`. Vermelho só para destacar 1 ponto.

## Tipografia

| Camada | Fonte | Onde |
|---|---|---|
| Headlines + material de marketing | **Lato** | títulos, labels, peças, social (headline ≤ 65 caracteres) |
| Body web | **Open Sans** | texto corrido de telas e site |
| Fallback | **Calibri → Verdana** | quando Lato/Open Sans indisponíveis |
| PPT / Word | **Verdana** | título 24–32pt · corpo 12–16pt `#231f20` · letterhead 9pt |
| Código/dados | JetBrains Mono | funcional, só `<code>` |

Leading oficial: **12/22pt · 10/20pt · 10/16pt**, tracking 10.

## Logo

- Mínimo **56px / 20mm**. Isolamento = largura do "E".
- Em asset de marca: **logo full-color num quadrado branco de cantos retos**, canto superior direito.
- Evitar versão branca. Versão azul-clara é **exclusiva do epiuse.com**.
- Nunca: separar elementos, trocar cor, tirar o ®, adicionar elementos, usar o logo antigo com sublinhado vermelho.
- Dropshadow só em fundos claros e banners sociais (spec em `elevation.logo`).

## Imagens (seção 04)

Natureza e animais, fotos autênticas e em alta qualidade. **Nunca** animais em estado não-natural (jaula, aquário). Ícones: contido (quadrado com sombra) ou outline; acento em spot color quando for serviço.

## Formatos (seção 07)

Social 2048×1039 com borda de 120px · social de serviço com quadrado 60×60 na spot color · assinatura de e-mail 900×300 · header de e-mail 2000×830 · **proposta nunca em PowerPoint**.

## Institucional (seção 08)

Selo **ERP 1% revenue** + snippet groupelephant.com ("largely employee-owned… 'Beyond Corporate Purpose'") em material institucional.

## Do's and Don'ts

### ✅ Do
- Consumir tokens (`var(--color-primary-navy)`), nunca hex solto
- Lato em títulos, Open Sans em texto corrido
- Vermelho só como acento
- Separar sub-marcas (GE, ERP.ngo) do EPI-USE

### ❌ Don't
- Poppins, Maven Pro, Avenir, Inter, Roboto (fora do guia)
- `#cd1543`, `#013a6a`, `#869ec3`, `#cfd1d3` (aposentados)
- Vermelho predominante em tabela/gráfico
- Criar cor nova sem passar por este arquivo

---

> **Workflow:** editar este arquivo → `python scripts/design/gen_tokens.py` → reload → validar em `/design`.
