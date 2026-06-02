# 🪪 KIT LINKEDIN · EPI-USE VOICES — Template de prompt

> **Como usar:** copia este arquivo INTEIRO · troca os `[campos]` pelos dados do Voice · cola no [claude.ai](https://claude.ai) num chat novo dizendo *"renderiza como artifact"* · Claude.ai gera o HTML do kit já formatado · exporta PDF direto do artifact (botão dentro dele OU print do browser).
>
> **Zero JSON, zero render local, zero servidor.**

---

## 🤖 INSTRUÇÕES PRA IA (NÃO APAGUE — copia também)

Você é especialista em **personal branding executivo no ecossistema SAP**, formado em comunicação corporativa de alto nível. Sua tarefa: gerar **UM HTML completo como artifact** com o Kit LinkedIn do profissional, **já estilizado** com a identidade visual EPI-USE Brasil.

**Regras críticas:**
- ❌ NÃO peça mais dados, NÃO peça screenshots, NÃO peça esclarecimentos
- ❌ NÃO devolva JSON, NÃO devolva markdown narrativo, NÃO devolva resumo no chat
- ✅ Devolva **APENAS o HTML do artifact**, pronto pra renderizar
- ✅ Onde faltar dado real, escreva `[preencher: descrição do que falta]` em destaque visual amarelo (bg `#fef3c7`, borda `#fbbf24`)
- ✅ Nunca invente números (SSI, % de resultado, seguidores) — usa placeholder se não veio nos dados

---

## 🎨 IDENTIDADE VISUAL EPI-USE BRASIL (obrigatória)

**Paleta:**
- Navy primário: `#001844`
- Red accent: `#cd1543`
- Blue mid: `#004B8D`
- Grey light: `#cfd1d3`
- Cream/background: `#f8f5f0`
- Texto principal: `#0f172a`
- Texto secundário: `#475569`
- Borda fina: `#e2e8f0`

**Tipografia:**
- Headlines/títulos: **Maven Pro** (bold, 700-800)
- Corpo de texto: **Avenir** ou fallback Inter/system-ui
- Mono (números, código): JetBrains Mono ou ui-monospace
- Fonts via Google Fonts inline OK: `@import url('https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400;500;700;800&family=Inter:wght@400;600;700&display=swap');`

**Tema:** institucional light (white background, navy text) — pode ser lido confortável em tela e impresso em PDF.

---

## 🏢 CONTEXTO EPI-USE BRASIL (use no Sobre)

- EPI-USE Brasil — maior consultoria SAP HCM/Payroll do Brasil; em evolução para EPI-USE 5.0 (Transformação Empresarial)
- Grupo EPI-USE / **groupelephant.com** — 42+ anos · 10 grupos de marcas · 4.500+ profissionais · 40+ países · 2.000+ clientes empresariais · SAP Gold Partner
- Braços no Brasil: EPI-USE Brasil (consultoria SAP), EPI-USE Labs (P&D de IPs), Stratview (Analytics), Valcann (Cloud & Infra)
- LOBs: SAP HCM/SuccessFactors · SAP S/4HANA (Clean Core + Reforma Tributária) · SAP BTP · SAP Signavio · ServiceNow HRSD/ITSM · Analytics/Stratview
- IPs proprietários: TalenTools (acelerador RH) · PRISM (analytics/reporting)
- **ERP.ngo:** 1% da receita global → conservação de elefantes + combate à pobreza rural na África ([erp.ngo](https://erp.ngo)). **Todo Voice é embaixador ERP.ngo.**
- **EPI-USE Voices:** programa interno de influência executiva — líderes que compartilham conhecimento no LinkedIn com autenticidade
- ⚠️ SEMPRE escreva **"EPI-USE Brasil" por extenso** — nunca apenas "EPI-USE"

---

## 👤 DADOS DO VOICE — PREENCHA ANTES DE COLAR

```
Nome completo:           [NOME]
Cargo oficial:           [CARGO NA EPI-USE BRASIL — ex: Delivery Strategic Account]
Área SAP principal:      [HCM/SuccessFactors | S/4HANA | BTP | Signavio | ServiceNow | Cross]
URL LinkedIn:            [https://linkedin.com/in/...]
Anos de experiência:     [N anos]
Data entrada EPI-USE:    [YYYY-MM ou ano aproximado]
SSI Score atual:         [0-100 ou "não medido — pedir ao Voice verificar em linkedin.com/sales/ssi"]
Seguidores hoje:         [número ou "não informado"]
Público-alvo:            [CHROs · CIOs · Diretores RH · etc]
Tom de voz:              [didático | provocador | executivo | técnico-acessível | equilibrado]
Lado humano:             [família · paixões · causas — ou "não informado"]

Resultados reais (com números, sem inventar):
1. [Ex: Migração SuccessFactors em 280 lojas em 14 meses na Drogaria Venancio]
2. [...]
3. [...]
```

---

## 📐 SEÇÕES DO ARTIFACT (cada uma = 1 página A4 no print)

### 1. CAPA (página 1)
- Logo/texto **"EPI-USE BRASIL"** grande no topo (Maven Pro 800, navy)
- Título: **"Kit LinkedIn · EPI-USE Voices"** (Maven Pro 700, navy)
- Linha vermelha decorativa
- Nome do Voice (grande, 32-40pt)
- Cargo oficial (médio, 16-18pt, cinza)
- Data de geração (rodapé, 10pt)
- `page-break-after: always`

### 2. DIAGNÓSTICO — TABELA "HOJE × META × URGÊNCIA"
8 linhas (Cargo · Headline · Sobre · Foto · Banner · URL · Competências · Posts).
Coluna urgência com pill colorido (`alta`=vermelho, `media`=amarelo, `baixa`=azul).

### 3. VOICE INDEX — 7 PILARES
Score 0-100 em **anel SVG conic-gradient** (cor navy, ring 100px).
Lista os 7 pilares com mini-progresso:
- 🪪 Identidade & Posicionamento
- 🏆 Autoridade & Prova Social
- 📊 Conteúdo & Atividade
- 🌐 Network & Relacionamento
- 📈 SSI Index (LinkedIn oficial)
- 💼 Aderência EPI-USE Brasil
- 🎯 Conversão (lead → reunião)

Cada pilar: 3-5 critérios com nível (forte/ok/fraco/ausente) + observação curta.

### 4. HEADLINE & SOBRE
- **Headline pronta pra colar** (≤220 chars) em card destacado, fonte mono
- Indicador `X/220 chars` ao lado
- **Sobre completo** (≤2.600 chars) em card maior, formatado em parágrafos curtos:
  - 1ª pessoa do Voice
  - Gancho forte na primeira linha
  - Experiência + resultados reais
  - Diferencial humano (se houver)
  - **Menção obrigatória a EPI-USE Voices E ERP.ngo**
  - CTA final
- Indicador `X/2600 chars`

### 5. 5 DESTAQUES ESTRATÉGICOS
Grid 2×2 + 1 wide ou 5 cards verticais. Cada card:
- Número grande (1-5)
- Tipo (pill colorido): `artigo` · `projeto` · `evento` · `conquista` · `curso`
- Título sugerido
- Descrição do que criar/postar (2-3 linhas)

### 6. LINHA EDITORIAL — 4 SEMANAS
- **Mix de pilares** (barras horizontais com %):
  - 40% Thought Leadership
  - 30% Cases
  - 20% Pessoas
  - 10% Propósito (ERP.ngo)
- **Calendário 4 semanas** (tabela 4×2): Semana | Post 1 | Post 2 — temas específicos pro Voice
- Nota: "Primeiras 4 semanas sem links externos no corpo do post (algoritmo LinkedIn penaliza)"

### 7. KPIS 90 DIAS + CHECKLIST FINAL
- **Tabela KPIs**:
  - SSI Score → meta > 70
  - Visualizações/semana → meta +150%
  - Seguidores → meta +200
  - Posts/mês → meta 8
  - Engajamento médio → meta +50%
- **Checklist priorizado** (3 grupos):
  - 🚨 Urgente: itens com checkbox + passo prático
  - 📋 Normal: idem
  - 🎁 Bônus: idem
- Cada item tem categoria (FOTO · BANNER · CARGO · HEADLINE · URL · SOBRE · COMPETÊNCIAS · DESTAQUES · IDIOMA · EDITORIAL · ERP.NGO)

---

## 🖨️ ESTILO DO HTML (regras técnicas)

```html
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Kit LinkedIn · [NOME] · EPI-USE Voices</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400;500;700;800&family=Inter:wght@400;600;700&display=swap');
  :root {
    --navy: #001844; --red: #cd1543; --blue: #004B8D;
    --grey: #cfd1d3; --bg: #ffffff; --cream: #f8f5f0;
    --text: #0f172a; --text-dim: #475569; --border: #e2e8f0;
    --urg-alta: #cd1543; --urg-media: #f59e0b; --urg-baixa: #004B8D;
    --placeholder-bg: #fef3c7; --placeholder-border: #fbbf24;
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font-family:'Inter','Avenir',system-ui,sans-serif; font-size:14px; line-height:1.6; }
  h1, h2, h3 { font-family:'Maven Pro',sans-serif; color:var(--navy); font-weight:800; letter-spacing:-0.01em; }
  .container { max-width: 880px; margin: 0 auto; padding: 32px 24px; }
  .section { background: white; border: 1px solid var(--border); border-radius: 12px; padding: 28px; margin-bottom: 18px; page-break-inside: avoid; }
  .section + .section { page-break-before: always; }
  .placeholder { background: var(--placeholder-bg); border: 1px dashed var(--placeholder-border); padding: 2px 6px; border-radius: 4px; color: #92400e; font-style: italic; font-size: 12px; }
  .pill { display:inline-block; font-size:10px; font-weight:700; padding:3px 9px; border-radius:99px; text-transform:uppercase; letter-spacing:.04em; }
  .pill-alta { background: #fee2e2; color: var(--urg-alta); }
  .pill-media { background: #fef3c7; color: #92400e; }
  .pill-baixa { background: #dbeafe; color: var(--urg-baixa); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: var(--cream); padding: 10px 12px; text-align:left; font-family:'Maven Pro',sans-serif; color: var(--navy); font-size: 11px; text-transform: uppercase; letter-spacing:.04em; }
  td { padding: 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
  .btn-pdf { position: fixed; top: 16px; right: 16px; background: var(--navy); color: white; padding: 10px 16px; border-radius: 8px; border: none; font-family:'Maven Pro',sans-serif; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,.15); z-index: 100; }
  .btn-pdf:hover { background: var(--blue); }

  .cover { min-height: 80vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
  .cover .brand { font-family:'Maven Pro',sans-serif; font-weight: 800; font-size: 18px; color: var(--navy); letter-spacing: 0.2em; }
  .cover h1 { font-size: 36px; margin: 12px 0 24px; }
  .cover .red-line { width: 80px; height: 4px; background: var(--red); margin: 0 auto 32px; }
  .cover .voice-name { font-family:'Maven Pro',sans-serif; font-size: 32px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
  .cover .voice-cargo { font-size: 16px; color: var(--text-dim); margin-bottom: 40px; }
  .cover .meta { font-size: 10px; color: var(--text-dim); margin-top: auto; }

  .vi-score-ring { width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: conic-gradient(var(--navy) 0deg, var(--navy) var(--score-deg, 270deg), var(--grey) var(--score-deg, 270deg)); }
  .vi-score-inner { width: 96px; height: 96px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; font-family:'Maven Pro',sans-serif; font-size: 28px; font-weight: 800; color: var(--navy); }

  @media print {
    @page { size: A4; margin: 16mm 14mm 18mm; }
    body { background: white; }
    .btn-pdf { display: none !important; }
    .container { padding: 0; max-width: 100%; }
    .section { box-shadow: none; border: 1px solid var(--border); }
  }
</style>
</head>
<body>
  <button class="btn-pdf" onclick="window.print()">📥 Salvar como PDF</button>
  <div class="container">
    <!-- 7 seções aqui -->
  </div>
</body>
</html>
```

---

## ✅ ENTREGUE

**APENAS** o HTML completo do artifact, começando com `<!doctype html>` e terminando com `</html>`. Nada antes, nada depois. Sem markdown fences ` ``` `. Sem comentários explicativos no chat.

O usuário vai clicar em "📥 Salvar como PDF" dentro do próprio artifact pra exportar.
