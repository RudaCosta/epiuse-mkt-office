# Decisões — Módulo 24 Blog Converter

## D1. Módulo separado do Raccoon (08-inbound-offline)
**Decisão:** criar módulo próprio (`24-blog-converter`) em vez de estender o Raccoon existente.
**Rationale:** pedido explícito da Bruna ("extensão do raccoon mas separado do módulo principal"). Evita acoplar o gerador de conteúdo (Raccoon) com o conversor de formato. Regra 9 (modularização) — cada módulo com histórico próprio.

## D2. Conversão por IA (não montador manual) — ⚠️ REVERTIDA na v2.0, ver D7
**Decisão (v1.0):** a página manda o artigo pra um LLM que monta o HTML e o SEO.
**Rationale (na época):** o template exige julgamento editorial (qual componente usar em cada seção, escrever lead/FAQ/resumo).
**Por que caiu:** ver D7. Na prática trouxe 404 (modelo aposentado), 429 (rate limit do free) e custo — e só funcionava com chave configurada.

## D7. v2.0 — Conversão determinística local (reverte D2, D3, D4, D5)
**Decisão:** o esqueleto do artigo (lead, sumário, seções, listas, resumo, FAQ, CTA, SEO) é montado por um **motor determinístico em JS rodando no navegador**, sem LLM.
**Rationale:** feedback direto da Bruna (28/set) — "transformar um texto que já existe em HTML não pode custar 1 centavo nem depender de servidor". E ela está certa tecnicamente: isso é **transformação estrutural**, não geração de conteúdo. Um LLM aqui só adiciona pontos de falha (404/429), custo e dependência de chave. O motor determinístico é grátis, instantâneo, sem limite, funciona em prod pra qualquer pessoa e não inventa fatos.
**Trade-off aceito:** a escolha "esperta" de componentes ricos (cards comparativos, fluxo numerado) por seção não é automática. Mitigação: a biblioteca de blocos na lateral deixa a pessoa enriquecer à mão em 1 clique.

## D9. v3.0 — IA via Claude do próprio Office (reverte parte de D7)
**Decisão:** a montagem do HTML volta a ser por IA — mas pelo **Claude que o Office já usa** (`ANTHROPIC_API_KEY`, `claude-sonnet-4-6`), não pelo OpenRouter.
**Rationale:** a Bruna mostrou o **padrão-ouro** de output (artigo do Joule: cards 2x2, cards comparativos, fluxo numerado, callout, badge SAP, blockquote). Isso exige **seleção editorial de componente por seção** — decidir "estes 4 conceitos viram grade 2x2", "esta comparação vira cards lado a lado", "estes 5 passos viram fluxo". Isso é entendimento de conteúdo, que só IA entrega. O motor determinístico (D7) montava o esqueleto, mas nunca chegaria a esse nível.
**Por que Claude do Office e não OpenRouter (a diferença crucial vs. D3):** o OpenRouter era gasto NOVO (cadastro + US$10 de crédito + free tier flaky com 404/429). O Claude do Office já está configurado, já é pago pela empresa (roda o Optimizer todo dia), é a API oficial (confiável, sem 404/429). Custo marginal ~1-3 centavos/artigo na infra existente. Decisão validada com a Bruna (ela escolheu "Claude do Office").
**Few-shot:** `example-gold.html` (o padrão-ouro dela) entra no prompt — é o que garante o nível de qualidade.
**Trade-off:** tem custo (pequeno) por conversão, ao contrário da v2.0 grátis. Mas a v2.0 não atingia a qualidade requerida, então o custo se justifica.

## D8. Extração de arquivo no navegador (mammoth.js + pdf.js) — reverte D5
**Decisão:** `.docx`/`.pdf` são lidos **no navegador** (mammoth.js e pdf.js via cdnjs), não mais por python no servidor.
**Rationale:** o requisito era claro desde o início — **upload tem que funcionar em prod, pra outras pessoas**, não só no localhost. O python server-side (`extract_text.py`) só roda onde há Python (local). No navegador funciona em qualquer lugar. O app não tem CSP restritiva e várias telas já usam cdnjs, então é consistente.

## D3. OpenRouter (mesmo padrão do Raccoon SEO/GEO)
**Decisão:** reusar `OPENROUTER_API_KEY` + fetch pro OpenRouter, com override `BLOG_CONVERTER_MODEL`.
**Rationale:** infra já existe e é gratuita/barata. Default num modelo com janela de saída grande (HTML inline é verboso).

## D4. Parsing por delimitadores (não JSON puro)
**Decisão:** a IA responde com `===HTML===` ... `===SEO===` {json} em vez de um único JSON.
**Rationale:** o HTML gerado é grande e cheio de aspas — colocá-lo dentro de uma string JSON quebra o parse com frequência. Delimitadores isolam o bloco de HTML cru e deixam só o SEO (pequeno) como JSON.

## D5. Extração de arquivo no servidor (Python), não no browser
**Decisão:** `.docx`/`.pdf` sobem via multer e são extraídos por `extract_text.py`.
**Rationale:** python-docx + pypdf já existem no ambiente (Regra 5). Evita puxar libs pesadas de front (CLAUDE.md: só vanilla JS). Degradação graciosa: se o ambiente não tiver python (ex: Railway), o endpoint retorna erro claro pedindo pra colar o texto.

## D6. Output do HTML usa hexes literais (não design tokens)
**Decisão:** o HTML gerado usa `#001844`, `#cd1543`, `#869ec3` hardcoded.
**Rationale:** o destino é o HubSpot, que **não** tem acesso ao `design-tokens.css` do Office. A Regra 8 (proibir hex hardcoded) vale pra UI do Office — não pra conteúdo exportado pra sistema externo. A UI da própria página `/blog-converter` usa `var(--color-*)` normalmente.
