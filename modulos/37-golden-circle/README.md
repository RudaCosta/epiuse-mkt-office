# Módulo 37 — Treinamento Golden Circle

**Status:** ✅ v1.1 (15/out/2026) · workshop sequencial com notas do facilitador · **Rota:** `/golden-circle` · **Arquivo:** `public/golden-circle.html` · **Acesso:** time de Marketing (área `time`)
**Propósito:** treinamento fora do onboarding para quem ainda não entendeu o que é a EPI-USE e para onde ela vai. Usa o Golden Circle de Simon Sinek para ligar cada atividade da semana a uma meta FY27 e ao porquê do Marketing, da EPI-USE Brasil e do grupo.

## Estrutura (v1.1: uma tela por vez, 17 telas, ~81 min + 18 min de TED)
Player com barra de progresso, Próximo/Voltar, setas do teclado, link direto (`/golden-circle#9`) e tela salva no navegador.
1. Abertura (as 2 frases) · 2. Quem é Simon Sinek · 3. Os três anéis · 4. As perguntas do porquê · 5. Apple de fora pra dentro × de dentro pra fora · 6. Pitch da EPI-USE Brasil · 7. O cérebro · 8. Valor percebido · 9. TED · 10. Sonho, não plano · 11. Alice e o Gato · 12–14. Cascata Grupo → EPI-USE Brasil → Marketing · 15. Exercício "minha cascata" (metas FY27 reais) · 16. O meu Golden Circle · 17. Fechamento (copiar/baixar o mapa).

**Notas do facilitador** (botão 🎤 ou tecla N): em cada tela, tempo, resumo, o que falar, perguntas para o grupo e uma dica. **🖨️ Roteiro** imprime tudo. Cópia em Markdown: `ROTEIRO.md` (gerada a partir das notas da página).

## Arquivos-chave
- `public/golden-circle.html` — página (vanilla, tokens do DESIGN.md, canvas animado com `prefers-reduced-motion`); notas em `NOTAS`.
- `ROTEIRO.md` — roteiro do facilitador gerado a partir de `NOTAS`.
- `server.js` — `GET /golden-circle`.
- `routes/acesso.js` — regra `['/golden-circle', T]`.
- `public/office-nav.js` — item no menu (seção Onboarding) e no Cmd+K.
- `public/onboarding.html` — link "Treinamento completo do Golden Circle →" no workshop da Etapa 2.

## Fontes
- Conceito: Simon Sinek, *Start With Why* (2009) e TED (2009). Textos com as nossas palavras; citações curtas com crédito.
- Materiais enviados pelo Rudá (14/out): e-book "Ferramentas" (Na Prática) e "Círculo dourado e o poder do propósito" (Alice e o Gato, reação × ação, valor percebido).
- EPI-USE: `vault/00-contexto/empresa.md` e `empresa-grupo-elephant.md` (material oficial do grupo).
- Metas: placar FY27 (Módulo 33).
