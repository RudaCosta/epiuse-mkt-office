#!/usr/bin/env python3
"""
gen_tokens.py — v0.6.0
Lê vault/00-contexto/DESIGN.md (frontmatter YAML) → gera:
  - public/design-tokens.css  (CSS vars consumidas por todas as telas)
  - public/api/design-tokens.json (consumível por JS/tooling)

Resolve referências aninhadas: {colors.primary-500} → valor hex real.
Imprime diff vs versão anterior.

Uso:
  python scripts/design/gen_tokens.py
"""
import json, re, sys
from pathlib import Path
from datetime import datetime

try:
    import yaml
except ImportError:
    print("ERRO: pyyaml não instalado. Rode: pip install pyyaml")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[2]  # modulo-a-profile-optimizer/
DESIGN_MD = ROOT.parent / "vault" / "00-contexto" / "DESIGN.md"  # Claude MKT EUBR/vault/...
OUT_CSS = ROOT / "public" / "design-tokens.css"
OUT_JSON = ROOT / "public" / "api" / "design-tokens.json"


def parse_frontmatter(text: str):
    """Extrai bloco YAML entre os 2 primeiros '---'."""
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if not m:
        raise ValueError("DESIGN.md sem YAML frontmatter (precisa '---' no início)")
    return yaml.safe_load(m.group(1))


def resolve_refs(value, root_tokens, depth=0):
    """Resolve {colors.primary-500} → valor real. Suporta nested e múltiplas refs."""
    if depth > 10:
        return value  # circular ref protect
    if isinstance(value, str):
        # Pega todas as refs {a.b.c} no string
        def replace_ref(m):
            path = m.group(1).split(".")
            cur = root_tokens
            for p in path:
                if isinstance(cur, dict) and p in cur:
                    cur = cur[p]
                else:
                    return m.group(0)  # mantém literal se não achar
            return str(resolve_refs(cur, root_tokens, depth + 1))
        return re.sub(r"\{([\w.\-]+)\}", replace_ref, value)
    if isinstance(value, dict):
        return {k: resolve_refs(v, root_tokens, depth + 1) for k, v in value.items()}
    if isinstance(value, list):
        return [resolve_refs(v, root_tokens, depth + 1) for v in value]
    return value


def flat_typography_to_css(name, typo):
    """Converte typography{} em bloco de CSS vars individuais."""
    out = []
    keys = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform"]
    css_keys = {
        "fontFamily": "font-family",
        "fontSize": "font-size",
        "fontWeight": "font-weight",
        "lineHeight": "line-height",
        "letterSpacing": "letter-spacing",
        "textTransform": "text-transform",
    }
    for k in keys:
        if k in typo:
            v = typo[k]
            # font-family precisa quotes se tem espaço
            if k == "fontFamily" and " " in str(v) and not str(v).startswith("'") and not str(v).startswith('"'):
                v = f'"{v}"'
            out.append(f"  --type-{name}-{css_keys[k]}: {v};")
    return "\n".join(out)


def gen_css(tokens):
    lines = [
        f"/* design-tokens.css — gerado por scripts/design/gen_tokens.py em {datetime.now().isoformat()} */",
        "/* FONTE DA VERDADE: vault/00-contexto/DESIGN.md (NÃO editar este arquivo direto) */",
        f"/* Sistema: {tokens.get('name', 'EPI-USE Office')} · versão: {tokens.get('version', '?')} */",
        "",
        "/* Open Sans self-hosted (fonte primária oficial EPI-USE confirmada 28/mai/2026) */",
        "@import url('/assets/fonts/open-sans/open-sans.css');",
        "",
        ":root {",
    ]
    # Colors
    if "colors" in tokens:
        lines.append("  /* ── COLORS ── */")
        for k, v in tokens["colors"].items():
            lines.append(f"  --color-{k}: {v};")
        lines.append("")
    # Spacing
    if "spacing" in tokens:
        lines.append("  /* ── SPACING ── */")
        for k, v in tokens["spacing"].items():
            lines.append(f"  --space-{k}: {v};")
        lines.append("")
    # Rounded
    if "rounded" in tokens:
        lines.append("  /* ── ROUNDED ── */")
        for k, v in tokens["rounded"].items():
            lines.append(f"  --rounded-{k}: {v};")
        lines.append("")
    # Elevation
    if "elevation" in tokens:
        lines.append("  /* ── ELEVATION ── */")
        for k, v in tokens["elevation"].items():
            lines.append(f"  --elevation-{k}: {v};")
        lines.append("")
    # Typography (cada level vira N CSS vars)
    if "typography" in tokens:
        lines.append("  /* ── TYPOGRAPHY ── */")
        for name, typo in tokens["typography"].items():
            lines.append(flat_typography_to_css(name, typo))
        lines.append("")
    lines.append("}")
    lines.append("")
    # Semantic theme bindings (dark padrão · light via [data-theme="light"])
    lines.extend([
        "/* ── THEME BINDINGS ── */",
        ":root, [data-theme=\"dark\"] {",
        "  --color-surface:        var(--color-neutral-dark-surface);",
        "  --color-surface-2:      var(--color-neutral-dark-surface-2);",
        "  --color-bg:             var(--color-neutral-dark-bg);",
        "  --color-bg-2:           var(--color-neutral-dark-bg-2);",
        "  --color-border:         var(--color-neutral-dark-border);",
        "  --color-border-2:       var(--color-neutral-dark-border-2);",
        "  --color-text:           var(--color-neutral-dark-text);",
        "  --color-text-dim:       var(--color-neutral-dark-text-dim);",
        "  --color-text-muted:     var(--color-neutral-dark-text-muted);",
        "  --color-text-dimmest:   var(--color-neutral-dark-text-dimmest);",
        "  --color-divider:        var(--color-neutral-dark-divider);",
        "}",
        "",
        "[data-theme=\"light\"] {",
        "  --color-surface:        var(--color-neutral-light-surface);",
        "  --color-surface-2:      var(--color-neutral-light-surface-2);",
        "  --color-bg:             var(--color-neutral-light-bg);",
        "  --color-bg-2:           var(--color-neutral-light-bg-2);",
        "  --color-border:         var(--color-neutral-light-border);",
        "  --color-border-2:       var(--color-neutral-light-border-2);",
        "  --color-text:           var(--color-neutral-light-text);",
        "  --color-text-dim:       var(--color-neutral-light-text-dim);",
        "  --color-text-muted:     var(--color-neutral-light-text-muted);",
        "  --color-text-dimmest:   var(--color-neutral-light-text-muted);",
        "  --color-divider:        var(--color-neutral-light-divider);",
        "}",
        "",
        "/* ── ALIASES legados (manter telas antigas funcionando durante refactor) ── */",
        ":root {",
        "  --bg: var(--color-bg);",
        "  --bg-2: var(--color-bg-2);",
        "  --card: var(--color-surface);",
        "  --card-2: var(--color-surface-2);",
        "  --text: var(--color-text);",
        "  --text-dim: var(--color-text-dim);",
        "  --text-muted: var(--color-text-muted);",
        "  --border: var(--color-border);",
        "  --primary: var(--color-primary-500);",
        "  --primary-light: var(--color-primary-400);",
        "  --accent: var(--color-info-500);",
        "  --success: var(--color-success-500);",
        "  --warning: var(--color-warning-500);",
        "  --danger: var(--color-danger-500);",
        "  --muted: var(--color-text-muted);",
        "  --dim: var(--color-text-dimmest);",
        "  --green: var(--color-success-500);",
        "  --yellow: var(--color-warning-500);",
        "  --red: var(--color-danger-500);",
        "  --purple: var(--color-accent-purple-500);",
        "  --radius: var(--rounded-lg);",
        "}",
        "",
    ])
    return "\n".join(lines)


def gen_json(tokens):
    """JSON consumível por JS — tokens resolvidos."""
    return json.dumps({
        "version": tokens.get("version", "alpha"),
        "name": tokens.get("name"),
        "generated_at": datetime.now().isoformat(),
        "source": str(DESIGN_MD),
        "colors": tokens.get("colors", {}),
        "typography": tokens.get("typography", {}),
        "spacing": tokens.get("spacing", {}),
        "rounded": tokens.get("rounded", {}),
        "elevation": tokens.get("elevation", {}),
        "components": tokens.get("components", {}),
    }, ensure_ascii=False, indent=2)


def main():
    if not DESIGN_MD.exists():
        print(f"ERRO: DESIGN.md não encontrado em {DESIGN_MD}")
        sys.exit(1)

    print(f"[design] lendo {DESIGN_MD}")
    text = DESIGN_MD.read_text(encoding="utf-8")
    tokens = parse_frontmatter(text)

    # Resolve refs nos components
    if "components" in tokens:
        tokens["components"] = resolve_refs(tokens["components"], tokens)

    css = gen_css(tokens)
    json_text = gen_json(tokens)

    # Diff sumário
    css_was = OUT_CSS.read_text(encoding="utf-8") if OUT_CSS.exists() else ""
    if css == css_was:
        print(f"[design] CSS sem mudanças ({OUT_CSS.stat().st_size} bytes)")
    else:
        delta = "criado" if not css_was else "atualizado"
        OUT_CSS.parent.mkdir(parents=True, exist_ok=True)
        OUT_CSS.write_text(css, encoding="utf-8")
        print(f"[design] CSS {delta}: {OUT_CSS} ({len(css)} bytes · {css.count(chr(10))} linhas)")

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json_text, encoding="utf-8")
    print(f"[design] JSON: {OUT_JSON} ({len(json_text)} bytes)")

    # Stats
    print(f"\n[design] tokens gerados:")
    print(f"  colors:     {len(tokens.get('colors', {}))}")
    print(f"  typography: {len(tokens.get('typography', {}))}")
    print(f"  spacing:    {len(tokens.get('spacing', {}))}")
    print(f"  rounded:    {len(tokens.get('rounded', {}))}")
    print(f"  elevation:  {len(tokens.get('elevation', {}))}")
    print(f"  components: {len(tokens.get('components', {}))}")


if __name__ == "__main__":
    main()
