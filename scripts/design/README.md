# 🎨 EPI-USE Office — Design Tokens Generator

> Implementação local do [Google Labs DESIGN.md spec](https://github.com/google-labs-code/design.md).

## TL;DR

```bash
# 1. Editar tokens
$EDITOR vault/00-contexto/DESIGN.md

# 2. Regenerar (local)
cd modulo-a-profile-optimizer
python scripts/design/gen_tokens.py

# 3. Visualizar
open http://localhost:3000/design
```

## Fluxo

```
vault/00-contexto/DESIGN.md  ← FONTE DA VERDADE (editar aqui)
            │
            ▼
   scripts/design/gen_tokens.py
            │
            ├──► public/design-tokens.css       (CSS vars, consumido por todas as telas)
            └──► public/api/design-tokens.json  (consumido por /design viewer e tooling)
```

## Estrutura do DESIGN.md

YAML frontmatter (entre `---`) com 6 seções:
- `colors` — 52 tokens (primary/secondary/tertiary/brand/semantic/neutral-dark/neutral-light)
- `typography` — 13 levels (display/headline/body/label/code/pixel)
- `spacing` — 9 levels (xs–4xl)
- `rounded` — 6 levels (none–full)
- `elevation` — 5 levels (none–xl)
- `components` — 12 atômicos (button, card, badge-*, alert-*)

Markdown body com seções: Overview · Colors · Typography · Layout · Elevation · Shapes · Components · Do's/Don'ts.

## Convenções de naming

| Tipo | Padrão | Exemplo |
|---|---|---|
| Color | `<role>-<scale>` | `primary-500` · `secondary-100` · `success-500` |
| Brand | `brand-<empresa>-<role>` | `brand-epiuse-blue` |
| Neutral por theme | `neutral-<theme>-<role>` | `neutral-dark-surface` · `neutral-light-text` |
| Typography | `<categoria>-<size>` | `headline-lg` · `body-md` · `code-sm` |
| Spacing | escala `t-shirt` | `xs · sm · md · lg · xl · 2xl · 3xl · 4xl` |
| Rounded | escala `t-shirt` | `none · sm · md · lg · xl · full` |
| Elevation | escala `t-shirt` | `none · sm · md · lg · xl` |
| Component | `<role>-<variant>` | `button-primary` · `alert-warn` · `badge-real` |

## Token references

Use `{path.to.token}` em qualquer valor:
```yaml
components:
  button-primary:
    backgroundColor: "{colors.primary-500}"  # → "#2563eb"
    typography: "{typography.label-md}"      # → objeto completo
    rounded: "{rounded.md}"                  # → "8px"
```

## Output CSS

`public/design-tokens.css` (~7KB · 198 linhas):

```css
:root {
  /* COLORS */
  --color-primary-500: #2563eb;
  --color-secondary-500: #131B41;
  /* ... 52 colors */

  /* SPACING */
  --space-xs: 4px;
  --space-md: 12px;

  /* TYPOGRAPHY (cada level vira N vars) */
  --type-headline-lg-font-family: "Inter";
  --type-headline-lg-font-size: 26px;
  --type-headline-lg-font-weight: 700;
}

/* Theme bindings */
:root, [data-theme="dark"] {
  --color-surface: var(--color-neutral-dark-surface);
  --color-text: var(--color-neutral-dark-text);
  /* ... */
}
[data-theme="light"] {
  --color-surface: var(--color-neutral-light-surface);
  /* ... */
}

/* Aliases legados (compat com telas antigas) */
:root {
  --bg: var(--color-bg);
  --text: var(--color-text);
  --primary: var(--color-primary-500);
  /* ... */
}
```

## Como uma tela consome

```html
<head>
  <link rel="stylesheet" href="/design-tokens.css">
</head>
<style>
  .card {
    background: var(--color-surface);
    color: var(--color-text);
    padding: var(--space-lg);
    border-radius: var(--rounded-lg);
    box-shadow: var(--elevation-sm);
  }
</style>
```

## Telas refatoradas (consumindo tokens)

| Tela | Status |
|---|---|
| `/design` | 🟢 100% (consome tokens diretamente) |
| `/metas-fy26` | 🟢 100% (refactor completo) |
| `/relatorio` | 🟢 100% (refactor completo) |
| `/dashboard` | 🟢 link + aliases (usa `--bg`, `--text` automatic) |
| `/artigos`, `/jornadas`, `/projecoes`, `/pipeline` | 🟡 pendente (próxima sprint) |
| `/optimizer`, `/voices`, `/cases`, `/inbound/*` | 🟡 pendente (próxima sprint) |
| `office-nav.js`, `office-footer.js` | ⚠️ Shadow DOM — precisa abordagem específica (refactor v0.6.1) |

## Troubleshooting

**Tela ficou sem cor após refactor**
- Verificar se `<link rel="stylesheet" href="/design-tokens.css">` está no `<head>`
- Confirmar que CSS vars usadas existem (ver `public/design-tokens.css`)
- Aliases legados (`--bg`, `--text`) garantem compat mas só funcionam com link presente

**Dark/Light mode não funciona**
- O toggle deve setar `<html data-theme="light">` ou `data-theme="dark"`
- `[data-theme="light"]` no CSS substitui as vars neutras

**Shadow DOM (`<office-nav>`, `<office-footer>`) não pega tokens**
- Conhecido — Shadow DOM precisa injetar vars manualmente
- Solução prevista pra v0.6.1: hook em `connectedCallback` lendo `getComputedStyle(document.documentElement)`

## Quando regenerar

- ✏️ Toda vez que editar `DESIGN.md`
- ✏️ Antes de commit que inclui mudança em tokens (CI poderia auto-rodar)
- ✏️ Após `git pull` se outro dev mudou tokens (geração é determinística)

## Dependências

```bash
pip install pyyaml
```

## Versionamento

DESIGN.md tem campo `version: alpha` no frontmatter — bump quando adicionar/quebrar tokens em escala.

Versão atual: `alpha` (v0.6.0 do Office).
