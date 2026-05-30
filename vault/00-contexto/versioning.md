# Versionamento do EPI-USE Office

> Adotado em 25/mai/2026. Substitui o esquema cosmético antigo (`vX.Y`).

## Esquema: Semver pré-1.0 (`0.MAJOR.MINOR`)

Estamos antes do primeiro release "estável". Tudo que tem `0.X.Y` significa **dev** — interface pode mudar, deploys podem quebrar coisas, contratos de API podem evoluir sem warning. Isso é normal pra um sistema interno em construção rápida.

### O que cada segmento significa

- **`0`** (major zero) — pré-release. Não há promessa de estabilidade. Vai virar `1.0.0` quando os critérios de lançamento forem batidos (ver abaixo).
- **`MAJOR` (segundo número, hoje `3`)** — bate quando temos refactor estrutural significativo (paleta nova, módulo completo novo, arquitetura mudada).
- **`MINOR` (terceiro número)** — sprint normal. Features novas, bug fixes, polish.

### Sub-versões dentro de uma sprint (opcional)

Pra rastrear partes de uma sprint maior, usar `0.3.5.1`, `0.3.5.2` etc. **Não vira chip de versão visível** — fica só no commit message / changelog interno. O nav e footer mostram só `0.3.5`.

## Critérios pra `1.0.0`

Versão `1.0.0` significa "**estável o suficiente pra adoção formal pelo time + clientes externos eventuais (via /seja-voice etc)**". Bate quando:

1. **SSO Microsoft (Entra ID) entregue** — autenticação real, sem prompt() de nome
2. **Adoção do time medida** — pelo menos 4 das 5 áreas MKT (Bruna, Gui, Isabela, Marlison, Duda) usando ativamente o Office no dia-a-dia por 2+ semanas
3. **Estabilidade Railway** — 14 dias seguidos sem incidente (502/build crash/data loss)
4. **Módulos core completos** — Voices, Inbound, Calendar, Cases & CS, Painel da Duda
5. **Doc de operação** — runbook pra Roberto/IT, plano de backup, política de retenção de dados

Cada item bate? Vira `1.0.0` com release notes formal + comunicado pro time.

## Mapeamento da renumeração (histórico)

Esquema antigo → novo:

| Antigo (cosmético) | Novo (semver) | Status |
|---|---|---|
| v2.0 | 0.2.0 | live (snapshot disponível) |
| v2.1 | 0.2.1 | live |
| v2.2 | 0.2.2 | live |
| v3.0 | 0.3.0 | broken (rotas 404 em prod) — corrigido em 0.3.4 |
| v3.1 | 0.3.1 | live |
| v3.2 | 0.3.2 | live |
| v3.3 | 0.3.3 | live |
| v3.4 | 0.3.4 | live (atual em produção) |
| v3.5 | **0.3.5** | **atual local · aguarda autorização pra push** |

**Importante:** os **filenames dos snapshots** em `public/_versoes-office/` mantêm o prefixo antigo (`v3.4-game-engine.html` etc) — só o label visual mudou. O mapeamento `version → snapshot` agora é explícito em `SNAPSHOT_MAP` no `changelog.html`.

## Onde a versão aparece no código

| Local | Arquivo | Variável |
|---|---|---|
| Chip no nav (clica → /changelog) | `public/office-nav.js` | `OFFICE_NAV_VERSION` |
| Tag no footer (dropdown ▴ abre histórico) | `public/office-footer.js` | `OFFICE_FOOTER_VERSION` + `OFFICE_VERSION_HISTORY` |
| Página `/changelog` | `public/changelog.html` | `RELEASES[]` + `SNAPSHOT_MAP` |
| package.json | `modulo-a-profile-optimizer/package.json` | `"version"` (atualmente `1.0.0` — corrigir pra `0.3.5`) |

> **TODO:** sincronizar `package.json#version` com `OFFICE_NAV_VERSION` no próximo push. Hoje o `package.json` ainda diz `1.0.0` por convenção npm — não é grave (npm não usa pra nada aqui), mas é coerente atualizar pra `0.3.5`.

## Quando bumpar versão

| Mudança | Bump |
|---|---|
| Fix de bug pequeno (sem nova feature) | sub-version interna (não muda chip) |
| Sprint normal completada (features + fixes) | MINOR: `0.3.5 → 0.3.6` |
| Refactor estrutural (novo módulo, paleta nova, arquitetura mudada) | MAJOR (do segundo segmento): `0.3.X → 0.4.0` |
| SSO + adoção + estabilidade batidos | `0.X.Y → 1.0.0` |

## Regra de ouro relacionada

**Sempre bumpar a versão ANTES do push pra Railway**, junto com:
1. Atualizar `OFFICE_NAV_VERSION` e `OFFICE_FOOTER_VERSION` (devem estar idênticos)
2. Adicionar entry no `RELEASES[]` do `changelog.html`
3. Snapshot HTMLs em `public/_versoes-office/0.3.X-*.html` (se mudou tela completa)
4. Atualizar `package.json#version` (coerência)
5. Confirmar com Rudá antes de `git push origin master`

Histórico em `c-users-ruds-desktop-epi-use-brasil-inb-dreamy-adleman.md` (plan file da sessão atual).
