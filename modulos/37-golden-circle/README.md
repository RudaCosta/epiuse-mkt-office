# Módulo 37 — Treinamento Golden Circle

**Status:** ✅ v1.0 (14/out/2026) · **Rota:** `/golden-circle` · **Arquivo:** `public/golden-circle.html` · **Acesso:** time de Marketing (área `time`)
**Propósito:** treinamento fora do onboarding para quem ainda não entendeu o que é a EPI-USE e para onde ela vai. Usa o Golden Circle de Simon Sinek para ligar cada atividade da semana a uma meta FY27 e ao porquê do Marketing, da EPI-USE Brasil e do grupo.

## Estrutura (uma página, 7 capítulos)
1. **O conceito** — anéis clicáveis (por quê / como / o quê) com as perguntas do Sinek + 2 citações.
2. **De dentro pra fora** — pitch da EPI-USE Brasil e o exemplo da Apple, de fora pra dentro × de dentro pra fora (animado).
3. **Por que funciona** — corte estilizado do cérebro (neocórtex × límbico), B2B e "valor percebido = tamanho do problema + confiança na solução" (com fim do ECC e Reforma Tributária).
4. **A palestra** — TED "How great leaders inspire action" embutido (legenda pt-br) + link de fallback.
5. **O porquê da EPI-USE** — diálogo da Alice com o Gato + cascata em 4 níveis (Grupo → EPI-USE Brasil → Marketing → Você), com etiquetas de fonte.
6. **Minha cascata (exercício)** — área → metas FY27 reais (`/api/metas/fy27/placar`) → até 8 atividades, cada uma ligada a uma meta e a um porquê; o que não conecta vai para o 1:1. Depois, "o meu Golden Circle" e o pitch de dentro pra fora. Copiar ou baixar o mapa.
7. **Para quem facilita** — agenda de 75 min e perguntas para provocar.

## Arquivos-chave
- `public/golden-circle.html` — página (vanilla, tokens do DESIGN.md, canvas animado com `prefers-reduced-motion`).
- `server.js` — `GET /golden-circle`.
- `routes/acesso.js` — regra `['/golden-circle', T]`.
- `public/office-nav.js` — item no menu (seção Onboarding) e no Cmd+K.
- `public/onboarding.html` — link "Treinamento completo do Golden Circle →" no workshop da Etapa 2.

## Fontes
- Conceito: Simon Sinek, *Start With Why* (2009) e TED (2009). Textos com as nossas palavras; citações curtas com crédito.
- Materiais enviados pelo Rudá (14/out): e-book "Ferramentas" (Na Prática) e "Círculo dourado e o poder do propósito" (Alice e o Gato, reação × ação, valor percebido).
- EPI-USE: `vault/00-contexto/empresa.md` e `empresa-grupo-elephant.md` (material oficial do grupo).
- Metas: placar FY27 (Módulo 33).
