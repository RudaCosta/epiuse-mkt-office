# Changelog — Onboarding

## v1.0 · 02/out/2026
- Página `/onboarding` criada a partir do guia do Rudá + contexto da vault (empresa, pessoas, branding, grupo-elephant, módulo 23).

## v2.0 · 02/out/2026 — trilha em fases
- Feedback Rudá: v1 "confusa e muita coisa". Refeito como mapa da trilha + modo foco (uma tela por vez) + quiz por pergunta.
- Fase 1 no ar: Kit Dia 1 (gaveta) + Etapa 1 com 10 telas animadas. Etapas 2–4 travadas ("Fase N · em breve").
- v1 arquivada em `public/_versoes-office/onboarding-v1.html`.

## v2.1 · 02/out/2026 — trilha completa + ERP Coins
- Etapas 2, 3 e 4 no formato v2 (22 telas novas + 3 quizzes) e destravadas para teste.
- ERP Coins e conquistas: 6 conquistas (650 coins no total), crédito real no ledger, popup + chuva de moedas, saldo no hero.
- Kit Dia 1: links do Multidados, SuccessFactors, Stratview (admin), Trello (board do marketing) e Coworking (novo).

## v2.2 · 03/out/2026 — certificado + rastreamento
- Certificado de conclusão (PNG 2000×1414) com download, "Adicionar ao perfil" do LinkedIn e post (nativo no celular).
- Todos os passos rastreados no beacon/tabela do Módulo 17 e exibidos em `/admin/analytics` (tabela por pessoa + passo a passo na ficha). Sem página nova.

## v2.3 · 05/out/2026 — trilha progressiva
- Chegada da Gabi: etapas voltam a ser progressivas (cada uma abre só após a anterior; Kit Dia 1 não bloqueia).
- Server recusa coins de etapa fora de ordem (`etapa_bloqueada`); créditos retroativos rodam em sequência.

## v2.4 · 06/out/2026 — materiais por etapa
- Etapa 1 ganha slide "Apresentação institucional" (PPT no SharePoint + vídeo "SAP e o ERP" embutido) → 11 telas.
- Painel **📚 Materiais** (treinamentos e links para conhecer mais) por etapa: botão no topo do modo foco e na home. Lista do Rudá distribuída: E1 institucional/ERP.ngo/marca · E2 inbound/LGPD/MDF-PBC · E3 SAP + SEO/SEM/design/growth/FIAP · E4 outbound/venda SAP.
- Cliques nos materiais entram no rastreamento (`eN.res.open`, `eN.res.linkK`, `e1.res.ppt`). Login compartilhado (Crehana) segue fora da página.

## v2.5 · 13/out/2026 — marca oficial · workshop · videoteca
- **Marca (guias oficiais):** Etapa 1 ganha "A marca irmã: Elephants, Rhinos & People" (guia ERP/ERPA), "Regras de ouro do logo" (4 elementos, mínimo 56 px, área de proteção, logo antigo aposentado) e "A marca no dia a dia" (redes, propostas, imagens, co-branding, Tusk) → 14 telas.
- **Workshop Golden Circle × Business Model Canvas** na Etapa 2 (2 telas): anéis clicáveis com rascunho EUBR + campo de resposta; os 9 blocos do Canvas mapeados por anel; "Copiar minhas respostas". Rascunhos marcados `🤖 Gerado por IA, a validar`.
- **Videoteca obrigatória** na Etapa 3: 10 vídeos de produto embutidos (S/4HANA, banho de loja, process mining, Solution Advisory, iLab, Valcann, CMI SAP, ServiceNow). Conta ao chegar a 90%; o "Próximo" fica travado (🔒 x/10) até assistir todos.
- **Produto × marketing separados:** treinamentos de marketing (SEO/SEM, design, growth) migraram para a Etapa 2; a Etapa 3 fica só com produto (SAP/ERP + videoteca).
- **Quizzes 6 × 4:** todas as etapas com 6 perguntas e 4 opções, incluindo perguntas mais técnicas (CAC, UTM, Clean Core, RISE, HRSD, BANT, fim do suporte ECC). Gabarito do server atualizado.
- Rastreamento novo: `e2.workshop.*`, `e3.video.<id>.play|done`.
