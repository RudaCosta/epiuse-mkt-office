# Decisões — Módulo 24 Blog Converter

## D1. Módulo separado do Raccoon (08-inbound-offline)
**Decisão:** criar módulo próprio (`24-blog-converter`) em vez de estender o Raccoon existente.
**Rationale:** pedido explícito da Bruna ("extensão do raccoon mas separado do módulo principal"). Evita acoplar o gerador de conteúdo (Raccoon) com o conversor de formato. Regra 9 (modularização) — cada módulo com histórico próprio.

## D2. Conversão por IA (não montador manual)
**Decisão:** a página manda o artigo pra um LLM que monta o HTML e o SEO.
**Rationale:** escolha da Bruna. O template exige julgamento editorial (qual componente usar em cada seção, escrever lead/FAQ/resumo) — trabalho que a IA faz bem e o montador manual não resolveria sem muito clique.

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
