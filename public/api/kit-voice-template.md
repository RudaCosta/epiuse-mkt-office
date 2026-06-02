# 🪪 KIT LINKEDIN · EPI-USE VOICES — Template de prompt

> **Como usar:** copia este arquivo INTEIRO · cola a transcrição da reunião com o Voice no bloco TRANSCRIÇÃO abaixo · cola tudo no [claude.ai](https://claude.ai/new) num chat novo dizendo *"renderiza como artifact"* · Claude.ai gera o HTML do kit JÁ formatado · você salva PDF pelo botão dentro do artifact.
>
> **Zero JSON. Zero render local. Zero copy-paste de resposta. UM caminho só.**

---

## 🤖 INSTRUÇÕES PRA IA (NÃO APAGUE — copia também)

Você é especialista em **personal branding executivo no ecossistema SAP**.

Sua única tarefa: ler a transcrição abaixo + (opcional) os screenshots anexados, **extrair os dados sozinho** e gerar **UM HTML completo como artifact** com o Kit LinkedIn do Voice, já estilizado com identidade EPI-USE Brasil.

**Regras absolutas:**
- ❌ NÃO peça mais dados, NÃO peça screenshots adicionais, NÃO peça esclarecimentos
- ❌ NÃO devolva JSON, NÃO devolva markdown narrativo, NÃO escreva nada no chat
- ✅ Devolva **APENAS o HTML do artifact**, pronto pra renderizar
- ✅ Onde faltar dado real na transcrição, escreva `[preencher: descrição do que falta]` em destaque visual amarelo (`background:#fef3c7;border:1px dashed #fbbf24;padding:2px 6px;color:#92400e;font-style:italic`)
- ✅ Nunca invente números (SSI, % resultado, seguidores) — placeholder amarelo se não veio
- ✅ Se a transcrição estiver vazia ou inexistente, **gere o template em branco com TODOS os campos como `[preencher: ...]`** — NÃO peça pra preencher

---

## 🎯 ESTRUTURA OBRIGATÓRIA DO HTML

O artifact tem **7 páginas A4** (uma seção por página via `page-break-before: always`).

### 📄 PÁGINA 1 — RESUMO EXECUTIVO (NÃO PODE FICAR EM BRANCO)

A página 1 é a MAIS IMPORTANTE. Quem abre o PDF tem que entender o veredito em 5 segundos.

Layout exigido:

```
┌─────────────────────────────────────────────────────┐
│  EPI-USE BRASIL · VOICES                  jun/2026  │  ← header navy fino
├─────────────────────────────────────────────────────┤
│                                                      │
│  Kit LinkedIn · [Nome do Voice]                     │  ← título Maven Pro 28pt navy
│  [Cargo oficial]                                     │  ← subtítulo 14pt cinza
│  ─────                                               │  ← linha vermelha decorativa
│                                                      │
│   ┌──────────┐   📊  RESUMO EXECUTIVO              │
│   │          │                                       │
│   │    72    │   • Diagnóstico: [1 frase do estado]│
│   │  / 100   │   • Mudanças críticas: X            │
│   │          │   • Tempo estimado pra aplicar: Y h │
│   └──────────┘   • Prioridade #1: [headline]       │
│   Voice Index    • Prioridade #2: [foto/banner]    │
│   anel visual    • Prioridade #3: [sobre]          │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ Elemento     │ Hoje      │ Meta      │ 🚦  │   │
│  │ Foto         │ informal  │ corporate │ 🔴  │   │
│  │ Banner       │ default   │ EPI-USE   │ 🔴  │   │
│  │ Headline     │ genérica  │ punch     │ 🔴  │   │
│  │ Sobre        │ 280 chars │ 1800ch    │ 🟡  │   │
│  │ URL          │ /in/abc12 │ /in/nome  │ 🟡  │   │
│  │ Competências │ 18 itens  │ 12 focal  │ 🟢  │   │
│  │ Posts/mês    │ 0         │ 4-8       │ 🔴  │   │
│  │ ERP.ngo      │ ausente   │ destaque  │ 🔴  │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
                       Página 1 de 7
```

**Elementos obrigatórios da página 1:**

1. **Voice Index 0-100** em anel SVG (conic-gradient navy), 140px, com número grande no centro
2. **Lista de 4-6 bullets** com:
   - "Diagnóstico:" em 1 frase
   - "Mudanças críticas: X" (contagem das 🔴)
   - "Tempo estimado pra aplicar tudo: X horas"
   - "Prioridade #1/2/3" (top 3 mudanças mais urgentes)
3. **Tabela de status de TODOS os elementos** (8 linhas mínimo): Foto · Banner · Headline · Sobre · URL · Competências · Posts/mês · ERP.ngo
   - Coluna "Hoje" (1-3 palavras) · "Meta" (1-3 palavras) · semáforo 🔴🟡🟢
4. **Page-break-after: always** pra próximas seções

### 📄 PÁGINA 2 — DIAGNÓSTICO DETALHADO
Tabela expandida 8-10 itens (Cargo · Headline · Sobre · Foto · Banner · URL · Competências · Posts · Destaques · ERP.ngo) com:
- Coluna "Situação atual" (descrição completa)
- Coluna "Meta" (descrição completa)
- Coluna "Urgência" (pill alta/média/baixa)
- Coluna "Tempo de aplicação" (5min/30min/2h)

### 📄 PÁGINA 3 — VOICE INDEX 7 PILARES
Score 0-100 grande + 7 pilares listados com:
- 🪪 Identidade & Posicionamento (score)
- 🏆 Autoridade & Prova Social (score)
- 📊 Conteúdo & Atividade (score)
- 🌐 Network & Relacionamento (score)
- 📈 SSI Index LinkedIn (score)
- 💼 Aderência EPI-USE Brasil (score)
- 🎯 Conversão (lead → reunião) (score)

Cada pilar com 3-5 critérios + nível (forte/ok/fraco/ausente) + observação.

### 📄 PÁGINA 4 — HEADLINE & SOBRE (pronto pra copiar)
- **Headline pronta** (≤220 chars) em card destacado, fonte mono, com contador `X/220`
- **Sobre completo** (≤2.600 chars) em card maior, parágrafos curtos:
  - 1ª pessoa
  - Gancho forte
  - Experiência + resultados reais (da transcrição)
  - Diferencial humano (se mencionado)
  - **Menção obrigatória a EPI-USE Voices E ERP.ngo**
  - CTA final
- Botão visual "📋 Copiar headline" e "📋 Copiar sobre" (apenas decorativos, podem ser estáticos)

### 📄 PÁGINA 5 — 5 DESTAQUES ESTRATÉGICOS
Grid 2×2 + 1 wide. Cada destaque:
- Número grande (1-5)
- Pill colorido com tipo: `artigo` · `projeto` · `evento` · `conquista` · `curso`
- Título sugerido
- Descrição do que criar/postar (2-3 linhas)

### 📄 PÁGINA 6 — LINHA EDITORIAL 4 SEMANAS
- Mix de pilares (barras horizontais com %): 40% Thought Leadership · 30% Cases · 20% Pessoas · 10% Propósito (ERP.ngo)
- Calendário 4 semanas (tabela 4×2): Semana | Post 1 | Post 2 — temas específicos
- Nota: "Primeiras 4 semanas sem links externos no corpo (algoritmo LinkedIn penaliza)"

### 📄 PÁGINA 7 — KPIS 90 DIAS + CHECKLIST
- Tabela KPIs (SSI · Views · Seguidores · Posts · Engajamento)
- Checklist priorizado em 3 grupos: 🚨 Urgente · 📋 Normal · 🎁 Bônus
- Cada item com checkbox + passo prático

---

## 🎨 IDENTIDADE VISUAL OBRIGATÓRIA

**Paleta (use SEMPRE):**
- Navy primário: `#001844`
- Red accent: `#cd1543`
- Blue mid: `#004B8D`
- Grey light: `#cfd1d3`
- Cream/background: `#f8f5f0`
- Texto: `#0f172a` · Texto dim: `#475569`
- Borda: `#e2e8f0`
- Placeholder amarelo: `#fef3c7` bg / `#fbbf24` borda / `#92400e` texto

**Tipografia:**
- Headlines: **Maven Pro** (700-800)
- Corpo: **Inter** (Avenir fallback)
- Mono (números): JetBrains Mono
- Embed via `@import url('https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400;500;700;800&family=Inter:wght@400;500;600;700&display=swap');`

**Botão flutuante no topo do artifact:**
```html
<button onclick="window.print()" style="position:fixed;top:16px;right:16px;background:#001844;color:white;padding:10px 16px;border-radius:8px;border:none;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2);z-index:100;font-family:'Maven Pro',sans-serif">📥 Salvar como PDF</button>
```

**@media print (obrigatório):**
```css
@media print {
  @page { size: A4; margin: 16mm 14mm 18mm; }
  body { background: white; }
  button { display: none !important; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
}
```

---

## 🏢 CONTEXTO EPI-USE BRASIL (use no Sobre)

- EPI-USE Brasil — maior consultoria SAP HCM/Payroll do Brasil; evoluindo para EPI-USE 5.0 (Transformação Empresarial)
- Grupo EPI-USE / **groupelephant.com** — 42+ anos · 4.500+ profissionais · 40+ países · 2.000+ clientes · SAP Gold Partner
- Braços no Brasil: EPI-USE Brasil (consultoria SAP) · EPI-USE Labs (P&D de IPs) · Stratview (Analytics) · Valcann (Cloud)
- LOBs: SAP HCM/SuccessFactors · S/4HANA (Clean Core + Reforma Tributária) · BTP · Signavio · ServiceNow HRSD/ITSM · Stratview
- IPs: TalenTools · PRISM
- **ERP.ngo:** 1% receita global → conservação de elefantes + combate à pobreza rural na África ([erp.ngo](https://erp.ngo)). **Todo Voice é embaixador ERP.ngo.**
- **EPI-USE Voices:** programa de influência executiva — líderes que compartilham conhecimento no LinkedIn com autenticidade
- ⚠️ SEMPRE "EPI-USE Brasil" por extenso — nunca apenas "EPI-USE"

---

## 📋 TRANSCRIÇÃO DA REUNIÃO COM O VOICE (cole aqui antes de mandar pro Claude.ai)

```
[Cole aqui a transcrição completa da conversa com o Voice. Pode ser:
- Texto de uma reunião Teams/Meet/Zoom
- Notas tomadas durante entrevista
- Áudio transcrito (mesmo bagunçado)
- Respostas do roteiro de 12 perguntas
- Email ou chat WhatsApp com as respostas
- TUDO JUNTO MISTURADO — Claude separa]

Não precisa formatar nada. Quanto mais natural, melhor a IA captura tom.

Se não tem transcrição ainda → deixa em branco mesmo. A IA vai gerar o
template com [preencher: ...] em TODOS os campos pra você preencher
manualmente depois com o Voice.
```

---

## ✅ ENTREGA

**APENAS** o HTML completo do artifact, começando com `<!doctype html>` e terminando com `</html>`. Nada antes, nada depois. Sem ` ``` `. Sem comentários explicativos.

A página 1 (Resumo Executivo) **NÃO PODE estar em branco** — sempre tem Voice Index + bullets + tabela 8 elementos, mesmo que seja com `[preencher: ...]`.

O usuário vai clicar no botão flutuante "📥 Salvar como PDF" dentro do próprio artifact.
