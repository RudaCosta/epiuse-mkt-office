# 🐘 ERP.ngo — Branding Standards (resumo executivo)

> Fonte oficial: `MARKETING/Branding/ERP.ngo/branding standards guide/ERP _ ERPA Branding Standards Guide.pdf` (24 páginas, v1.0)
> Assets locais salvos em: `modulo-a-profile-optimizer/public/assets/erp-ngo/`

## Tagline oficial
> **"Dedicated to protecting elephants and rhinos in the wild through alleviating poverty"**

## Logo — 3 variações disponíveis no projeto

| Arquivo | Quando usar |
|---|---|
| `erp-logo-blue.svg` | Padrão — fundos claros, brancos. Cor primary navy `#121C41` |
| `erp-logo-white.svg` | Fundos escuros / coloridos / fotos |
| `ge-erp-monotone.svg` | Co-branding GE + ERP — usado quando contexto institucional do grupo |

URL pra usar no `<img>`: `/assets/erp-ngo/erp-logo-blue.svg` (etc)

## Regras de uso (NUNCA)
1. Não separar símbolo do logotipo
2. Não alterar proporções
3. Não trocar cor (sempre navy ou white)
4. Não trocar fonte
5. Não usar com nome em letra minúscula
6. Não colocar logo em áreas "busy" da imagem — se inevitável, escurecer foto

## Tamanho mínimo
**10mm** print ou **38px** digital

## Espaço de isolação
Margem de proteção ao redor: usar **altura da letra "E"** como referência (de todos os lados)

## Co-branding com outras marcas (EPI-USE, SAP, etc.)
1. Mesmo height/escala usando "E" como referência
2. Clear space ao redor de ambos os logos
3. Divider line vertical em Primary Blue equivalente a `2d` (2× width do "d")

## Domínio
**SEMPRE escrever em lowercase:** `erp.ngo` (nunca ERP.NGO ou Erp.ngo)

## Paleta oficial

### Primary
- **Blue Navy** `#131B41` — RGB(19,27,65) — cor base do logo
- **Mid Blue** `#0066B2` — RGB(0,102,178)
- **Light Blue** `#BFDCF3` — RGB(191,220,243)

### Secondary
- **Mid Brown** `#74685B` — RGB(116,104,91)
- **Light Brown** `#BBA997` — RGB(187,169,151)
- **White** `#FFFFFF`

### Tints permitidos
100% · 80% · 60% · 40% · 20% (de cada cor)

## Tipografia

- **Novecento** (PRIMARY) — TTF, headlines e subheads, **SEMPRE UPPERCASE**, nunca body
- **Gotham** (SECONDARY) — TTF, body copy, brochures, flyers
- **Web safe fallback** (página 11 sugere): Arial / Helvetica pra web

## Imagery (estilo de fotos)
4 categorias: **African Savanna · Elephants · Rhinos · People**
- Tons inspirados em "golds and blues of African savanna"
- **Evitar fotos com muito verde** — se inevitável, dessaturar o verde
- Modern photography + ícones authentic

## Iconography
- Estilo: **thick lines, no fill, 0.75pt "Touch Calligraphic Stroke"**
- Usar quando fotografia não é apropriada

---

## 🎯 Onde aplicar no EPI-USE Office (mapa)

| Local | Hoje | Proposta |
|---|---|---|
| **`/optimizer` seção ERP.ngo no kit** | Só emoji 🐘 + texto | Adicionar logo `erp-logo-blue.svg` 60px no topo da seção + footer "erp.ngo" lowercase como link `https://erp.ngo` |
| **`/game` zona "🐘 ERP.ngo Memorial"** | Bloco verde com emoji | Não muda no canvas (pixel art), mas adicionar logo no modal quando interagir com a zona |
| **`office-footer.js` link "🐘 ERP.ngo"** | Texto simples | Mini-logo branco (16px) + texto "erp.ngo" lowercase + tagline em hover |
| **`/seja-voice` LP** | Menciona "embaixador ERP.ngo" no Sobre | Bloco dedicado "Sobre o ERP.ngo" com logo + tagline + link |
| **`/dashboard`** | Sem menção | Card lateral pequeno "🐘 ERP.ngo · 1% receita global → conservação" com logo + link |
| **`/voices`** | Sem menção institucional | Banner "Todo Voice é embaixador ERP.ngo" no topo (escondível) |
| **PDF do kit Optimizer** (quando export) | Sem | Co-branding EPI-USE + ERP.ngo no rodapé seguindo regras do guide |

## 🎨 Tokens CSS sugeridos pra adicionar no projeto

```css
:root {
  /* ERP.ngo brand */
  --erp-blue-navy: #131B41;
  --erp-blue-mid: #0066B2;
  --erp-blue-light: #BFDCF3;
  --erp-brown-mid: #74685B;
  --erp-brown-light: #BBA997;
}
```

Como já temos paleta EPI-USE Brasil (azul primary `#2563eb`), as cores ERP convivem bem — Navy ERP `#131B41` é mais escuro, ótimo pra contraste em fundos light.

## Próximos passos sugeridos

1. **Quick win (~30min):** trocar todos os `🐘 ERP.ngo` simples no footer/dashboard por logo SVG + texto lowercase
2. **Polish (~1h):** card dedicado no `/seja-voice` e banner no `/voices`
3. **Bonus (~30min):** adicionar tokens CSS ERP no `:root` global pra reuso
4. **Futuro:** se gerarmos PDFs (export do kit Optimizer), aplicar co-branding nas regras
